/**
 * NYMM entry — mount the React app.
 * CSS is loaded once here (dossier / Swiss blueprint look).
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
