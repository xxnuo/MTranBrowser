import { storage } from "@wxt-dev/storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Config } from "@/entrypoints/utils/model";

function hydrateConfig(raw: string) {
	const next = new Config();
	Object.assign(next, JSON.parse(raw));
	return next;
}

export function useConfig() {
	const [config, setConfig] = useState<Config>(() => new Config());
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		storage.getItem("local:config").then((value: any) => {
			if (typeof value === "string" && value) {
				setConfig(hydrateConfig(value));
			}
			setLoaded(true);
		});

		storage.watch("local:config", (newValue: any) => {
			if (typeof newValue === "string" && newValue) {
				setConfig(hydrateConfig(newValue));
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
			const draft = new Config();
			Object.assign(draft, prev);
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
