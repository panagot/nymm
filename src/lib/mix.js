/**
 * NYMM mixnet helpers
 * --------------------
 * Thin wrapper around @nymproject/mix-fetch so the UI can:
 *   1) Lazy-load the ~5 MB WASM only when the user arms the tunnel
 *   2) Time the same HTTP request on clearnet vs mixnet
 *   3) Fail safely with timeouts (mixnet can hang on bad networks)
 *
 * Tunnel lifetime: one-shot per page load (mix-fetch v2 / smolmix).
 * Reload the page to re-arm after an error.
 */

/** Cached mixFetch function once createMixFetch() succeeds */
let mixFetchFn = null;

/** Module-level tunnel FSM: idle → connecting → ready | error */
let tunnelState = "idle";
let lastError = null;

/** Dedupes concurrent Arm clicks while WASM is still downloading */
let connectPromise = null;

/** First arm downloads a large chunk — allow up to 90s */
const CONNECT_MS = 90_000;

/** Single probe timeout (clearnet or mixnet) */
const FETCH_MS = 60_000;

/** Snapshot for React UI (navbar LIVE / ARMING / FAULT badges). */
export function getTunnelState() {
  return { state: tunnelState, error: lastError, ready: Boolean(mixFetchFn) };
}

/**
 * Race a promise against a wall-clock timeout so the lab never spins forever.
 * Used for WASM import, createMixFetch, and each HTTP sample.
 */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

/**
 * Arm the Nym mixnet tunnel.
 * - Dynamic import keeps initial page load light
 * - Cover + Poisson traffic OFF by default for snappy demos
 *   (re-enable for production-shaped latency experiments)
 */
export async function connectMixnet(opts = {}) {
  if (mixFetchFn) return mixFetchFn;
  if (connectPromise) return connectPromise;

  tunnelState = "connecting";
  lastError = null;

  connectPromise = (async () => {
    try {
      // Step A: download / instantiate the mix-fetch package + WASM worker
      const { createMixFetch } = await withTimeout(
        import("@nymproject/mix-fetch"),
        CONNECT_MS,
        "Loading mix-fetch WASM",
      );

      // Step B: open a Sphinx tunnel (client → gateway → mix → exit)
      mixFetchFn = await withTimeout(
        createMixFetch({
          disableCoverTraffic: opts.disableCoverTraffic ?? true,
          disablePoissonTraffic: opts.disablePoissonTraffic ?? true,
          ...opts,
        }),
        CONNECT_MS,
        "Arming mixnet tunnel",
      );
      tunnelState = "ready";
      return mixFetchFn;
    } catch (err) {
      tunnelState = "error";
      lastError = err?.message || String(err);
      mixFetchFn = null;
      throw err;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

/**
 * Clearnet baseline: plain browser fetch().
 * Clock = performance.now() from request start until the response body is fully read.
 * Same metric is used on the mixnet path so Δ is apples-to-apples.
 */
export async function clearnetFetch(url, init) {
  const started = performance.now();
  try {
    const res = await withTimeout(fetch(url, init), FETCH_MS, "Clearnet fetch");
    const ms = Math.round(performance.now() - started);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON echo bodies are fine — keep a text snippet */
    }
    return {
      path: "clearnet",
      ok: res.ok,
      status: res.status,
      ms,
      headers: Object.fromEntries(res.headers.entries()),
      body: json ?? text.slice(0, 2000),
    };
  } catch (err) {
    // Still return ms so Stats can show how long we waited before failure
    return {
      path: "clearnet",
      ok: false,
      status: null,
      ms: Math.round(performance.now() - started),
      error: err?.message || String(err),
      body: null,
    };
  }
}

/**
 * Mixnet sample: identical URL + init, routed through mixFetchFn.
 * Requires connectMixnet() first. Timing includes Sphinx hop overhead.
 */
export async function mixnetFetch(url, init) {
  if (!mixFetchFn) {
    throw new Error("Mixnet tunnel not connected — call connectMixnet() first");
  }
  const started = performance.now();
  try {
    const res = await withTimeout(mixFetchFn(url, init), FETCH_MS, "Mixnet fetch");
    const ms = Math.round(performance.now() - started);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* plain */
    }
    return {
      path: "mixnet",
      ok: res.ok,
      status: res.status,
      ms,
      headers: Object.fromEntries(res.headers.entries()),
      body: json ?? text.slice(0, 2000),
    };
  } catch (err) {
    return {
      path: "mixnet",
      ok: false,
      status: null,
      ms: Math.round(performance.now() - started),
      error: err?.message || String(err),
      body: null,
    };
  }
}

/**
 * Tip-bot shaped POST body (hold-to-claim style).
 * Amount is flagged hidden — we measure path metadata, not feed leakage of value.
 * Sent to httpbin echo in the demo; swap TIP_ENDPOINT for a real tip host later.
 */
export function buildTipProbePayload() {
  const tipId = `tip_${crypto.randomUUID().slice(0, 8)}`;
  return {
    type: "nymm_tip_probe",
    tipId,
    platform: "x",
    statusId: "demo_status_1849201",
    tipper: "@demo_tipper",
    recipient: "@creator_unlinked",
    amount: "0.00",
    amountHidden: true,
    path: "hold_claim",
    memo: "NYMM mixnet probe — amount never on feed",
    ts: new Date().toISOString(),
  };
}

/**
 * Wallet-RPC shaped JSON-RPC body (getbalance).
 * Models why spend-adjacent RPC should not leave the ISP in the clear.
 * Not a real node call — httpbin just echoes the JSON back.
 */
export function buildWalletRpcPayload() {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "getbalance",
    params: { account_index: 0 },
    _nymm: {
      note: "Demo wallet-RPC shaped body — not a real node call",
      reason: "Wallet RPC over clearnet leaks IP ↔ spend timing metadata",
    },
  };
}
