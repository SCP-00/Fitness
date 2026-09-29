import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TodayPage from "./features/today/TodayPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TodayPage />
  </StrictMode>,
);
