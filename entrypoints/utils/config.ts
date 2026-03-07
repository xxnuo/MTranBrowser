import { storage } from "@wxt-dev/storage";
import { Config, normalizeConfig } from "@/entrypoints/utils/model";

const LEGACY_FULL_PAGE_RULE_CACHE_KEY = "local:fullPageRuleCache";

export const config: Config = new Config();
export const configReady = loadConfig();

function isConfigObjectValid(obj: unknown): obj is Record<string, unknown> {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"on" in obj &&
		"service" in obj &&
		"from" in obj &&
		"to" in obj
	);
}

async function persistConfig(next: Config) {
	await storage.setItem("local:config", JSON.stringify(next));
}

async function clearLegacyStorage() {
	try {
		await storage.removeItem(LEGACY_FULL_PAGE_RULE_CACHE_KEY);
	} catch {}
}

async function loadConfig() {
	await clearLegacyStorage();
	try {
		const value = await storage.getItem("local:config");
		if (typeof value === "string" && value.trim().length > 0) {
			const parsedConfig = JSON.parse(value);
			if (isConfigObjectValid(parsedConfig)) {
				const normalizedConfig = normalizeConfig(parsedConfig);
				Object.assign(config, normalizedConfig);
				const normalizedValue = JSON.stringify(normalizedConfig);
				if (normalizedValue !== value) {
					await storage.setItem("local:config", normalizedValue);
				}
				return;
			}
		}
		await persistConfig(new Config());
	} catch (error) {
		console.error("Error loading or validating config:", error);
		try {
			await persistConfig(new Config());
		} catch (saveError) {
			console.error("Failed to save default config after an error:", saveError);
		}
	}
}

storage.watch("local:config", (newValue: any) => {
	if (typeof newValue !== "string" || newValue.trim().length === 0) {
		return;
	}
	try {
		const parsedConfig = JSON.parse(newValue);
		if (!isConfigObjectValid(parsedConfig)) {
			console.warn(
				"An invalid configuration was detected in storage.watch. Ignoring.",
			);
			return;
		}
		const normalizedConfig = normalizeConfig(parsedConfig);
		Object.assign(config, normalizedConfig);
		const normalizedValue = JSON.stringify(normalizedConfig);
		if (normalizedValue !== newValue) {
			void storage.setItem("local:config", normalizedValue);
		}
	} catch (error) {
		console.error("Error parsing new config in storage.watch:", error);
	}
});
