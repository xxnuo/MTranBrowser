import { storage } from "@wxt-dev/storage";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import FloatingBall from "@/components/FloatingBall";
import { I18nProvider } from "@/entrypoints/ui/i18n/I18nProvider";
import {
	autoTranslateEnglishPage,
	restoreOriginalContent,
} from "@/entrypoints/main/trans";
import { config } from "@/entrypoints/utils/config";

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let isTranslated = false;
let position: "left" | "right" = "right";

function saveConfig() {
	storage.setItem("local:config", JSON.stringify(config)).catch((error) => {
		console.error("Failed to save config:", error);
	});
}

function applyTranslationState(next: boolean) {
	if (next === isTranslated) {
		return;
	}
	isTranslated = next;
	if (next) {
		document.dispatchEvent(new CustomEvent("mtranbrowser-translation-started"));
		autoTranslateEnglishPage();
	} else {
		document.dispatchEvent(new CustomEvent("mtranbrowser-translation-ended"));
		restoreOriginalContent();
	}
	renderFloatingBall();
}

function renderFloatingBall() {
	if (!root) {
		return;
	}
	root.render(
		createElement(
			I18nProvider,
			{ language: config.uiLanguage },
			createElement(FloatingBall, {
				position,
				isTranslating: isTranslated,
				onToggle: () => applyTranslationState(!isTranslated),
				onPositionChanged: (next: "left" | "right") => {
					position = next;
					config.floatingBallPosition = next;
					saveConfig();
				},
			}),
		),
	);
}

export function mountFloatingBall() {
	if (config.disableFloatingBall || root) {
		return;
	}
	position = "right";
	config.floatingBallPosition = position;
	container = document.createElement("div");
	container.id = "fluent-read-floating-ball-container";
	container.style.position = "fixed";
	container.style.top = "0";
	container.style.left = "0";
	container.style.width = "0";
	container.style.height = "0";
	container.style.overflow = "visible";
	container.style.zIndex = "2147483647";
	document.body.appendChild(container);
	root = createRoot(container);
	renderFloatingBall();
	document.addEventListener(
		"mtranbrowser-toggle-translation",
		toggleFloatingBallTranslation,
	);
}

export function toggleFloatingBallTranslation() {
	if (!root) {
		return;
	}
	applyTranslationState(!isTranslated);
}

export function unmountFloatingBall() {
	if (!root || !container) {
		return;
	}
	document.removeEventListener(
		"mtranbrowser-toggle-translation",
		toggleFloatingBallTranslation,
	);
	root.unmount();
	root = null;
	container.remove();
	container = null;
}

export function toggleFloatingBall() {
	if (root) {
		unmountFloatingBall();
		config.disableFloatingBall = true;
	} else {
		config.disableFloatingBall = false;
		mountFloatingBall();
	}
	saveConfig();
}

export function toggleFloatingBallPosition() {
	position = "right";
	config.floatingBallPosition = position;
	if (root) {
		renderFloatingBall();
	}
	saveConfig();
}
