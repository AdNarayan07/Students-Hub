import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ActiveStateProvider } from "./components/common/active_state_context";
import "./index.css";
import { open } from "@tauri-apps/plugin-shell";

// redirect all external links to default browser instead of tauri webview
document.addEventListener("click", (event) => {
  let target = event.target;
  while (target && target !== document) {
    if (target.tagName === "A" && target.href) {
      event.preventDefault();
      const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(
        target.getAttribute("href")
      );
      if (isAbsolute) open(target.href);
      break;
    }
    target = target.parentElement;
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <ActiveStateProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ActiveStateProvider>
);
