import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./theme/global.css";
import { runSelfCheck } from "./sim/selfcheck";

runSelfCheck();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
