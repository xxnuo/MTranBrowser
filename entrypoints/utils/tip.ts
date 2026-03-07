import { throttle } from "@/entrypoints/utils/common";

const toastClass = "fluent-read-inline-toast";

function showMessage(message: string, type: "error" | "success") {
	const existing = document.querySelector(`.${toastClass}`);
	if (existing) {
		existing.remove();
	}

	const el = document.createElement("div");
	el.className = toastClass;
	el.textContent = message;
	el.style.position = "fixed";
	el.style.top = "18px";
	el.style.right = "18px";
	el.style.zIndex = "100000";
	el.style.maxWidth = "360px";
	el.style.padding = "10px 12px";
	el.style.borderRadius = "8px";
	el.style.fontSize = "13px";
	el.style.lineHeight = "1.4";
	el.style.color = "#fff";
	el.style.boxShadow = "0 10px 30px rgba(0,0,0,.2)";
	el.style.background =
		type === "error" ? "rgba(220,38,38,.95)" : "rgba(22,163,74,.95)";
	document.body.appendChild(el);

	window.setTimeout(() => {
		el.remove();
	}, 2200);
}

function _sendErrorMessage(message: string) {
	showMessage(message, "error");
}

function _sendSuccessMessage(message: string) {
	showMessage(message, "success");
}

export const sendErrorMessage = throttle(_sendErrorMessage, 1000);
export const sendSuccessMessage = throttle(_sendSuccessMessage, 1000);
