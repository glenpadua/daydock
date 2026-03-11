import React from "react";
import ReactDOM from "react-dom/client";
import "./shared/styles/global.css";
import App from "./App";
import { LongBreakScreen } from "./features/break-reminder/components/LongBreakScreen";

const params = new URLSearchParams(window.location.search);
const isLongBreak = params.get("window") === "long-break";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isLongBreak ? <LongBreakScreen /> : <App />}
  </React.StrictMode>,
);
