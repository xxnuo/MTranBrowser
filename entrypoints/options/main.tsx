import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import { createTranslator } from "@/lib/i18n";
import "@/entrypoints/ui/globals.css";
import App from "./App";

const t = createTranslator();

const mountApp = () => {
	const container = document.getElementById("app");
	if (!container) {
		throw new Error(t("Options root element not found"));
	}
	createRoot(container).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
};

const ensureStandalone = async () => {
	const currentUrl = new URL(window.location.href);
	if (currentUrl.searchParams.get("standalone") === "1") {
		return false;
	}
	const url = browser.runtime.getURL("/options.html?standalone=1");
	try {
		await browser.tabs.create({ url });
		document.body.innerHTML = `<div style="font-family: system-ui, sans-serif; padding: 24px; color: #333;">${t("设置页已在新标签页打开。")}</div>`;
		return true;
	} catch {
		const openedWindow = window.open(url, "_blank");
		if (openedWindow) {
			document.body.innerHTML = `<div style="font-family: system-ui, sans-serif; padding: 24px; color: #333;">${t("设置页已在新标签页打开。")}</div>`;
			return true;
		}
		window.location.replace(url);
		return true;
	}
};

ensureStandalone()
	.then((opened) => {
		if (!opened) {
			mountApp();
		}
	})
	.catch(() => {
		mountApp();
	});
