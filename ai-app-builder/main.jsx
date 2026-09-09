import React from "react";
import { createRoot } from "react-dom/client";
import AIAppBuilder from "./AIAppBuilder.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AIAppBuilder />
  </React.StrictMode>
);
