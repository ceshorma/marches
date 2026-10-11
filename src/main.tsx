import React from "react";
import ReactDOM from "react-dom/client";
import App from "./tactics/TacticalApp";
import Sheet from "./tactics/Sheet";
import TerrainSample from "./tactics/TerrainSample";

// ?sheet shows every map asset large, for reviewing the art.
const sheet = new URLSearchParams(location.search).has("sheet");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {new URLSearchParams(location.search).has("terrain") ? (
      <TerrainSample />
    ) : sheet ? (
      <Sheet />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
