import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./index.css";
// The ported mockup design system (2026-10-14 migration). Loaded *after* the
// old stylesheet: the two namespaces do not collide (old rules are `tl-*`, the
// mockup's are bare), and where both style the same element the mockup's rule
// is the one that must win. One of the two disappears when the last old screen
// is replaced; until then they coexist on purpose.
import "./mockup.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
