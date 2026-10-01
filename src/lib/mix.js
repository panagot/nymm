/**
 * NYMM mixnet helpers — lazy-load @nymproject/mix-fetch so the page boots fast.
 * Tunnel is one-shot per page load (Nym mix-fetch v2).
 */

let mixFetchFn = null;
let tunnelState = "idle"; // idle | connecting | ready | error
let lastError = null;

export function getTunnelState() {
  return { state: tunnelState, error: lastError, ready: Boolean(mixFetchFn) };
}

export async function connectMixnet(opts = {}) {
  if (mixFetchFn) return mixFetchFn;
  if (tunnelState === "connecting") {
    throw new Error("Mixnet tunnel is already connecting");
  }

  tunnelState = "connecting";
  lastError = null;

  try {
    const { createMixFetch } = await import("@nymproject/mix-fetch");
    mixFetchFn = await createMixFetch({
      // Demo-friendly: lower latency for interactive lab. Production tips can re-enable cover.
      disableCoverTraffic: opts.disableCoverTraffic ?? true,
      disablePoissonTraffic: opts.disablePoissonTraffic ?? true,
      ...opts,
    });
    tunnelState = "ready";
    return mixFetchFn;
  } catch (err) {
    tunnelState = "error";
    lastError = err?.message || String(err);
    mixFetchFn = null;
    throw err;
  }
}

export async function clearnetFetch(url, init) {
  const started = performance.now();
  const res = await fetch(url, init);
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
}

export async function mixnetFetch(url, init) {
  if (!mixFetchFn) {
    throw new Error("Mixnet tunnel not connected — call connectMixnet() first");
  }
  const started = performance.now();
  const res = await mixFetchFn(url, init);
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
}

/** Simulated tip API payload — mirrors Kindling/BeldexTip style metadata. */
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
