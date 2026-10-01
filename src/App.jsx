/**
 * NYMM root application
 * ---------------------
 * Owns session state shared across Lab / Stats / Method / About:
 *   - mixnet tunnel status
 *   - paired run log (clearnet ms vs mixnet ms)
 *   - tip / wallet probe panes
 *   - busy / phase banners for long WASM + Sphinx operations
 *
 * Probe design: same URL + body on both transports, then push one run row.
 */

import { useCallback, useMemo, useState } from "react";
import { exportSessionJson } from "./components/Charts";
import { Footer, Navbar } from "./components/Layout";
import { useHashRoute } from "./hooks/useHashRoute";
import {
  buildTipProbePayload,
  buildWalletRpcPayload,
  clearnetFetch,
  connectMixnet,
  getTunnelState,
  mixnetFetch,
} from "./lib/mix";
import AboutPage from "./pages/AboutPage";
import LabPage from "./pages/LabPage";
import MethodPage from "./pages/MethodPage";
import StatsPage from "./pages/StatsPage";

// Neutral echo host so the lab is self-contained (no real tip/RPC backend required)
const TIP_ENDPOINT = "https://httpbin.org/post";
const WALLET_ENDPOINT = "https://httpbin.org/post";
const PING_ENDPOINT = "https://httpbin.org/get";

/** Prefer timed successes; ignore zero-ms error placeholders for averages. */
function msOf(data) {
  if (!data || typeof data.ms !== "number") return null;
  if (data.error && data.ms === 0) return null;
  return data.ms;
}

function okOf(data) {
  if (!data) return false;
  if (data.error) return false;
  return data.ok !== false;
}

export default function App() {
  const [route] = useHashRoute();

  // Tunnel badge + armed timestamp (module state lives in lib/mix.js)
  const [tunnel, setTunnel] = useState(getTunnelState());
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(""); // "" | connect | ping | tip | wallet | battery
  const [phase, setPhase] = useState(""); // human-readable progress line
  const [runs, setRuns] = useState([]); // session log (max 24)
  const [tipClear, setTipClear] = useState(null);
  const [tipMix, setTipMix] = useState(null);
  const [walletClear, setWalletClear] = useState(null);
  const [walletMix, setWalletMix] = useState(null);
  const [armedAt, setArmedAt] = useState(null);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  /**
   * Append one paired sample to the session.
   * Δ = mix − clear, ratio = mix / clear (when both timings exist).
   */
  const pushRun = useCallback((label, clearData, mixData) => {
    const clearMs = msOf(clearData);
    const mixMs = msOf(mixData);
    setRuns((prev) =>
      [
        ...prev,
        {
          id: `${Date.now()}_${label}`,
          label,
          clearMs,
          mixMs,
          delta:
            clearMs != null && mixMs != null ? Math.max(0, mixMs - clearMs) : null,
          ratio:
            clearMs && mixMs != null
              ? Number((mixMs / clearMs).toFixed(2))
              : null,
          clearOk: okOf(clearData),
          mixOk: okOf(mixData),
          clearStatus: clearData?.status ?? null,
          mixStatus: mixData?.status ?? null,
          clearError: clearData?.error || null,
          mixError: mixData?.error || null,
          at: new Date().toISOString(),
        },
      ].slice(-24),
    );
  }, []);

  const syncTunnel = useCallback(() => {
    setTunnel(getTunnelState());
  }, []);

  /**
   * Ensure the mixnet tunnel is ready before mix samples.
   * preserveBusy: when true, parent (battery) keeps owning the busy flag.
   */
  const ensureTunnel = async ({ preserveBusy = false } = {}) => {
    if (getTunnelState().ready) return;
    if (!preserveBusy) setBusy("connect");
    setTunnel({ state: "connecting", error: null, ready: false });
    setPhase("Loading mix-fetch WASM (~5 MB), then arming the Sphinx tunnel…");
    showToast("Arming mixnet — first load can take ~10–30s");
    try {
      await connectMixnet();
      setArmedAt(new Date().toISOString());
      syncTunnel();
      showToast("Tunnel armed");
    } catch (err) {
      syncTunnel();
      showToast(err?.message || String(err), true);
      throw err;
    } finally {
      if (!preserveBusy) {
        setBusy("");
        setPhase("");
      }
    }
  };

  const onConnect = async () => {
    if (busy) return;
    try {
      await ensureTunnel();
    } catch {
      /* toast already shown */
    }
  };

  /**
   * Core paired probe: clearnet first, then mixnet, then log one run.
   * Used by Tip and Wallet buttons (and by Full battery via preserveBusy).
   */
  const runPair = async ({
    label,
    chartLabel,
    clearSetter,
    mixSetter,
    url,
    init,
    preserveBusy = false,
  }) => {
    if (!preserveBusy) setBusy(label);
    setPhase(`Sampling ${chartLabel}: clearnet…`);
    clearSetter(null);
    mixSetter(null);
    let clearData = null;
    let mixData = null;

    try {
      clearData = await clearnetFetch(url, init);
      clearSetter(clearData);
      if (clearData.error) showToast(`Clearnet: ${clearData.error}`, true);
    } catch (err) {
      clearData = { error: err?.message || String(err), ms: null, ok: false };
      clearSetter(clearData);
      showToast(clearData.error, true);
    }

    try {
      if (!getTunnelState().ready) {
        mixData = {
          error: "Arm the mixnet tunnel first",
          ms: null,
          ok: false,
        };
        mixSetter(mixData);
        showToast(mixData.error, true);
      } else {
        setPhase(`Sampling ${chartLabel}: mixnet…`);
        mixData = await mixnetFetch(url, init);
        mixSetter(mixData);
        if (mixData.error) showToast(`Mixnet: ${mixData.error}`, true);
      }
    } catch (err) {
      mixData = { error: err?.message || String(err), ms: null, ok: false };
      mixSetter(mixData);
      showToast(mixData.error, true);
    } finally {
      pushRun(chartLabel, clearData, mixData);
      if (!preserveBusy) {
        setBusy("");
        setPhase("");
      }
    }
  };

  // Tip probe — hold-to-claim shaped JSON POST
  const runTip = (opts) =>
    runPair({
      label: "tip",
      chartLabel: "Tip",
      clearSetter: setTipClear,
      mixSetter: setTipMix,
      url: TIP_ENDPOINT,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTipProbePayload()),
      },
      ...opts,
    });

  // Wallet probe — getbalance-shaped JSON-RPC POST
  const runWallet = (opts) =>
    runPair({
      label: "wallet",
      chartLabel: "RPC",
      clearSetter: setWalletClear,
      mixSetter: setWalletMix,
      url: WALLET_ENDPOINT,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildWalletRpcPayload()),
      },
      ...opts,
    });

  // Lightweight GET latency sample (no tip/wallet body)
  const runPing = async ({ preserveBusy = false } = {}) => {
    if (!preserveBusy) setBusy("ping");
    setPhase("Sampling GET: clearnet…");
    let clearData = null;
    let mixData = null;
    try {
      clearData = await clearnetFetch(PING_ENDPOINT, { method: "GET" });
      if (clearData.error) showToast(`Clearnet: ${clearData.error}`, true);
    } catch (err) {
      clearData = { error: err?.message || String(err), ms: null, ok: false };
      showToast(clearData.error, true);
    }
    try {
      if (!getTunnelState().ready) {
        mixData = { error: "Arm the mixnet tunnel first", ms: null, ok: false };
        showToast(mixData.error, true);
      } else {
        setPhase("Sampling GET: mixnet…");
        mixData = await mixnetFetch(PING_ENDPOINT, { method: "GET" });
        if (mixData.error) showToast(`Mixnet: ${mixData.error}`, true);
      }
    } catch (err) {
      mixData = { error: err?.message || String(err), ms: null, ok: false };
      showToast(mixData.error, true);
    }
    pushRun("GET", clearData, mixData);
    if (!preserveBusy) {
      setBusy("");
      setPhase("");
    }
  };

  /**
   * One-click demo path for reviewers:
   * arm tunnel if needed → GET → Tip → Wallet RPC.
   */
  const runBattery = async () => {
    if (busy) return;
    setBusy("battery");
    setPhase("Full battery — arming if needed, then GET → Tip → RPC");
    try {
      await ensureTunnel({ preserveBusy: true });
      setBusy("battery");
      setPhase("Full battery: GET sample…");
      await runPing({ preserveBusy: true });
      setBusy("battery");
      setPhase("Full battery: Tip probe…");
      await runTip({ preserveBusy: true });
      setBusy("battery");
      setPhase("Full battery: Wallet RPC…");
      await runWallet({ preserveBusy: true });
      showToast("Battery complete · GET + Tip + RPC");
    } catch {
      /* ensureTunnel toast already shown */
    } finally {
      setBusy("");
      setPhase("");
    }
  };

  /** Download session JSON for writeups / offline review. */
  const onExport = () => {
    if (!runs.length) {
      showToast("No runs to export", true);
      return;
    }
    exportSessionJson(runs, {
      tunnel: tunnel.state,
      armedAt,
      endpoints: { tip: TIP_ENDPOINT, wallet: WALLET_ENDPOINT, ping: PING_ENDPOINT },
      coverTraffic: false,
      poissonTraffic: false,
    });
    showToast("Session JSON downloaded");
  };

  const avgClear = useMemo(() => {
    const vals = runs.map((r) => r.clearMs).filter((v) => typeof v === "number");
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [runs]);

  const avgMix = useMemo(() => {
    const vals = runs.map((r) => r.mixMs).filter((v) => typeof v === "number");
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [runs]);

  const last = runs[runs.length - 1];

  const tunnelLabel =
    tunnel.state === "ready"
      ? "LIVE"
      : tunnel.state === "connecting" || busy === "connect"
        ? "ARMING"
        : tunnel.state === "error"
          ? "FAULT"
          : "IDLE";

  const tunnelClass =
    tunnel.state === "ready"
      ? "ok"
      : tunnel.state === "error"
        ? "bad"
        : busy === "connect" || tunnel.state === "connecting"
          ? "warn"
          : "warn";

  return (
    <>
      <div className="paper-noise" aria-hidden />
      <Navbar
        route={route}
        tunnelLabel={tunnelLabel}
        tunnelClass={tunnelClass}
        onArm={onConnect}
        busy={busy}
      />
      <main className="wrap main">
        {/* Progress strip while WASM loads or probes are in flight */}
        {phase ? (
          <div className="phase-banner" role="status">
            <span className="phase-pulse" aria-hidden />
            {phase}
          </div>
        ) : null}

        {/* Hash-routed pages share the same session state above */}
        {route === "lab" ? (
          <LabPage
            tunnel={tunnel}
            tunnelLabel={tunnelLabel}
            tunnelClass={tunnelClass}
            busy={busy}
            phase={phase}
            runs={runs}
            avgClear={avgClear}
            avgMix={avgMix}
            last={last}
            tipClear={tipClear}
            tipMix={tipMix}
            walletClear={walletClear}
            walletMix={walletMix}
            armedAt={armedAt}
            onConnect={onConnect}
            runPing={runPing}
            runTip={runTip}
            runWallet={runWallet}
            runBattery={runBattery}
            onExport={onExport}
          />
        ) : null}
        {route === "stats" ? (
          <StatsPage
            runs={runs}
            onClear={() => setRuns([])}
            onExport={onExport}
            tunnelLabel={tunnelLabel}
            armedAt={armedAt}
          />
        ) : null}
        {route === "method" ? (
          <MethodPage
            tunnelLabel={tunnelLabel}
            tunnelClass={tunnelClass}
            busy={busy}
            tunnelReady={tunnel.state === "ready"}
            runCount={runs.length}
          />
        ) : null}
        {route === "about" ? <AboutPage runCount={runs.length} tunnelLabel={tunnelLabel} /> : null}
      </main>
      <div className="wrap">
        <Footer />
      </div>
      {toast ? (
        <div className={`toast${toast.isError ? " err" : ""}`} role="status">
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
