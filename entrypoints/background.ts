import { storage } from "@wxt-dev/storage";
import { createTranslator } from "@/lib/i18n";
import { _service } from "@/entrypoints/service/_service";
import { config } from "@/entrypoints/utils/config";
import { CONTEXT_MENU_IDS } from "@/entrypoints/utils/constant";
import {
	DEFAULT_FULL_PAGE_RULE_URL,
	FULL_PAGE_RULE_CACHE_KEY,
	FULL_PAGE_RULE_CACHE_MAX_AGE,
	isValidRuleUrl,
	matchSiteRule,
	normalizeRemoteRules,
	normalizeRuleUrl,
	type RemoteRuleCache,
} from "@/entrypoints/utils/fullPageRule";

const getT = () => createTranslator(config.uiLanguage);
const translationStateMap = new Map<number, boolean>();

async function getRuleCache() {
	const value = await storage.getItem(FULL_PAGE_RULE_CACHE_KEY);
	if (typeof value !== "string" || !value.trim()) {
		return null;
	}
	try {
		const parsed = JSON.parse(value) as RemoteRuleCache;
		if (
			typeof parsed?.url === "string" &&
			typeof parsed?.fetchedAt === "number" &&
			Array.isArray(parsed?.rules)
		) {
			return parsed;
		}
	} catch {}
	return null;
}

async function setRuleCache(cache: RemoteRuleCache) {
	await storage.setItem(FULL_PAGE_RULE_CACHE_KEY, JSON.stringify(cache));
	return cache;
}

function isSameRuleSource(cache: RemoteRuleCache | null, url: string) {
	return !!cache && cache.url === normalizeRuleUrl(url);
}

function isRuleCacheExpired(cache: RemoteRuleCache | null) {
	if (!cache) {
		return true;
	}
	return Date.now() - cache.fetchedAt >= FULL_PAGE_RULE_CACHE_MAX_AGE;
}

async function fetchRuleCache(
	url: string,
	currentCache: RemoteRuleCache | null,
) {
	const headers = new Headers();
	if (currentCache?.etag) {
		headers.set("If-None-Match", currentCache.etag);
	}
	if (currentCache?.lastModified) {
		headers.set("If-Modified-Since", currentCache.lastModified);
	}
	const response = await fetch(url, {
		headers,
		cache: "no-store",
	});
	if (response.status === 304 && currentCache) {
		return setRuleCache({
			...currentCache,
			fetchedAt: Date.now(),
		});
	}
	if (!response.ok) {
		throw new Error(`规则拉取失败: ${response.status} ${response.statusText}`);
	}
	const rules = normalizeRemoteRules(await response.json());
	return setRuleCache({
		url,
		fetchedAt: Date.now(),
		etag: response.headers.get("etag") ?? "",
		lastModified: response.headers.get("last-modified") ?? "",
		rules,
	});
}

async function refreshRuleCache(
	url: string,
	options: { force?: boolean } = {},
) {
	const targetUrl = normalizeRuleUrl(url);
	const currentCache = await getRuleCache();
	if (
		!options.force &&
		isSameRuleSource(currentCache, targetUrl) &&
		!isRuleCacheExpired(currentCache)
	) {
		return currentCache;
	}
	return fetchRuleCache(
		targetUrl,
		isSameRuleSource(currentCache, targetUrl) ? currentCache : null,
	);
}

async function getStoredRuleUrl() {
	const rawConfig = await storage.getItem("local:config");
	if (typeof rawConfig === "string" && rawConfig.trim()) {
		try {
			const parsed = JSON.parse(rawConfig);
			if (isValidRuleUrl(parsed?.fullPageRuleUrl)) {
				return normalizeRuleUrl(parsed.fullPageRuleUrl);
			}
		} catch {}
	}
	return DEFAULT_FULL_PAGE_RULE_URL;
}

async function resolveRuleCacheForPage(ruleUrl?: string) {
	const sourceUrl = isValidRuleUrl(ruleUrl || "")
		? normalizeRuleUrl(ruleUrl as string)
		: await getStoredRuleUrl();
	const currentCache = await getRuleCache();
	if (isSameRuleSource(currentCache, sourceUrl)) {
		if (!isRuleCacheExpired(currentCache)) {
			return { sourceUrl, cache: currentCache };
		}
		void refreshRuleCache(sourceUrl).catch(() => {});
		return { sourceUrl, cache: currentCache };
	}
	const freshCache = await refreshRuleCache(sourceUrl, { force: true });
	return { sourceUrl, cache: freshCache };
}

async function translateWithMicrosoftInBackground(
	text: string,
	targetLang: string,
): Promise<string> {
	try {
		const jwtToken = await refreshMicrosoftTokenInBackground();
		const response = await fetch(
			`https://api-edge.cognitive.microsofttranslator.com/translate?from=&to=${targetLang}&api-version=3.0&includeSentenceLength=true&textType=html`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${jwtToken}`,
				},
				body: JSON.stringify([{ Text: text }]),
			},
		);
		if (response.ok) {
			const result = await response.json();
			return result[0].translations[0].text;
		}
		throw new Error(`微软翻译失败: ${response.status} ${response.statusText}`);
	} catch (error) {
		console.error("微软翻译请求失败:", error);
		throw error;
	}
}

async function refreshMicrosoftTokenInBackground(): Promise<string> {
	try {
		const response = await fetch("https://edge.microsoft.com/translate/auth");
		if (response.ok) {
			return await response.text();
		}
		throw new Error(
			`获取微软翻译令牌失败: ${response.status} ${response.statusText}`,
		);
	} catch (error) {
		console.error("获取微软翻译令牌失败:", error);
		throw error;
	}
}

export default defineBackground({
	persistent: {
		safari: false,
	},
	main() {
		void getStoredRuleUrl()
			.then((url) => refreshRuleCache(url).catch(() => null))
			.catch(() => null);

		const t = getT();
		try {
			browser.contextMenus.create({
				id: "mtranbrowser-parent",
				title: t("MTranBrowser"),
				contexts: ["page", "selection"],
			});
			browser.contextMenus.create({
				id: CONTEXT_MENU_IDS.TRANSLATE_FULL_PAGE,
				title: t("全文翻译"),
				parentId: "mtranbrowser-parent",
				contexts: ["page", "selection"],
			});
			browser.contextMenus.create({
				id: CONTEXT_MENU_IDS.RESTORE_ORIGINAL,
				title: t("撤销翻译"),
				parentId: "mtranbrowser-parent",
				contexts: ["page", "selection"],
				enabled: false,
			});
		} catch (error) {
			console.error("Error setting up context menu:", error);
		}

		browser.contextMenus.onClicked.addListener((info: any, tab: any) => {
			if (!tab?.id) {
				return;
			}

			if (info.menuItemId === CONTEXT_MENU_IDS.TRANSLATE_FULL_PAGE) {
				browser.tabs
					.sendMessage(tab.id, {
						type: "contextMenuTranslate",
						action: "fullPage",
					})
					.then(() => {
						translationStateMap.set(tab.id!, true);
						updateContextMenus(tab.id!);
					})
					.catch((error: any) => {
						console.error("Failed to send message to content script:", error);
					});
			} else if (info.menuItemId === CONTEXT_MENU_IDS.RESTORE_ORIGINAL) {
				browser.tabs
					.sendMessage(tab.id, {
						type: "contextMenuTranslate",
						action: "restore",
					})
					.then(() => {
						translationStateMap.set(tab.id!, false);
						updateContextMenus(tab.id!);
					})
					.catch((error: any) => {
						console.error("Failed to send message to content script:", error);
					});
			}
		});

		const updateContextMenus = (tabId: number) => {
			const isTranslated = translationStateMap.get(tabId) || false;
			const translator = getT();
			try {
				browser.contextMenus.update(CONTEXT_MENU_IDS.TRANSLATE_FULL_PAGE, {
					enabled: !isTranslated,
					title: isTranslated
						? translator("全文翻译 (已翻译)")
						: translator("全文翻译"),
				});
				browser.contextMenus.update(CONTEXT_MENU_IDS.RESTORE_ORIGINAL, {
					enabled: isTranslated,
					title: isTranslated
						? translator("撤销翻译")
						: translator("撤销翻译 (无翻译)"),
				});
			} catch (error) {
				console.error("Failed to update context menus:", error);
			}
		};

		browser.tabs.onActivated.addListener((activeInfo: any) => {
			updateContextMenus(activeInfo.tabId);
		});

		browser.tabs.onUpdated.addListener((tabId: any, changeInfo: any) => {
			if (changeInfo.status === "complete") {
				translationStateMap.set(tabId, false);
				updateContextMenus(tabId);
			}
		});

		browser.tabs.onRemoved.addListener((tabId: any) => {
			translationStateMap.delete(tabId);
		});

		browser.runtime.onMessage.addListener((message: any) => {
			return new Promise((resolve, reject) => {
				const run = async () => {
					if (message?.type === "openOptionsPage") {
						try {
							await browser.tabs.create({
								url: browser.runtime.getURL("/options.html?standalone=1"),
							});
						} catch {
							await browser.runtime.openOptionsPage();
						}
						resolve({ success: true });
						return;
					}

					if (message?.type === "mtranbrowser:get-fullpage-rule") {
						const { cache, sourceUrl } = await resolveRuleCacheForPage(
							message.ruleUrl,
						);
						resolve({
							rule:
								typeof message.url === "string"
									? matchSiteRule(message.url, cache?.rules || [])
									: null,
							sourceUrl,
							fetchedAt: cache?.fetchedAt ?? null,
						});
						return;
					}

					if (message?.type === "mtranbrowser:update-rule-source") {
						const sourceUrl = normalizeRuleUrl(message.url || "");
						if (!isValidRuleUrl(sourceUrl)) {
							throw new Error("规则地址无效");
						}
						const cache = await refreshRuleCache(sourceUrl, { force: true });
						if (!cache) {
							throw new Error("规则拉取失败");
						}
						resolve({
							success: true,
							sourceUrl,
							ruleCount: cache.rules.length,
							fetchedAt: cache.fetchedAt,
						});
						return;
					}

					if (message.type === "inputBoxTranslation") {
						const translatedText = await translateWithMicrosoftInBackground(
							message.text,
							message.targetLang,
						);
						resolve({ success: true, translatedText });
						return;
					}

					_service[config.service](message)
						.then((resp) => resolve(resp))
						.catch((error) => reject(error));
				};

				run().catch((error) => {
					resolve({
						success: false,
						error: error instanceof Error ? error.message : String(error),
					});
				});
			});
		});
	},
});
