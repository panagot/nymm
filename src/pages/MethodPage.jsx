/**
 * Method page — threat model, transport matrix, metrics glossary, build limits.
 * Documents how timings are produced so reviewers can trust the numbers.
 */

import { HopMap } from "../components/Charts";

const THREAT = [
  {
    id: "01",
    title: "IP ↔ request adjacency",
    body: "Clearnet tip or wallet calls bind the client IP to the request timestamp and destination host.",
  },
  {
    id: "02",
    title: "Timing side channel",
    body: "Repeated spends or tip claims form a pattern an ISP or host can correlate with on-chain or feed events.",
  },
  {
    id: "03",
    title: "Endpoint fingerprint",
    body: "JSON-RPC method names and tip-shaped routes reveal intent even when amounts are hidden from the public feed.",
  },
];

const STEPS = [
  { n: "01", title: "Arm tunnel", detail: "createMixFetch loads WASM once per page. Tunnel is one-shot until reload." },
  { n: "02", title: "Clearnet sample", detail: "Browser fetch to the echo host. Clock starts at call, stops when body is read." },
  { n: "03", title: "Mixnet sample", detail: "Same URL and body via mix-fetch. Sphinx path: client → gateway → mix → exit → host." },
  { n: "04", title: "Plot Δ", detail: "Lab + Stats log clear ms, mix ms, overhead, ratio, P50/P90, and exportable JSON." },
];

const LIMITS = [
  ["Echo target", "httpbin.org — neutral mirror, not a production tip host"],
  ["Cover traffic", "Disabled in this build for interactive demos"],
  ["Poisson traffic", "Disabled — re-enable for production-shaped latency"],
  ["Tunnel lifetime", "One arm per page load (mix-fetch v2)"],
  ["What NYMM does not do", "No custody, no real spends, no network consensus claims"],
];

const METRICS = [
  ["clearMs", "Full-body browser fetch latency"],
  ["mixMs", "Full-body mix-fetch latency"],
  ["Δ", "mixMs − clearMs (overhead)"],
  ["ratio", "mixMs / clearMs"],
  ["P50 / P90", "Session percentiles on Stats"],
  ["byLabel", "Averages split by GET / Tip / RPC"],
];

export default function MethodPage({
  tunnelLabel,
  tunnelClass,
  busy,
  tunnelReady,
  runCount = 0,
}) {
  return (
    <div className="page-method">
      <header className="page-head">
        <p className="fig">FIG. M · METHOD</p>
        <h1>Method & threat model</h1>
        <p>
          What is measured, why it matters for tip and wallet HTTP, and how the numbers are
          produced. Session runs logged:{" "}
          <strong>{String(runCount).padStart(2, "0")}</strong>.
        </p>
      </header>

      <section className="method-lead">
        <div>
          <h2>Claim under test</h2>
          <p>
            If a tip API or wallet RPC leaves the ISP in the clear, the observer sees who
            talked to which host at which time. Routing the same bytes through the Nym mixnet
            breaks that adjacency. NYMM times both paths so the overhead is visible, not
            theoretical.
          </p>
        </div>
        <aside className="method-status">
          <div className="sheet-head">
            <span>[ LIVE PATH ]</span>
            <span className={`status ${tunnelClass}`}>{tunnelLabel}</span>
          </div>
          <HopMap active={tunnelReady || Boolean(busy)} />
          <div className="sheet-foot">
            <span>Sphinx hops · mix-fetch v2</span>
            <span>{tunnelReady ? "Tunnel armed" : "Arm from navbar"}</span>
          </div>
        </aside>
      </section>

      <section className="spec-block">
        <header className="section-label">
          <h2>Threat surface</h2>
          <p>Metadata exposed on clearnet tip / wallet traffic</p>
        </header>
        <div className="threat-grid">
          {THREAT.map((t) => (
            <article key={t.id}>
              <span className="probe-tag">{t.id}</span>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="spec-block">
        <header className="section-label">
          <h2>Transport matrix</h2>
          <p>Identical body. Different path. One clock.</p>
        </header>
        <div className="table-wrap">
          <table className="spec-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Clearnet</th>
                <th>Mixnet</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Client API</td>
                <td>
                  <code>fetch()</code>
                </td>
                <td>
                  <code>mixFetch()</code>
                </td>
              </tr>
              <tr>
                <td>IP at destination</td>
                <td>Client IP</td>
                <td>Exit gateway IP</td>
              </tr>
              <tr>
                <td>Packet shape</td>
                <td>Plain TLS to host</td>
                <td>Sphinx mix packets</td>
              </tr>
              <tr>
                <td>Typical cost</td>
                <td>Baseline RTT</td>
                <td>Baseline + hop delay</td>
              </tr>
              <tr>
                <td>What NYMM records</td>
                <td>ms to full body</td>
                <td>ms to full body</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="spec-block">
        <header className="section-label">
          <h2>Metrics glossary</h2>
          <p>Fields in Stats and exported JSON</p>
        </header>
        <div className="table-wrap">
          <table className="spec-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map(([k, v]) => (
                <tr key={k}>
                  <td>
                    <code>{k}</code>
                  </td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="spec-block">
        <header className="section-label">
          <h2>Measurement pipeline</h2>
          <p>Four steps per paired run</p>
        </header>
        <ol className="pipeline">
          {STEPS.map((s) => (
            <li key={s.n}>
              <strong>{s.n}</strong>
              <div>
                <b>{s.title}</b>
                <span>{s.detail}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="spec-block dual">
        <div>
          <header className="section-label">
            <h2>Probe bodies</h2>
            <p>Shapes only — amounts stay off the public feed</p>
          </header>
          <div className="code-panels">
            <figure>
              <figcaption>Tip API · POST</figcaption>
              <pre>{`{
  "type": "nymm_tip_probe",
  "tipId": "tip_…",
  "amountHidden": true,
  "path": "hold_claim",
  "platform": "x"
}`}</pre>
            </figure>
            <figure>
              <figcaption>Wallet RPC · POST</figcaption>
              <pre>{`{
  "jsonrpc": "2.0",
  "method": "getbalance",
  "params": { "account_index": 0 },
  "id": 1
}`}</pre>
            </figure>
          </div>
        </div>
        <div>
          <header className="section-label">
            <h2>Build limits</h2>
            <p>Honest scope for this prototype</p>
          </header>
          <dl className="limit-list">
            {LIMITS.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="method-cta">
        <div>
          <h2>Next</h2>
          <p>Arm the tunnel on Lab, run Full battery, then open Stats to review the session.</p>
        </div>
        <div className="hero-actions">
          <a className="btn btn-fill" href="#/lab">
            Open lab
          </a>
          <a className="btn" href="#/stats">
            Stats board
          </a>
          <a className="btn" href="#/about">
            About
          </a>
        </div>
      </section>
    </div>
  );
}
