import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./utils/console-filter"; // Filter browser extension errors

createRoot(document.getElementById("root")!).render(<App />);
