import { storage } from "@wxt-dev/storage";
import { createTranslator } from "@/lib/i18n";
import { _service } from "@/entrypoints/service/_service";
import { config } from "@/entrypoints/utils/config";
import { CONTEXT_MENU_IDS } from "@/entrypoints/utils/constant";

const getT = () => createTranslator(config.uiLanguage);
const translationStateMap = new Map<number, boolean>();

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
		void storage.removeItem("local:fullPageRuleCache").catch(() => null);

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
