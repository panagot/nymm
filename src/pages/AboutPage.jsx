/**
 * About page — product framing, how to use, scope / non-goals, disclaimer.
 */

const HOW_TO = [
  "Arm the mixnet tunnel from the navbar (WASM loads once per page)",
  "Run Full battery on Lab, or probe Tip / Wallet individually",
  "Compare clearnet vs mixnet latency on the signal plates",
  "Open Stats for averages, percentiles, charts, and the run log",
  "Export session JSON if you want to keep or share the timing data",
];

export default function AboutPage({ runCount = 0, tunnelLabel = "IDLE" }) {
  return (
    <div className="page-about">
      <header className="page-head">
        <p className="fig">FIG. D · ABOUT</p>
        <h1>About NYMM</h1>
        <p>
          A small lab that times the same tip- and wallet-shaped HTTP on clearnet and through
          the Nym mixnet — then plots the difference.
        </p>
      </header>

      <div className="about-strip">
        <div>
          <b>Product</b>
          <span>Mixnet timing dossier for tip APIs and wallet RPC</span>
        </div>
        <div>
          <b>Stack</b>
          <span>React · Vite · @nymproject/mix-fetch ^2.1</span>
        </div>
        <div>
          <b>Transport</b>
          <span>Browser fetch vs mix-fetch</span>
        </div>
        <div>
          <b>Session</b>
          <span>
            Tunnel {tunnelLabel} · {String(runCount).padStart(2, "0")} runs
          </span>
        </div>
      </div>

      <div className="about-grid">
        <article>
          <h2>01 · Problem</h2>
          <p>
            Tip bots and wallet RPC over clearnet leak IP adjacency and timing. Hiding the
            amount on a feed does not hide who called the API.
          </p>
        </article>
        <article>
          <h2>02 · Approach</h2>
          <p>
            Pair every probe: browser <code>fetch</code> then <code>mix-fetch</code>. Record
            full-body latency. Plot clear vs mix, overhead Δ, percentiles, and by-label
            averages.
          </p>
        </article>
        <article>
          <h2>03 · Evidence</h2>
          <p>
            Real Sphinx hops via mix-fetch, not a mocked sleep. Cover and Poisson traffic are
            off for interactive demos; Method documents the tradeoff.
          </p>
        </article>
        <article>
          <h2>04 · Non-goals</h2>
          <p>
            No custody, no live tip settlement, no production privacy SLA. Swap httpbin for
            your tip host when integrating.
          </p>
        </article>
      </div>

      <section className="about-steps">
        <h2>How to use</h2>
        <ol className="check-list">
          {HOW_TO.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <div className="hero-actions">
          <a className="btn btn-fill" href="#/lab">
            Enter the lab
          </a>
          <a className="btn" href="#/method">
            Method
          </a>
          <a className="btn" href="#/stats">
            Stats
          </a>
          <a
            className="btn"
            href="https://nym.com/docs/developers/mix-fetch/get-started"
            target="_blank"
            rel="noreferrer"
          >
            mix-fetch docs
          </a>
        </div>
      </section>

      <section className="about-value">
        <header className="section-label">
          <h2>What you get</h2>
          <p>Runnable, measurable, documented</p>
        </header>
        <ul className="value-list">
          <li>
            <strong>Working mix-fetch integration</strong>
            <span>Arm the tunnel, probe, and see Sphinx-path latency end to end.</span>
          </li>
          <li>
            <strong>Tip + wallet shapes</strong>
            <span>Metadata-sensitive HTTP patterns that benefit from mixnet routing.</span>
          </li>
          <li>
            <strong>Measurable cost</strong>
            <span>Δ, ratio, P50/P90, composition charts, and exportable JSON.</span>
          </li>
          <li>
            <strong>Honest limits</strong>
            <span>Cover/Poisson off, httpbin echo, one-shot tunnel — stated upfront.</span>
          </li>
        </ul>
      </section>

      <p className="about-disclaimer">
        NYMM is an independent community prototype and is not affiliated with Nym
        Technologies SA.
      </p>
    </div>
  );
}
