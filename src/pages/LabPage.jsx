import { useMemo } from "react";
import {
  DeltaStrip,
  HopMap,
  LatencyScope,
  RatioDial,
  computeRunStats,
} from "../components/Charts";

function Pane({ tone, title, data, pending }) {
  if (pending) {
    return (
      <div className={`pane ${tone} pending`}>
        <header>
          <h4>{title}</h4>
          <span className="tick">sampling</span>
        </header>
        <div className="pane-body">
          <p className="idle">path in transit</p>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className={`pane ${tone}`}>
        <header>
          <h4>{title}</h4>
          <span className="tick">null</span>
        </header>
        <div className="pane-body">
          <p className="idle">no sample logged</p>
        </div>
      </div>
    );
  }
  if (data.error) {
    return (
      <div className={`pane ${tone}`}>
        <header>
          <h4>{title}</h4>
          <span className="ms err">ERR</span>
        </header>
        <pre>{data.error}</pre>
      </div>
    );
  }
  return (
    <div className={`pane ${tone}`}>
      <header>
        <h4>{title}</h4>
        <span className="ms">
          {data.ms}
          <small>ms</small>
        </span>
      </header>
      <div className="pane-meta">
        <span>HTTP {data.status ?? "—"}</span>
        <span>{data.ok ? "ok" : "fail"}</span>
      </div>
      <pre>{JSON.stringify(data.body, null, 2)}</pre>
    </div>
  );
}

function msOf(data) {
  if (!data || data.error || typeof data.ms !== "number") return null;
  return data.ms;
}

export default function LabPage({
  tunnel,
  tunnelLabel,
  tunnelClass,
  busy,
  runs,
  avgClear,
  avgMix,
  last,
  tipClear,
  tipMix,
  walletClear,
  walletMix,
  armedAt,
  onConnect,
  runPing,
  runTip,
  runWallet,
  runBattery,
  onExport,
}) {
  const stats = useMemo(() => computeRunStats(runs), [runs]);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="fig">FIG. A · LAB</p>
          <h1>
            NYMM
            <span>Clearnet vs mixnet, timed.</span>
          </h1>
          <p className="lede">
            Prove tip and wallet HTTP leave a timing trail on clearnet, then measure the
            Sphinx-path cost with real mix-fetch. Same body. Two transports. One clock.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-fill"
              onClick={onConnect}
              disabled={busy === "connect" || tunnel.state === "ready"}
            >
              {tunnel.state === "ready"
                ? "Tunnel live"
                : busy === "connect"
                  ? "Arming…"
                  : "Arm mixnet"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={runBattery}
              disabled={Boolean(busy) || tunnel.state !== "ready"}
            >
              {busy ? "Running…" : "Run full battery"}
            </button>
            <a className="btn" href="#/stats">
              Stats
            </a>
            <a className="btn" href="#/method">
              Method
            </a>
          </div>
        </div>

        <aside className="hero-sheet">
          <div className="sheet-head">
            <span>[ PACKET ROUTE ]</span>
            <span className={`status ${tunnelClass}`}>{tunnelLabel}</span>
          </div>
          <HopMap active={tunnel.state === "ready" || Boolean(busy)} />
          <div className="sheet-foot">
            <span>CLIENT → GATE → MIX → EXIT → HOST</span>
            <span>@nymproject/mix-fetch</span>
          </div>
        </aside>
      </section>

      <section className="lab-spec" aria-label="Session spec">
        <div>
          <b>Echo</b>
          <span>httpbin.org</span>
        </div>
        <div>
          <b>Probes</b>
          <span>GET · Tip POST · Wallet RPC</span>
        </div>
        <div>
          <b>Clock</b>
          <span>performance.now → body</span>
        </div>
        <div>
          <b>Cover / Poisson</b>
          <span>Off (demo)</span>
        </div>
        <div>
          <b>Armed</b>
          <span>{armedAt ? new Date(armedAt).toLocaleTimeString() : "—"}</span>
        </div>
        <div>
          <b>Last</b>
          <span>
            {last ? `${last.label} · ${last.clearMs}/${last.mixMs} ms` : "—"}
          </span>
        </div>
      </section>

      <section className="quick-stats" aria-label="Live session stats">
        <div>
          <b>Runs</b>
          <strong>{String(stats.count).padStart(2, "0")}</strong>
        </div>
        <div>
          <b>Avg clear</b>
          <strong className="clear">{stats.avgClear != null ? `${stats.avgClear}` : "—"}</strong>
          <em>ms</em>
        </div>
        <div>
          <b>Avg mix</b>
          <strong>{stats.avgMix != null ? `${stats.avgMix}` : "—"}</strong>
          <em>ms</em>
        </div>
        <div>
          <b>Avg Δ</b>
          <strong className="clear">{stats.avgDelta != null ? `+${stats.avgDelta}` : "—"}</strong>
          <em>ms</em>
        </div>
        <div>
          <b>Avg ratio</b>
          <strong className="clear">{stats.avgRatio != null ? `${stats.avgRatio}×` : "—"}</strong>
        </div>
        <div>
          <b>P90 mix</b>
          <strong>{stats.p90Mix != null ? `${stats.p90Mix}` : "—"}</strong>
          <em>ms</em>
        </div>
        <div className="quick-actions">
          <button type="button" className="btn btn-sm" onClick={onExport} disabled={!runs.length}>
            Export JSON
          </button>
          <a className="btn btn-sm" href="#/stats">
            Full board
          </a>
        </div>
      </section>

      <section className="plate-desk" id="plate">
        <div className="rail">
          <div className="rail-head">
            <p className="fig">FIG. B</p>
            <h2>Signal plate</h2>
            <p>
              Dual-trace latency and mixnet overhead. Specimen ink clears after the first
              live run.
            </p>
          </div>

          <dl className="meters">
            <div>
              <dt>Tunnel</dt>
              <dd className={tunnelClass}>{tunnelLabel}</dd>
            </div>
            <div>
              <dt>Runs</dt>
              <dd>{String(runs.length).padStart(2, "0")}</dd>
            </div>
            <div>
              <dt>Avg clear</dt>
              <dd className="clear">{avgClear != null ? `${avgClear} ms` : "—"}</dd>
            </div>
            <div>
              <dt>Avg mix</dt>
              <dd className="mix">{avgMix != null ? `${avgMix} ms` : "—"}</dd>
            </div>
          </dl>

          <div className="ratio-row">
            <RatioDial clearMs={avgClear} mixMs={avgMix} />
            <p>
              {last
                ? `Last ${last.label}: ${last.clearMs} ms clear / ${last.mixMs} ms mix · Δ +${last.delta ?? Math.max(0, last.mixMs - last.clearMs)} ms`
                : "Ratio fills after the first paired sample."}
            </p>
          </div>

          {tunnel.error ? <p className="rail-err">{tunnel.error}</p> : null}

          <div className="rail-actions">
            <button
              type="button"
              className="btn btn-fill"
              onClick={onConnect}
              disabled={busy === "connect" || tunnel.state === "ready"}
            >
              {tunnel.state === "ready" ? "Tunnel armed" : "Arm mixnet tunnel"}
            </button>
            <button type="button" className="btn" onClick={runPing} disabled={Boolean(busy)}>
              {busy === "ping" ? "Pinging…" : "Latency sample"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={runBattery}
              disabled={Boolean(busy) || tunnel.state !== "ready"}
            >
              Full battery
            </button>
          </div>
        </div>

        <div className="charts">
          <div className="chart-block">
            <div className="chart-head">
              <h3>01 · Dual-trace (ms)</h3>
              <div className="legend">
                <span>
                  <i className="c" /> Clearnet
                </span>
                <span>
                  <i className="m" /> Mixnet
                </span>
              </div>
            </div>
            <LatencyScope runs={runs} height={268} />
          </div>
          <div className="chart-block">
            <div className="chart-head">
              <h3>02 · Overhead Δ (mix − clear)</h3>
            </div>
            <DeltaStrip runs={runs} />
          </div>
        </div>
      </section>

      <section className="deck" id="probes">
        <header className="deck-head">
          <p className="fig">FIG. C</p>
          <h2>Probe schedule</h2>
          <p>
            Identical JSON. Clearnet then mixnet. Echo is httpbin; point endpoints at a real
            tip host when integrating. Prefer <strong>Full battery</strong> for NSL demos.
          </p>
        </header>

        <div className="probes">
          <article className="probe">
            <div className="probe-intro">
              <span className="probe-tag">PROBE / 01</span>
              <h3>Tip API</h3>
              <p>
                Hold-to-claim body. Amount flagged hidden. Tests path metadata, not feed
                leakage of value.
              </p>
              <ul className="probe-facts">
                <li>POST · application/json</li>
                <li>Fields: tipId, platform, amountHidden</li>
                <li>Why: tip bots bind IP ↔ claim timing</li>
              </ul>
              <button
                type="button"
                className="btn btn-fill"
                onClick={runTip}
                disabled={Boolean(busy)}
              >
                {busy === "tip" ? "Probing…" : "Run tip probe"}
              </button>
              <div className="probe-kpis">
                <div className="kpi">
                  <b>Clearnet</b>
                  <span className="clear">
                    {msOf(tipClear) != null ? `${tipClear.ms} ms` : "—"}
                  </span>
                </div>
                <div className="kpi">
                  <b>Mixnet</b>
                  <span className="mix">
                    {msOf(tipMix) != null ? `${tipMix.ms} ms` : "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className="probe-panels">
              <Pane
                tone="clear"
                title="Clearnet"
                data={tipClear}
                pending={busy === "tip" && !tipClear}
              />
              <Pane
                tone="mix"
                title="Mixnet"
                data={tipMix}
                pending={busy === "tip" && tipClear && !tipMix}
              />
            </div>
          </article>

          <article className="probe">
            <div className="probe-intro">
              <span className="probe-tag">PROBE / 02</span>
              <h3>Wallet RPC</h3>
              <p>
                <code>getbalance</code>-shaped JSON-RPC. Models why spend-adjacent RPC should
                not leave the ISP in the clear.
              </p>
              <ul className="probe-facts">
                <li>POST · jsonrpc 2.0</li>
                <li>method: getbalance</li>
                <li>Why: RPC fingerprints spend intent</li>
              </ul>
              <button
                type="button"
                className="btn btn-fill"
                onClick={runWallet}
                disabled={Boolean(busy)}
              >
                {busy === "wallet" ? "Probing…" : "Run wallet probe"}
              </button>
              <div className="probe-kpis">
                <div className="kpi">
                  <b>Clearnet</b>
                  <span className="clear">
                    {msOf(walletClear) != null ? `${walletClear.ms} ms` : "—"}
                  </span>
                </div>
                <div className="kpi">
                  <b>Mixnet</b>
                  <span className="mix">
                    {msOf(walletMix) != null ? `${walletMix.ms} ms` : "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className="probe-panels">
              <Pane
                tone="clear"
                title="Clearnet"
                data={walletClear}
                pending={busy === "wallet" && !walletClear}
              />
              <Pane
                tone="mix"
                title="Mixnet"
                data={walletMix}
                pending={busy === "wallet" && walletClear && !walletMix}
              />
            </div>
          </article>
        </div>
      </section>

      <section className="lab-footnote">
        <p>
          Reviewer path: Arm → Full battery → <a href="#/stats">Stats</a> → screenshot /
          export JSON → cite <a href="#/method">Method</a> in the NSL thread.
        </p>
      </section>
    </>
  );
}
