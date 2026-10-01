export function Logo({ compact = false }) {
  if (compact) {
    return (
      <a className="logo logo-compact" href="#/lab" aria-label="NYMM home">
        <img src="/nymm.svg" width="40" height="40" alt="" />
      </a>
    );
  }

  return (
    <a className="logo" href="#/lab" aria-label="NYMM home">
      <img className="logo-mark" src="/nymm.svg" width="44" height="44" alt="" />
      <span className="logo-text">
        <strong>NYMM</strong>
        <em>Mixnet Timing Dossier</em>
      </span>
    </a>
  );
}
