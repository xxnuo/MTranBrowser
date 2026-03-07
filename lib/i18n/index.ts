import browser from "webextension-polyfill";
import {
	localeMessages,
	supportedUiLanguageSet,
	supportedUiLanguages,
	uiLanguageAliases,
} from "./messages";

export type UiLanguage = (typeof supportedUiLanguages)[number];
export type TranslateParams = Record<string, string | number>;
export type TranslateFn = (source: string, params?: TranslateParams) => string;

function normalizeLanguageTag(value?: string | null) {
	if (!value) {
		return "";
	}
	return value.split(",")[0]?.trim().replace(/_/g, "-") || "";
}

function getSystemLanguage() {
	const candidates = [
		...(typeof navigator !== "undefined" ? navigator.languages || [] : []),
		typeof navigator !== "undefined" ? navigator.language : undefined,
		typeof document !== "undefined" ? document.documentElement.lang : undefined,
		(() => {
			try {
				return browser.i18n?.getUILanguage?.();
			} catch {
				return undefined;
			}
		})(),
		globalThis.chrome?.i18n?.getUILanguage?.(),
		(globalThis as any).browser?.i18n?.getUILanguage?.(),
	];
	for (const value of candidates) {
		const candidate = normalizeLanguageTag(value);
		if (candidate) {
			return candidate;
		}
	}
	return "zh-Hans";
}

export function resolveUiLanguage(preferred?: string | null): UiLanguage {
	const candidate = normalizeLanguageTag(
		preferred && preferred !== "auto" ? preferred : getSystemLanguage()
	);
	if (!candidate) {
		return "zh-Hans";
	}
	const alias = uiLanguageAliases[candidate];
	if (alias && supportedUiLanguageSet.has(alias)) {
		return alias;
	}
	if (supportedUiLanguageSet.has(candidate as UiLanguage)) {
		return candidate as UiLanguage;
	}
	const lowerCandidate = candidate.toLowerCase();
	const directAlias = uiLanguageAliases[lowerCandidate];
	if (directAlias) {
		return directAlias;
	}
	for (const [key, value] of Object.entries(uiLanguageAliases)) {
		if (lowerCandidate.startsWith(key.toLowerCase())) {
			return value;
		}
	}
	return "zh-Hans";
}

function interpolate(message: string, params?: TranslateParams) {
	if (!params) {
		return message;
	}
	return message.replace(/\{(\w+)\}/g, (_, key) => {
		const value = params[key];
		return value === undefined ? `{${key}}` : String(value);
	});
}

export function createTranslator(preferred?: string | null): TranslateFn {
	const language = resolveUiLanguage(preferred);
	const table = localeMessages[language] || {};
	const englishTable = localeMessages.en || {};
	const zhHansTable = localeMessages["zh-Hans"] || {};
	return (source: string, params?: TranslateParams) => {
		const translated =
			language === "zh-Hans"
				? table[source] ?? source
				: table[source] ?? englishTable[source] ?? zhHansTable[source] ?? source;
		return interpolate(translated, params);
	};
}

export function getLanguageDirection(language: UiLanguage): "ltr" | "rtl" {
	return language === "ar" ? "rtl" : "ltr";
}

export function getDocumentLanguage(language: UiLanguage) {
	const map: Record<UiLanguage, string> = {
		en: "en",
		"zh-Hans": "zh-CN",
		es: "es",
		ja: "ja",
		de: "de",
		fr: "fr",
		ko: "ko",
		"zh-Hant": "zh-TW",
		ar: "ar",
		"pt-BR": "pt-BR",
		ru: "ru",
		vi: "vi",
	};
	return map[language];
}

export function localizeOptions<T>(value: T, t: TranslateFn): T {
	if (Array.isArray(value)) {
		return value.map((item) => localizeOptions(item, t)) as T;
	}
	if (!value || typeof value !== "object") {
		return value;
	}
	const next: Record<string, unknown> = {};
	for (const [key, current] of Object.entries(value)) {
		if (key === "label" && typeof current === "string") {
			next[key] = t(current);
			continue;
		}
		next[key] = localizeOptions(current, t);
	}
	return next as T;
}

export function getUiLanguageOptions(t: TranslateFn) {
	return [
		{ value: "auto", label: t("跟随浏览器语言") },
		{ value: "en", label: t("英语") },
		{ value: "zh-Hans", label: t("简体中文") },
		{ value: "es", label: t("西班牙语") },
		{ value: "ja", label: t("日语") },
		{ value: "de", label: t("德语") },
		{ value: "fr", label: t("法语") },
		{ value: "ko", label: t("韩语") },
		{ value: "zh-Hant", label: t("繁體中文") },
		{ value: "ar", label: t("阿拉伯语（中东）") },
		{ value: "pt-BR", label: t("葡萄牙语（巴西）") },
		{ value: "ru", label: t("俄语") },
		{ value: "vi", label: t("越南语") },
	];
}
