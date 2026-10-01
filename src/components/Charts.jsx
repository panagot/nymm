/**
 * Blueprint / drafting-board charts — ink on paper, not neon scope.
 */

function niceMax(raw) {
  const n = Math.max(200, raw || 0);
  const mag = 10 ** Math.floor(Math.log10(n));
  const norm = n / mag;
  const step = norm <= 1.5 ? 1.5 : norm <= 3 ? 3 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function areaPath(pts) {
  if (!pts.length) return "";
  const head = `M${pts[0].x} ${pts[0].y}`;
  const line = pts
    .slice(1)
    .map((p) => `L${p.x} ${p.y}`)
    .join(" ");
  return `${head} ${line}`;
}

function closedArea(pts, baselineY) {
  if (!pts.length) return "";
  return `${areaPath(pts)} L${pts[pts.length - 1].x} ${baselineY} L${pts[0].x} ${baselineY} Z`;
}

const GHOST = [
  { id: "g0", label: "GET", clearMs: 180, mixMs: 920 },
  { id: "g1", label: "Tip", clearMs: 240, mixMs: 1140 },
  { id: "g2", label: "RPC", clearMs: 210, mixMs: 1310 },
  { id: "g3", label: "GET", clearMs: 195, mixMs: 980 },
  { id: "g4", label: "Tip", clearMs: 265, mixMs: 1220 },
];

export function LatencyScope({ runs, height = 260, ghost = true }) {
  const width = 720;
  const pad = { t: 32, r: 20, b: 40, l: 52 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const live = runs.length > 0;
  const data = live ? runs : ghost ? GHOST : [];
  const maxMs = niceMax(Math.max(...data.flatMap((r) => [r.clearMs || 0, r.mixMs || 0]), 0));

  const toPts = (key) =>
    data.map((r, i) => {
      const x =
        data.length === 1
          ? pad.l + innerW / 2
          : pad.l + (i / (data.length - 1)) * innerW;
      const y = pad.t + innerH * (1 - (r[key] || 0) / maxMs);
      return { x, y, v: r[key] || 0, label: r.label };
    });

  const clearPts = toPts("clearMs");
  const mixPts = toPts("mixMs");
  const baseY = pad.t + innerH;

  return (
    <div className={`plate${live ? "" : " ghost"}`}>
      {!live ? <div className="plate-stamp">NO SAMPLES</div> : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart-svg"
        role="img"
        aria-label={
          live
            ? "Clearnet versus mixnet latency dual-trace"
            : "Awaiting paired samples — run probes to fill this plate"
        }
      >
        <defs>
          <pattern id="hatchMix" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="1" opacity="0.18" />
          </pattern>
          <pattern id="hatchClear" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--hazard)" strokeWidth="1" opacity="0.35" />
          </pattern>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + innerH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={pad.l}
                y1={y}
                x2={pad.l + innerW}
                y2={y}
                className="chart-grid"
                strokeDasharray={t === 0 || t === 1 ? undefined : "2 4"}
              />
              <text x={pad.l - 10} y={y + 3} className="chart-label" textAnchor="end">
                {Math.round(maxMs * t)}
              </text>
            </g>
          );
        })}

        {data.length > 0 ? (
          <>
            <path d={closedArea(mixPts, baseY)} fill="url(#hatchMix)" />
            <path d={closedArea(clearPts, baseY)} fill="url(#hatchClear)" />
            <path
              d={areaPath(mixPts)}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2.5"
              strokeLinejoin="miter"
            />
            <path
              d={areaPath(clearPts)}
              fill="none"
              stroke="var(--hazard)"
              strokeWidth="2.5"
              strokeLinejoin="miter"
              strokeDasharray="7 4"
            />
            {mixPts.map((p, i) => (
              <circle key={`m${i}`} cx={p.x} cy={p.y} r="3.5" className="dot-mix" />
            ))}
            {clearPts.map((p, i) => (
              <circle key={`c${i}`} cx={p.x} cy={p.y} r="3.5" className="dot-clear" />
            ))}
            {data.map((r, i) => {
              const x =
                data.length === 1
                  ? pad.l + innerW / 2
                  : pad.l + (i / (data.length - 1)) * innerW;
              return (
                <text
                  key={r.id}
                  x={x}
                  y={height - 12}
                  className="chart-label"
                  textAnchor="middle"
                >
                  {r.label.toUpperCase()}
                </text>
              );
            })}
          </>
        ) : null}
      </svg>
    </div>
  );
}

export function DeltaStrip({ runs }) {
  const width = 720;
  const height = 100;
  const pad = { t: 18, r: 14, b: 26, l: 52 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const data = runs.length ? runs : GHOST.slice(0, 4);
  const live = runs.length > 0;
  const deltas = data.map((r) => Math.max(0, (r.mixMs || 0) - (r.clearMs || 0)));
  const maxD = niceMax(Math.max(...deltas, 1));
  const barW = Math.min(36, (innerW / data.length) * 0.48);

  return (
    <div className={`plate slim${live ? "" : " ghost"}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart-svg"
        role="img"
        aria-label="Mixnet latency overhead versus clearnet"
      >
        <line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={pad.l + innerW}
          y2={pad.t + innerH}
          className="chart-axis"
        />
        <text x={pad.l - 10} y={pad.t + 6} className="chart-label" textAnchor="end">
          Δ MS
        </text>
        {data.map((r, i) => {
          const slot = innerW / data.length;
          const cx = pad.l + slot * i + slot / 2;
          const h = (deltas[i] / maxD) * innerH;
          return (
            <g key={r.id}>
              <rect
                x={cx - barW / 2}
                y={pad.t + innerH - h}
                width={barW}
                height={Math.max(3, h)}
                className="delta-bar"
              />
              <text
                x={cx}
                y={pad.t + innerH - h - 7}
                className="chart-label accent"
                textAnchor="middle"
              >
                +{Math.round(deltas[i])}
              </text>
              <text x={cx} y={height - 8} className="chart-label" textAnchor="middle">
                {r.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function HopMap({ active }) {
  const hops = [
    { id: "you", x: 56, y: 52, label: "01 Client", kind: "you" },
    { id: "g1", x: 168, y: 34, label: "02 Gate", kind: "hop" },
    { id: "m1", x: 290, y: 72, label: "03 Mix", kind: "hop" },
    { id: "m2", x: 412, y: 28, label: "04 Mix", kind: "hop" },
    { id: "ex", x: 534, y: 62, label: "05 Exit", kind: "exit" },
    { id: "dst", x: 656, y: 40, label: "06 Host", kind: "dst" },
  ];
  const path = hops.map((h, i) => `${i === 0 ? "M" : "L"}${h.x} ${h.y}`).join(" ");

  return (
    <svg className="hop-map" viewBox="0 0 720 110" aria-hidden>
      <path
        d={path}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.75"
        strokeDasharray="3 5"
      />
      {hops.map((h) => (
        <g key={h.id} transform={`translate(${h.x},${h.y})`}>
          <circle r={h.kind === "you" || h.kind === "dst" ? 7 : 5.5} className={`hop-node ${h.kind}`} />
          <text y="24" className="hop-caption" textAnchor="middle">
            {h.label}
          </text>
        </g>
      ))}
      {active ? (
        <circle r="4" className="hop-packet">
          <animateMotion dur="3.4s" repeatCount="indefinite" path={path} />
        </circle>
      ) : null}
    </svg>
  );
}

export function RatioDial({ clearMs, mixMs }) {
  const clear = clearMs || 0;
  const mix = mixMs || 0;
  const ratio = clear > 0 && mix > 0 ? mix / clear : 0;
  const display = ratio ? `${ratio.toFixed(1)}×` : "—";

  return (
    <div className="ratio-block">
      <output className="ratio-num">{display}</output>
      <span className="ratio-sub">mix / clear</span>
    </div>
  );
}

/** Horizontal paired bars per run — clear vs mix side-by-side. */
export function PairBars({ runs }) {
  const data = runs.length ? runs : GHOST;
  const live = runs.length > 0;
  const maxMs = niceMax(Math.max(...data.flatMap((r) => [r.clearMs || 0, r.mixMs || 0]), 0));

  return (
    <div className={`pair-bars${live ? "" : " ghost"}`}>
      {!live ? <div className="plate-stamp">NO SAMPLES</div> : null}
      <ul>
        {data.map((r) => (
          <li key={r.id}>
            <span className="pair-label">{r.label}</span>
            <div className="pair-tracks">
              <div className="pair-row">
                <span>CLR</span>
                <div className="pair-track">
                  <i
                    className="clear"
                    style={{ width: `${((r.clearMs || 0) / maxMs) * 100}%` }}
                  />
                </div>
                <em>{r.clearMs}ms</em>
              </div>
              <div className="pair-row">
                <span>MIX</span>
                <div className="pair-track">
                  <i
                    className="mix"
                    style={{ width: `${((r.mixMs || 0) / maxMs) * 100}%` }}
                  />
                </div>
                <em>{r.mixMs}ms</em>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Scatter-style plot: clear on X, mix on Y. */
export function ScatterPlot({ runs, height = 220 }) {
  const width = 420;
  const pad = { t: 20, r: 16, b: 36, l: 44 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const data = runs.length ? runs : GHOST;
  const live = runs.length > 0;
  const maxC = niceMax(Math.max(...data.map((r) => r.clearMs || 0), 1));
  const maxM = niceMax(Math.max(...data.map((r) => r.mixMs || 0), 1));

  return (
    <div className={`plate${live ? "" : " ghost"}`}>
      {!live ? <div className="plate-stamp">NO SAMPLES</div> : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart-svg"
        role="img"
        aria-label="Clearnet vs mixnet scatter"
      >
        <line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={pad.l + innerW}
          y2={pad.t + innerH}
          className="chart-axis"
        />
        <line
          x1={pad.l}
          y1={pad.t}
          x2={pad.l}
          y2={pad.t + innerH}
          className="chart-axis"
        />
        <text x={pad.l + innerW / 2} y={height - 8} className="chart-label" textAnchor="middle">
          CLEARNET MS →
        </text>
        <text
          x={12}
          y={pad.t + innerH / 2}
          className="chart-label"
          textAnchor="middle"
          transform={`rotate(-90 12 ${pad.t + innerH / 2})`}
        >
          MIXNET MS →
        </text>
        {/* equality line */}
        <line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={pad.l + innerW * Math.min(1, maxC / maxM)}
          y2={pad.t + innerH * (1 - Math.min(1, maxC / maxM))}
          className="chart-grid"
          strokeDasharray="3 3"
        />
        {data.map((r) => {
          const x = pad.l + ((r.clearMs || 0) / maxC) * innerW;
          const y = pad.t + innerH * (1 - (r.mixMs || 0) / maxM);
          return (
            <g key={r.id}>
              <circle cx={x} cy={y} r="4" className="dot-mix" />
              <text x={x + 8} y={y + 3} className="chart-label">
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Stacked cumulative latency by path. */
export function CumulativeStack({ runs }) {
  const data = runs.length ? runs : GHOST;
  const live = runs.length > 0;
  let cSum = 0;
  let mSum = 0;
  const series = data.map((r) => {
    cSum += r.clearMs || 0;
    mSum += r.mixMs || 0;
    return { id: r.id, label: r.label, clear: cSum, mix: mSum };
  });
  const max = niceMax(Math.max(cSum, mSum, 1));
  const width = 720;
  const height = 160;
  const pad = { t: 16, r: 14, b: 28, l: 48 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const pts = (key) =>
    series.map((r, i) => {
      const x =
        series.length === 1
          ? pad.l + innerW / 2
          : pad.l + (i / (series.length - 1)) * innerW;
      const y = pad.t + innerH * (1 - r[key] / max);
      return { x, y };
    });

  const clearPts = pts("clear");
  const mixPts = pts("mix");

  return (
    <div className={`plate${live ? "" : " ghost"}`}>
      {!live ? <div className="plate-stamp">NO SAMPLES</div> : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart-svg"
        role="img"
        aria-label="Cumulative latency by path"
      >
        {[0.5, 1].map((t) => {
          const y = pad.t + innerH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={pad.l}
                y1={y}
                x2={pad.l + innerW}
                y2={y}
                className="chart-grid"
                strokeDasharray="2 4"
              />
              <text x={pad.l - 8} y={y + 3} className="chart-label" textAnchor="end">
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}
        <path
          d={areaPath(mixPts)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2.25"
        />
        <path
          d={areaPath(clearPts)}
          fill="none"
          stroke="var(--hazard)"
          strokeWidth="2.25"
          strokeDasharray="6 4"
        />
        {series.map((r, i) => {
          const x =
            series.length === 1
              ? pad.l + innerW / 2
              : pad.l + (i / (series.length - 1)) * innerW;
          return (
            <text key={r.id} x={x} y={height - 8} className="chart-label" textAnchor="middle">
              {r.label.toUpperCase()}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function computeRunStats(runs) {
  const empty = {
    count: 0,
    avgClear: null,
    avgMix: null,
    minClear: null,
    maxClear: null,
    minMix: null,
    maxMix: null,
    avgDelta: null,
    minDelta: null,
    maxDelta: null,
    avgRatio: null,
    minRatio: null,
    maxRatio: null,
    p50Clear: null,
    p50Mix: null,
    p90Clear: null,
    p90Mix: null,
    p50Delta: null,
    p90Delta: null,
    sumClear: null,
    sumMix: null,
    sumDelta: null,
    byLabel: {},
    successPairs: 0,
    mixErrors: 0,
    clearErrors: 0,
  };

  if (!runs.length) return empty;

  const clears = runs
    .map((r) => r.clearMs)
    .filter((v) => typeof v === "number")
    .sort((a, b) => a - b);
  const mixes = runs
    .map((r) => r.mixMs)
    .filter((v) => typeof v === "number")
    .sort((a, b) => a - b);
  const deltas = runs
    .map((r) =>
      typeof r.clearMs === "number" && typeof r.mixMs === "number"
        ? Math.max(0, r.mixMs - r.clearMs)
        : null,
    )
    .filter((v) => typeof v === "number")
    .sort((a, b) => a - b);
  const ratios = runs
    .filter((r) => r.clearMs > 0 && typeof r.mixMs === "number")
    .map((r) => r.mixMs / r.clearMs)
    .sort((a, b) => a - b);

  const avg = (arr) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const sum = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0)) : null);
  const mid = (arr) => (arr.length ? arr[Math.floor(arr.length / 2)] : null);
  const pctl = (arr, p) => {
    if (!arr.length) return null;
    const i = Math.min(arr.length - 1, Math.ceil(p * arr.length) - 1);
    return arr[Math.max(0, i)];
  };
  const avgF = (arr, digits = 1) =>
    arr.length
      ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(digits)
      : null;

  const byLabel = {};
  for (const r of runs) {
    const key = r.label || "Other";
    if (!byLabel[key]) byLabel[key] = { count: 0, clear: [], mix: [], delta: [] };
    byLabel[key].count += 1;
    if (typeof r.clearMs === "number") byLabel[key].clear.push(r.clearMs);
    if (typeof r.mixMs === "number") byLabel[key].mix.push(r.mixMs);
    if (typeof r.clearMs === "number" && typeof r.mixMs === "number") {
      byLabel[key].delta.push(Math.max(0, r.mixMs - r.clearMs));
    }
  }
  for (const key of Object.keys(byLabel)) {
    const g = byLabel[key];
    byLabel[key] = {
      count: g.count,
      avgClear: avg(g.clear),
      avgMix: avg(g.mix),
      avgDelta: avg(g.delta),
      avgRatio:
        g.clear.length && g.mix.length
          ? (
              g.mix.reduce((a, b, i) => a + (g.clear[i] ? b / g.clear[i] : 0), 0) /
              Math.min(g.clear.length, g.mix.length)
            ).toFixed(1)
          : null,
    };
  }

  return {
    count: runs.length,
    avgClear: avg(clears),
    avgMix: avg(mixes),
    minClear: clears[0] ?? null,
    maxClear: clears.length ? clears[clears.length - 1] : null,
    minMix: mixes[0] ?? null,
    maxMix: mixes.length ? mixes[mixes.length - 1] : null,
    avgDelta: avg(deltas),
    minDelta: deltas[0] ?? null,
    maxDelta: deltas.length ? deltas[deltas.length - 1] : null,
    avgRatio: avgF(ratios),
    minRatio: ratios.length ? ratios[0].toFixed(1) : null,
    maxRatio: ratios.length ? ratios[ratios.length - 1].toFixed(1) : null,
    p50Clear: mid(clears),
    p50Mix: mid(mixes),
    p90Clear: pctl(clears, 0.9),
    p90Mix: pctl(mixes, 0.9),
    p50Delta: mid(deltas),
    p90Delta: pctl(deltas, 0.9),
    sumClear: sum(clears),
    sumMix: sum(mixes),
    sumDelta: sum(deltas),
    byLabel,
    successPairs: runs.filter((r) => r.clearOk && r.mixOk).length,
    mixErrors: runs.filter((r) => r.mixOk === false || r.mixError).length,
    clearErrors: runs.filter((r) => r.clearOk === false || r.clearError).length,
  };
}

/** Share-of-latency bars: clear vs overhead portion of mix time. */
export function CompositionBars({ runs }) {
  const data = runs.length ? runs : GHOST;
  const live = runs.length > 0;

  return (
    <div className={`pair-bars${live ? "" : " ghost"}`}>
      {!live ? <div className="plate-stamp">NO SAMPLES</div> : null}
      <ul>
        {data.map((r) => {
          const clear = r.clearMs || 0;
          const mix = r.mixMs || 0;
          const base = Math.max(mix, clear, 1);
          const clearPct = Math.min(100, (clear / base) * 100);
          const overheadPct = Math.min(100 - clearPct, Math.max(0, ((mix - clear) / base) * 100));
          return (
            <li key={r.id}>
              <span className="pair-label">{r.label}</span>
              <div className="pair-tracks">
                <div className="pair-row compose">
                  <span>MIX</span>
                  <div className="pair-track compose-track">
                    <i className="clear" style={{ width: `${clearPct}%` }} title="clear share" />
                    <i className="mix" style={{ width: `${overheadPct}%` }} title="overhead" />
                  </div>
                  <em>{mix}ms</em>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="compose-legend">
        <span className="clear">■ clear portion</span>
        <span>■ mix overhead</span>
      </p>
    </div>
  );
}

export function exportSessionJson(runs, meta = {}) {
  const payload = {
    tool: "NYMM",
    version: "0.4",
    exportedAt: new Date().toISOString(),
    meta,
    stats: computeRunStats(runs),
    runs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nymm-session-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}


