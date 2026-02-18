import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/global.css"; // Import global styles

// Global Fix: Prevent number input change on scroll
document.addEventListener("wheel", (event) => {
  if (document.activeElement.type === "number") {
    document.activeElement.blur();
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
