import { useEffect } from "react";

function applyTheme(theme: string) {
	if (theme === "auto") {
		const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		document.documentElement.classList.toggle("dark", isDark);
		return;
	}
	document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme(theme: string) {
	useEffect(() => {
		applyTheme(theme || "auto");
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => {
			if ((theme || "auto") === "auto") {
				applyTheme("auto");
			}
		};
		media.addEventListener("change", onChange);
		return () => {
			media.removeEventListener("change", onChange);
		};
	}, [theme]);
}
