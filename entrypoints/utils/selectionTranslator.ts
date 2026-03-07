import { storage } from "@wxt-dev/storage";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import SelectionTranslator from "@/components/SelectionTranslator";
import { I18nProvider } from "@/entrypoints/ui/i18n/I18nProvider";
import { config } from "@/entrypoints/utils/config";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function saveConfig() {
	storage.setItem("local:config", JSON.stringify(config)).catch((error) => {
		console.error("Failed to save config:", error);
	});
}

export function mountSelectionTranslator() {
	if (
		root ||
		config.disableSelectionTranslator ||
		config.selectionTranslatorMode === "disabled"
	) {
		return;
	}
	container = document.createElement("div");
	container.id = "fluent-read-selection-translator-container";
	document.body.appendChild(container);
	root = createRoot(container);
	root.render(
		createElement(
			I18nProvider,
			{ language: config.uiLanguage },
			createElement(SelectionTranslator),
		),
	);
}

export function unmountSelectionTranslator() {
	if (!root || !container) {
		return;
	}
	root.unmount();
	root = null;
	container.remove();
	container = null;
}

export function toggleSelectionTranslator() {
	if (root) {
		unmountSelectionTranslator();
		config.disableSelectionTranslator = true;
	} else {
		config.disableSelectionTranslator = false;
		mountSelectionTranslator();
	}
	saveConfig();
}
