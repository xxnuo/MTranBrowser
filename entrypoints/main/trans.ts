import { storage } from "@wxt-dev/storage";
import { getMainDomain, replaceCompatFn } from "@/entrypoints/main/compat";
import {
	beautyHTML,
	grabAllNode,
	grabNode,
	LLMStandardHTML,
	smashTruncationStyle,
} from "@/entrypoints/main/dom";
import { detectlang, throttle } from "@/entrypoints/utils/common";
import { config } from "@/entrypoints/utils/config";
import { styles } from "@/entrypoints/utils/constant";
import {
	cancelAllTranslations,
	translateText,
} from "@/entrypoints/utils/translateApi";
import { cache } from "../utils/cache";
import { checkConfig, searchClassName, skipNode } from "../utils/check";
import { insertFailedTip, insertLoadingSpinner } from "../utils/icon";
import { options, servicesType } from "../utils/option";

let hoverTimer: any;
const htmlSet = new Set<string>();
export const originalContents = new Map<string, string>();
let isAutoTranslating = false;
let isPreparingAutoTranslation = false;
let observer: IntersectionObserver | null = null;
let mutationObserver: MutationObserver | null = null;

const TRANSLATED_ATTR = "data-fr-translated";
const TRANSLATED_ID_ATTR = "data-fr-node-id";

let nodeIdCounter = 0;

function clearPendingHtml(nodeOuterHTML: string) {
	htmlSet.delete(nodeOuterHTML);
}

function collectMutationTargets(rootNode: Element) {
	return grabAllNode(rootNode).filter(
		(node) => !node.hasAttribute(TRANSLATED_ATTR),
	);
}

export function restoreOriginalContent() {
	cancelAllTranslations();
	for (const node of document.querySelectorAll(`[${TRANSLATED_ATTR}="true"]`)) {
		const nodeId = node.getAttribute(TRANSLATED_ID_ATTR);
		if (nodeId && originalContents.has(nodeId)) {
			node.innerHTML = originalContents.get(nodeId) || "";
			node.removeAttribute(TRANSLATED_ATTR);
			node.removeAttribute(TRANSLATED_ID_ATTR);
			node.classList.remove("fluent-read-bilingual");
		}
	}
	for (const element of document.querySelectorAll(
		".fluent-read-bilingual-content",
	)) {
		element.remove();
	}
	for (const element of document.querySelectorAll(
		".fluent-read-loading, .fluent-read-retry-wrapper",
	)) {
		element.remove();
	}
	originalContents.clear();
	if (observer) {
		observer.disconnect();
		observer = null;
	}
	if (mutationObserver) {
		mutationObserver.disconnect();
		mutationObserver = null;
	}
	isAutoTranslating = false;
	isPreparingAutoTranslation = false;
	htmlSet.clear();
	nodeIdCounter = 0;
	for (const element of document.querySelectorAll(
		"style[data-fr-temp-style]",
	)) {
		element.remove();
	}
}

export async function autoTranslateEnglishPage() {
	if (isAutoTranslating || isPreparingAutoTranslation) {
		return;
	}
	isPreparingAutoTranslation = true;
	try {
		const nodes = grabAllNode(document.body);
		if (!nodes.length) {
			return;
		}
		isAutoTranslating = true;
		observer = new IntersectionObserver(
			(entries, currentObserver) => {
				for (const entry of entries) {
					if (!entry.isIntersecting || !isAutoTranslating) {
						continue;
					}
					const node = entry.target as Element;
					if (node.hasAttribute(TRANSLATED_ATTR)) {
						continue;
					}
					const nodeId = `fr-node-${nodeIdCounter++}`;
					node.setAttribute(TRANSLATED_ID_ATTR, nodeId);
					originalContents.set(nodeId, node.innerHTML);
					node.setAttribute(TRANSLATED_ATTR, "true");
					if (config.display === styles.bilingualTranslation) {
						handleBilingualTranslation(node, false);
					} else {
						handleSingleTranslation(node, false);
					}
					currentObserver.unobserve(node);
				}
			},
			{
				root: null,
				rootMargin: "50px",
				threshold: 0.1,
			},
		);
		for (const node of nodes) {
			observer.observe(node);
		}
		mutationObserver = new MutationObserver((mutations) => {
			if (!isAutoTranslating) {
				return;
			}
			for (const mutation of mutations) {
				for (const addedNode of mutation.addedNodes) {
					if (addedNode.nodeType !== 1) {
						continue;
					}
					for (const node of collectMutationTargets(addedNode as Element)) {
						observer?.observe(node);
					}
				}
			}
		});
		mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});
	} finally {
		isPreparingAutoTranslation = false;
	}
}

export function handleTranslation(
	mouseX: number,
	mouseY: number,
	delayTime: number = 0,
) {
	if (!checkConfig()) {
		return;
	}
	clearTimeout(hoverTimer);
	hoverTimer = setTimeout(() => {
		const node = grabNode(document.elementFromPoint(mouseX, mouseY));
		if (skipNode(node)) {
			return;
		}
		const nodeOuterHTML = node.outerHTML;
		if (htmlSet.has(nodeOuterHTML)) {
			return;
		}
		htmlSet.add(nodeOuterHTML);
		if (config.display === styles.bilingualTranslation) {
			handleBilingualTranslation(node, delayTime > 0);
		} else {
			handleSingleTranslation(node, delayTime > 0);
		}
	}, delayTime);
}

export function handleBilingualTranslation(node: Element, slide: boolean) {
	const nodeOuterHTML = node.outerHTML;
	const bilingualNode = searchClassName(node, "fluent-read-bilingual");
	if (bilingualNode) {
		if (slide) {
			clearPendingHtml(nodeOuterHTML);
			return;
		}
		const spinner = insertLoadingSpinner(bilingualNode as HTMLElement, true);
		setTimeout(() => {
			spinner.remove();
			const content = searchClassName(
				bilingualNode as HTMLElement,
				"fluent-read-bilingual-content",
			);
			if (content && content instanceof HTMLElement) {
				content.remove();
			}
			(bilingualNode as HTMLElement).classList.remove("fluent-read-bilingual");
			clearPendingHtml(nodeOuterHTML);
		}, 250);
		return;
	}
	const cacheKey = node.textContent || "";
	if (cacheKey) {
		const cached = cache.localGet(cacheKey);
		if (cached) {
			const spinner = insertLoadingSpinner(node as HTMLElement, true);
			setTimeout(() => {
				spinner.remove();
				clearPendingHtml(nodeOuterHTML);
				bilingualAppendChild(node as HTMLElement, cached);
			}, 250);
			return;
		}
	}
	bilingualTranslate(node, nodeOuterHTML);
}

export function handleSingleTranslation(node: Element, _slide: boolean) {
	const nodeOuterHTML = node.outerHTML;
	const outerHTMLCache = cache.localGet(node.outerHTML);
	if (outerHTMLCache) {
		const spinner = insertLoadingSpinner(node as HTMLElement, true);
		setTimeout(() => {
			spinner.remove();
			clearPendingHtml(nodeOuterHTML);
			const fn = replaceCompatFn[getMainDomain(document.location.hostname)];
			if (fn) {
				fn(node, outerHTMLCache);
			} else {
				node.outerHTML = outerHTMLCache;
			}
		}, 250);
		return;
	}
	singleTranslate(node);
}

function bilingualTranslate(node: Element, nodeOuterHTML: string) {
	const origin = node.textContent || "";
	if (!origin) {
		clearPendingHtml(nodeOuterHTML);
		return;
	}
	if (detectlang(origin.replace(/[\s\u3000]/g, "")) === config.to) {
		clearPendingHtml(nodeOuterHTML);
		return;
	}
	const spinner = insertLoadingSpinner(node as HTMLElement);
	translateText(origin, document.title)
		.then((text: string) => {
			spinner.remove();
			clearPendingHtml(nodeOuterHTML);
			if (!text || text === origin) {
				return;
			}
			bilingualAppendChild(node as HTMLElement, text);
		})
		.catch((error: Error) => {
			spinner.remove();
			clearPendingHtml(nodeOuterHTML);
			insertFailedTip(
				node as HTMLElement,
				error.toString() || "翻译失败",
				spinner,
			);
		});
}

export function singleTranslate(node: Element) {
	const plainText = node.textContent || "";
	if (!plainText) {
		clearPendingHtml(node.outerHTML);
		return;
	}
	if (detectlang(plainText.replace(/[\s\u3000]/g, "")) === config.to) {
		clearPendingHtml(node.outerHTML);
		return;
	}
	const origin = servicesType.isMachine(config.service)
		? node.innerHTML
		: LLMStandardHTML(node);
	if (!origin) {
		clearPendingHtml(node.outerHTML);
		return;
	}
	const oldOuterHtml = node.outerHTML;
	const spinner = insertLoadingSpinner(node as HTMLElement);
	translateText(origin, document.title)
		.then((text: string) => {
			spinner.remove();
			clearPendingHtml(oldOuterHtml);
			text = beautyHTML(text);
			if (!text || node.innerHTML === text) {
				return;
			}
			node.innerHTML = text;
			const newOuterHtml = node.outerHTML;
			cache.localSetDual(oldOuterHtml, newOuterHtml);
			cache.set(htmlSet, newOuterHtml, 250);
		})
		.catch((error: Error) => {
			spinner.remove();
			clearPendingHtml(oldOuterHtml);
			insertFailedTip(
				node as HTMLElement,
				error.toString() || "翻译失败",
				spinner,
			);
		});
}

export const handleBtnTranslation = throttle((node: any) => {
	const origin = node.innerText;
	const rs = cache.localGet(origin);
	if (rs) {
		node.innerText = rs;
		return;
	}
	config.count++ && storage.setItem("local:config", JSON.stringify(config));
	browser.runtime
		.sendMessage({ context: document.title, origin })
		.then((text: string) => {
			cache.localSetDual(origin, text);
			node.innerText = text;
		})
		.catch((error: any) => console.error("调用失败:", error));
}, 250);

function bilingualAppendChild(node: HTMLElement, text: string) {
	node.classList.add("fluent-read-bilingual");
	const newNode = document.createElement("span");
	newNode.classList.add("fluent-read-bilingual-content");
	const style = options.styles.find(
		(item) => item.value === config.style && !item.disabled,
	);
	if (style?.class) {
		newNode.classList.add(style.class);
	}
	newNode.append(text);
	smashTruncationStyle(node);
	node.appendChild(newNode);
}
