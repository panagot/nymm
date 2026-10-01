/**
 * Stats observatory — session KPIs, charts, by-label table, run log, JSON export.
 */

import {
  CompositionBars,
  CumulativeStack,
  DeltaStrip,
  LatencyScope,
  PairBars,
  ScatterPlot,
  computeRunStats,
} from "../components/Charts";

function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`stat-card${tone ? ` ${tone}` : ""}`}>
      <b>{label}</b>
      <strong>{value ?? "—"}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

export default function StatsPage({ runs, onClear, onExport, tunnelLabel, armedAt }) {
  const s = computeRunStats(runs);
  const live = runs.length > 0;
  const labelRows = Object.entries(s.byLabel || {});

  return (
    <div className="page-stats">
      <header className="page-head">
        <p className="fig">FIG. S · OBSERVATORY</p>
        <div className="page-head-row">
          <div>
            <h1>Stats board</h1>
            <p>
              Session aggregates from this browser. Clear = browser fetch. Mix = mix-fetch.
              Export JSON anytime to keep the run log.
            </p>
          </div>
          <div className="page-head-actions">
            <a className="btn" href="#/lab">
              ← Lab
            </a>
            <button type="button" className="btn" onClick={onExport} disabled={!live}>
              Export JSON
            </button>
            <button type="button" className="btn" onClick={onClear} disabled={!live}>
              Clear runs
            </button>
          </div>
        </div>
      </header>

      <p className="stats-readout">
        {live
          ? `${s.count} runs · tunnel ${tunnelLabel}${armedAt ? ` · armed ${new Date(armedAt).toLocaleTimeString()}` : ""} · avg Δ ${
              s.avgDelta != null ? `+${s.avgDelta} ms` : "—"
            } · avg ratio ${s.avgRatio != null ? `${s.avgRatio}×` : "—"} · success pairs ${s.successPairs}`
          : "No runs yet. Arm mixnet on Lab, run Full battery, then return here."}
      </p>

      <div className="stat-grid dense">
        <StatCard label="Runs" value={String(s.count).padStart(2, "0")} />
        <StatCard label="Success pairs" value={String(s.successPairs).padStart(2, "0")} />
        <StatCard
          label="Mix errors"
          value={String(s.mixErrors).padStart(2, "0")}
          tone={s.mixErrors ? "clear" : undefined}
        />
        <StatCard
          label="Avg clearnet"
          value={s.avgClear != null ? `${s.avgClear} ms` : null}
          hint="mean"
          tone="clear"
        />
        <StatCard label="Avg mixnet" value={s.avgMix != null ? `${s.avgMix} ms` : null} hint="mean" />
        <StatCard
          label="Avg overhead Δ"
          value={s.avgDelta != null ? `+${s.avgDelta} ms` : null}
          hint="mix − clear"
          tone="clear"
        />
        <StatCard
          label="Avg ratio"
          value={s.avgRatio != null ? `${s.avgRatio}×` : null}
          hint="mix / clear"
          tone="clear"
        />
        <StatCard
          label="Ratio range"
          value={
            s.minRatio != null ? `${s.minRatio}–${s.maxRatio}×` : null
          }
        />
        <StatCard label="P50 clear" value={s.p50Clear != null ? `${s.p50Clear} ms` : null} />
        <StatCard label="P50 mix" value={s.p50Mix != null ? `${s.p50Mix} ms` : null} />
        <StatCard label="P90 clear" value={s.p90Clear != null ? `${s.p90Clear} ms` : null} />
        <StatCard label="P90 mix" value={s.p90Mix != null ? `${s.p90Mix} ms` : null} />
        <StatCard
          label="P50 Δ"
          value={s.p50Delta != null ? `+${s.p50Delta} ms` : null}
          tone="clear"
        />
        <StatCard
          label="P90 Δ"
          value={s.p90Delta != null ? `+${s.p90Delta} ms` : null}
          tone="clear"
        />
        <StatCard
          label="Σ clear"
          value={s.sumClear != null ? `${s.sumClear} ms` : null}
        />
        <StatCard label="Σ mix" value={s.sumMix != null ? `${s.sumMix} ms` : null} />
      </div>

      {labelRows.length ? (
        <section className="by-label">
          <header className="section-label">
            <h2>By probe label</h2>
            <p>Per-type averages in this session</p>
          </header>
          <div className="table-wrap">
            <table className="spec-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>n</th>
                  <th>Avg clear</th>
                  <th>Avg mix</th>
                  <th>Avg Δ</th>
                  <th>Avg ratio</th>
                </tr>
              </thead>
              <tbody>
                {labelRows.map(([label, g]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{g.count}</td>
                    <td className="clear">{g.avgClear} ms</td>
                    <td>{g.avgMix} ms</td>
                    <td className="clear">+{g.avgDelta}</td>
                    <td>{g.avgRatio != null ? `${g.avgRatio}×` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="stats-charts">
        <div className="chart-block wide">
          <div className="chart-head">
            <h3>01 · Dual-trace session</h3>
            <div className="legend">
              <span>
                <i className="c" /> Clearnet
              </span>
              <span>
                <i className="m" /> Mixnet
              </span>
            </div>
          </div>
          <LatencyScope runs={runs} height={260} />
        </div>

        <div className="chart-block">
          <div className="chart-head">
            <h3>02 · Overhead Δ</h3>
          </div>
          <DeltaStrip runs={runs} />
        </div>

        <div className="chart-block">
          <div className="chart-head">
            <h3>03 · Cumulative cost</h3>
          </div>
          <CumulativeStack runs={runs} />
        </div>

        <div className="chart-block">
          <div className="chart-head">
            <h3>04 · Paired bars</h3>
          </div>
          <PairBars runs={runs} />
        </div>

        <div className="chart-block">
          <div className="chart-head">
            <h3>05 · Composition (clear vs overhead)</h3>
          </div>
          <CompositionBars runs={runs} />
        </div>

        <div className="chart-block">
          <div className="chart-head">
            <h3>06 · Scatter · clear × mix</h3>
          </div>
          <ScatterPlot runs={runs} height={240} />
        </div>
      </div>

      <section className="interp-grid">
        <article>
          <h3>How to read</h3>
          <p>
            Clearnet ≈ baseline RTT. Mixnet = baseline + Sphinx hops. Ratio and Δ are the
            privacy-path cost for this session, not a network SLA.
          </p>
        </article>
        <article>
          <h3>Demo defaults</h3>
          <p>
            Cover traffic and Poisson delay are off so the lab stays interactive. Re-enable
            them in mix-fetch for production-shaped latency.
          </p>
        </article>
        <article>
          <h3>Variance</h3>
          <p>
            Mix paths vary with gateway load. Prefer P50/P90 over a single sample when comparing
            clearnet and mixnet cost.
          </p>
        </article>
      </section>

      <section className="run-log">
        <header className="chart-head">
          <h3>07 · Run log</h3>
        </header>
        {live ? (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Label</th>
                <th>Clear</th>
                <th>Mix</th>
                <th>Δ</th>
                <th>Ratio</th>
                <th>OK</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r, i) => {
                const delta = r.delta ?? Math.max(0, (r.mixMs || 0) - (r.clearMs || 0));
                const ratio =
                  r.ratio != null
                    ? r.ratio
                    : r.clearMs
                      ? ((r.mixMs || 0) / r.clearMs).toFixed(1)
                      : "—";
                const ok =
                  r.clearOk !== false && r.mixOk !== false
                    ? "yes"
                    : r.mixOk === false
                      ? "mix err"
                      : "clear err";
                return (
                  <tr key={r.id}>
                    <td>{String(i + 1).padStart(2, "0")}</td>
                    <td>{r.at ? new Date(r.at).toLocaleTimeString() : "—"}</td>
                    <td>{r.label}</td>
                    <td className="clear">{r.clearMs} ms</td>
                    <td>{r.mixMs} ms</td>
                    <td className="clear">+{delta}</td>
                    <td>{ratio === "—" ? "—" : `${ratio}×`}</td>
                    <td>{ok}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="empty-note">
            No live runs. <a href="#/lab">Open Lab</a> and run Full battery.
          </p>
        )}
      </section>
    </div>
  );
}
