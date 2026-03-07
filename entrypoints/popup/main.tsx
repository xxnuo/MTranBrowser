import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTranslator } from "@/lib/i18n";
import "@/entrypoints/ui/globals.css";
import App from "./App";

const t = createTranslator();

const container = document.getElementById("app");

if (!container) {
	throw new Error(t("Popup root element not found"));
}

createRoot(container).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
