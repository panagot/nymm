const CHECKLIST = [
  "Arm mixnet from the navbar (WASM loads once)",
  "Run Full battery on Lab (GET + Tip + Wallet RPC)",
  "Confirm dual-trace updates and mix panes return HTTP bodies",
  "Open Stats: note avg Δ, ratio, P50/P90, by-label table",
  "Export session JSON and attach or quote in the NSL post",
  "Cite Method page: threat model + transport matrix + limits",
];

export default function AboutPage({ runCount = 0, tunnelLabel = "IDLE" }) {
  return (
    <div className="page-about">
      <header className="page-head">
        <p className="fig">FIG. D · FIELD NOTES</p>
        <h1>About NYMM</h1>
        <p>
          Independent Build with Nym lab. Same tip and wallet payloads on clearnet and
          mixnet. Timed, plotted, exportable for the NSL thread.
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
          <b>Mission</b>
          <span>NSL · Build with Nym · tools</span>
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
            Real Sphinx hops via mix-fetch, not a mocked sleep. Cover and Poisson are off for
            interactive demos; Method documents the tradeoff.
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
        <h2>NSL submission checklist</h2>
        <ol className="check-list">
          {CHECKLIST.map((item) => (
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
          <h2>Why this helps approval</h2>
          <p>Concrete, runnable, documented</p>
        </header>
        <ul className="value-list">
          <li>
            <strong>Working mix-fetch integration</strong>
            <span>Not a slide deck — arm, probe, see Sphinx-path latency.</span>
          </li>
          <li>
            <strong>Tip + wallet shapes</strong>
            <span>Use cases Nym cares about: metadata privacy for sensitive HTTP.</span>
          </li>
          <li>
            <strong>Measurable cost</strong>
            <span>Δ, ratio, P50/P90, composition charts, exportable JSON.</span>
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
