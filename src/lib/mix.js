/**
 * NYMM mixnet helpers — lazy-load @nymproject/mix-fetch so the page boots fast.
 * Tunnel is one-shot per page load (Nym mix-fetch v2).
 */

let mixFetchFn = null;
let tunnelState = "idle"; // idle | connecting | ready | error
let lastError = null;
let connectPromise = null;

const CONNECT_MS = 90_000;
const FETCH_MS = 60_000;

export function getTunnelState() {
  return { state: tunnelState, error: lastError, ready: Boolean(mixFetchFn) };
}

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

export async function connectMixnet(opts = {}) {
  if (mixFetchFn) return mixFetchFn;
  if (connectPromise) return connectPromise;

  tunnelState = "connecting";
  lastError = null;

  connectPromise = (async () => {
    try {
      const { createMixFetch } = await withTimeout(
        import("@nymproject/mix-fetch"),
        CONNECT_MS,
        "Loading mix-fetch WASM",
      );
      mixFetchFn = await withTimeout(
        createMixFetch({
          // Demo-friendly: lower latency for interactive lab. Production tips can re-enable cover.
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
      /* plain */
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

/** Tip API shaped probe payload — amount stays off any public feed. */
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
