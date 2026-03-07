import { storage } from "@wxt-dev/storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Config, normalizeConfig } from "@/entrypoints/utils/model";

function hydrateConfig(raw: string) {
	return normalizeConfig(JSON.parse(raw));
}

export function useConfig() {
	const [config, setConfig] = useState<Config>(() => new Config());
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		storage.getItem("local:config").then((value: any) => {
			if (typeof value === "string" && value) {
				const nextConfig = hydrateConfig(value);
				setConfig(nextConfig);
				const normalizedValue = JSON.stringify(nextConfig);
				if (normalizedValue !== value) {
					storage.setItem("local:config", normalizedValue).catch(() => {});
				}
			}
			setLoaded(true);
		});

		storage.watch("local:config", (newValue: any) => {
			if (typeof newValue === "string" && newValue) {
				const nextConfig = hydrateConfig(newValue);
				setConfig(nextConfig);
				const normalizedValue = JSON.stringify(nextConfig);
				if (normalizedValue !== newValue) {
					storage.setItem("local:config", normalizedValue).catch(() => {});
				}
			}
		});
	}, []);

	useEffect(() => {
		if (!loaded) {
			return;
		}
		storage.setItem("local:config", JSON.stringify(config));
	}, [config, loaded]);

	const updateConfig = useCallback((updater: (draft: Config) => void) => {
		setConfig((prev) => {
			const draft = normalizeConfig(prev);
			updater(draft);
			return draft;
		});
	}, []);

	return useMemo(
		() => ({
			config,
			loaded,
			setConfig,
			updateConfig,
		}),
		[config, loaded, updateConfig],
	);
}
