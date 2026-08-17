import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./stile.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registra il service worker: l'app si installa sul telefono e parte offline.
// In sviluppo si salta, altrimenti la cache nasconderebbe le modifiche.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* niente offline: l'app funziona comunque */
    });
  });
}
