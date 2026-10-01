import { useEffect, useState } from "react";

const ROUTES = new Set(["lab", "stats", "method", "about"]);

export function getRouteFromHash() {
  const raw = (window.location.hash.replace(/^#\/?/, "") || "lab").split("?")[0];
  return ROUTES.has(raw) ? raw : "lab";
}

export function useHashRoute() {
  const [route, setRoute] = useState(getRouteFromHash);

  useEffect(() => {
    const onHash = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) {
      window.location.hash = "#/lab";
    }
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (next) => {
    window.location.hash = `#/${next}`;
  };

  return [route, navigate];
}
