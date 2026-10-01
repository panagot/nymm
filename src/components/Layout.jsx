import { Logo } from "./Logo";

const LINKS = [
  { id: "lab", label: "Lab", href: "#/lab" },
  { id: "stats", label: "Stats", href: "#/stats" },
  { id: "method", label: "Method", href: "#/method" },
  { id: "about", label: "About", href: "#/about" },
];

export function Navbar({ route, tunnelLabel, tunnelClass, onArm, busy }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Logo />
        <nav className="navbar-links" aria-label="Primary">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className={route === link.id ? "active" : undefined}
              aria-current={route === link.id ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="navbar-actions">
          <span className={`nav-status ${tunnelClass}`}>
            <i />
            {tunnelLabel}
          </span>
          <button
            type="button"
            className="btn btn-fill btn-sm"
            onClick={onArm}
            disabled={busy === "connect" || tunnelLabel === "LIVE"}
          >
            {tunnelLabel === "LIVE"
              ? "Armed"
              : busy === "connect"
                ? "Arming…"
                : "Arm mixnet"}
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            Mixnet timing dossier for tip APIs and wallet RPC. Clearnet vs Sphinx path,
            measured end to end.
          </p>
        </div>
        <div>
          <h4>Navigate</h4>
          <ul>
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>References</h4>
          <ul>
            <li>
              <a
                href="https://nym.com/docs/developers/mix-fetch/get-started"
                target="_blank"
                rel="noreferrer"
              >
                mix-fetch docs
              </a>
            </li>
            <li>
              <a href="https://nym.com/" target="_blank" rel="noreferrer">
                nym.com
              </a>
            </li>
            <li>
              <a href="https://httpbin.org/" target="_blank" rel="noreferrer">
                httpbin echo
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Meta</h4>
          <ul>
            <li>REV 0.4</li>
            <li>UNIT / NSL-01</li>
            <li>Independent prototype</li>
          </ul>
        </div>
      </div>
      <div className="footer-bar">
        <span>Not affiliated with Nym Technologies SA</span>
        <span>Open source lab · localhost first</span>
      </div>
    </footer>
  );
}
