import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
} from "react";
import {
	createTranslator,
	getDocumentLanguage,
	getLanguageDirection,
	resolveUiLanguage,
	type TranslateFn,
	type UiLanguage,
} from "@/lib/i18n";

type TitleValue = string | ((t: TranslateFn) => string);

type I18nContextValue = {
	language: UiLanguage;
	direction: "ltr" | "rtl";
	t: TranslateFn;
};

const defaultLanguage = resolveUiLanguage();
const defaultValue: I18nContextValue = {
	language: defaultLanguage,
	direction: getLanguageDirection(defaultLanguage),
	t: createTranslator(defaultLanguage),
};

const I18nContext = createContext<I18nContextValue>(defaultValue);

export function I18nProvider({
	language,
	title,
	syncDocument = false,
	children,
}: {
	language?: string | null;
	title?: TitleValue;
	syncDocument?: boolean;
	children?: ReactNode;
}) {
	const resolvedLanguage = useMemo(
		() => resolveUiLanguage(language),
		[language],
	);
	const t = useMemo(
		() => createTranslator(resolvedLanguage),
		[resolvedLanguage],
	);
	const direction = getLanguageDirection(resolvedLanguage);

	useEffect(() => {
		if (!syncDocument) {
			return;
		}
		document.documentElement.lang = getDocumentLanguage(resolvedLanguage);
		document.documentElement.dir = direction;
		if (title) {
			document.title = typeof title === "function" ? title(t) : title;
		}
	}, [direction, resolvedLanguage, syncDocument, t, title]);

	const value = useMemo(
		() => ({ language: resolvedLanguage, direction, t }),
		[direction, resolvedLanguage, t],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
	return useContext(I18nContext);
}
