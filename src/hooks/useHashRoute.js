/**
 * Hash router for a static Vite deploy (Vercel / any CDN).
 * Routes: #/lab | #/stats | #/method | #/about
 * No React Router dependency — keeps the build tiny and host-agnostic.
 */

import { useEffect, useState } from "react";

const ROUTES = new Set(["lab", "stats", "method", "about"]);

/** Parse window.location.hash → known route id (default lab). */
export function getRouteFromHash() {
  const raw = (window.location.hash.replace(/^#\/?/, "") || "lab").split("?")[0];
  return ROUTES.has(raw) ? raw : "lab";
}

/** Subscribe to hashchange; returns [route, navigate]. */
export function useHashRoute() {
  const [route, setRoute] = useState(getRouteFromHash);

  useEffect(() => {
    const onHash = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHash);
    // Normalize bare "/" visits to #/lab so deep links work after refresh
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
