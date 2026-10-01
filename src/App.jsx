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

const TIP_ENDPOINT = "https://httpbin.org/post";
const WALLET_ENDPOINT = "https://httpbin.org/post";
const PING_ENDPOINT = "https://httpbin.org/get";

function msOf(data) {
  if (!data || data.error || typeof data.ms !== "number") return null;
  return data.ms;
}

function okOf(data) {
  if (!data) return false;
  if (data.error) return false;
  return data.ok !== false;
}

export default function App() {
  const [route] = useHashRoute();
  const [tunnel, setTunnel] = useState(getTunnelState());
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState("");
  const [runs, setRuns] = useState([]);
  const [tipClear, setTipClear] = useState(null);
  const [tipMix, setTipMix] = useState(null);
  const [walletClear, setWalletClear] = useState(null);
  const [walletMix, setWalletMix] = useState(null);
  const [armedAt, setArmedAt] = useState(null);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const pushRun = useCallback((label, clearData, mixData) => {
    const clearMs = msOf(clearData);
    const mixMs = msOf(mixData);
    if (clearMs == null && mixMs == null) return;
    setRuns((prev) =>
      [
        ...prev,
        {
          id: `${Date.now()}_${label}`,
          label,
          clearMs: clearMs ?? 0,
          mixMs: mixMs ?? 0,
          delta: Math.max(0, (mixMs ?? 0) - (clearMs ?? 0)),
          ratio: clearMs ? Number(((mixMs ?? 0) / clearMs).toFixed(2)) : null,
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

  const onConnect = async () => {
    setBusy("connect");
    try {
      await connectMixnet();
      setTunnel(getTunnelState());
      setArmedAt(new Date().toISOString());
      showToast("Tunnel armed");
    } catch (err) {
      setTunnel(getTunnelState());
      showToast(err?.message || String(err), true);
    } finally {
      setBusy("");
    }
  };

  const runPair = async ({ label, chartLabel, clearSetter, mixSetter, url, init }) => {
    setBusy(label);
    clearSetter(null);
    mixSetter(null);
    let clearData = null;
    let mixData = null;

    try {
      clearData = await clearnetFetch(url, init);
      clearSetter(clearData);
    } catch (err) {
      clearData = { error: err?.message || String(err) };
      clearSetter(clearData);
    }

    try {
      if (!getTunnelState().ready) {
        throw new Error("Arm the mixnet tunnel first");
      }
      mixData = await mixnetFetch(url, init);
      mixSetter(mixData);
    } catch (err) {
      mixData = { error: err?.message || String(err) };
      mixSetter(mixData);
    } finally {
      pushRun(chartLabel, clearData, mixData);
      setBusy("");
    }
  };

  const runTip = () =>
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
    });

  const runWallet = () =>
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
    });

  const runPing = async () => {
    setBusy("ping");
    let clearData = null;
    let mixData = null;
    try {
      clearData = await clearnetFetch(PING_ENDPOINT, { method: "GET" });
    } catch (err) {
      clearData = { error: err?.message || String(err) };
    }
    try {
      if (!getTunnelState().ready) throw new Error("Arm the mixnet tunnel first");
      mixData = await mixnetFetch(PING_ENDPOINT, { method: "GET" });
    } catch (err) {
      mixData = { error: err?.message || String(err) };
    }
    pushRun("GET", clearData, mixData);
    setBusy("");
    if (mixData?.error) showToast(mixData.error, true);
  };

  const runBattery = async () => {
    if (busy) return;
    if (!getTunnelState().ready) {
      showToast("Arm the mixnet tunnel first", true);
      return;
    }
    await runPing();
    await runTip();
    await runWallet();
    showToast("Battery complete · GET + Tip + RPC");
  };

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
    if (!runs.length) return null;
    const vals = runs.map((r) => r.clearMs).filter(Boolean);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [runs]);

  const avgMix = useMemo(() => {
    if (!runs.length) return null;
    const vals = runs.map((r) => r.mixMs).filter(Boolean);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [runs]);

  const last = runs[runs.length - 1];

  const tunnelLabel =
    tunnel.state === "ready"
      ? "LIVE"
      : tunnel.state === "connecting"
        ? "ARMING"
        : tunnel.state === "error"
          ? "FAULT"
          : "IDLE";

  const tunnelClass =
    tunnel.state === "ready" ? "ok" : tunnel.state === "error" ? "bad" : "warn";

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
        {route === "lab" ? (
          <LabPage
            tunnel={tunnel}
            tunnelLabel={tunnelLabel}
            tunnelClass={tunnelClass}
            busy={busy}
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
