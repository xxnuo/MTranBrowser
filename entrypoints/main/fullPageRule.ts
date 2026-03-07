import { LLMStandardHTML, grabAllNode } from "@/entrypoints/main/dom";
import type {
	FullPageRuleMatchResponse,
	NormalizedSiteRule,
} from "@/entrypoints/utils/fullPageRule";

const PLACEHOLDER_ATTR = "data-fr-keep-id";

type ProtectedEntry = {
	id: string;
	token: string;
	html: string;
};

export type ActiveFullPageRuleContext = FullPageRuleMatchResponse;

export type RuleNodePayload = {
	bilingualSource: string;
	machineSource: string;
	aiSource: string;
	restoreHtml: (translatedHtml: string) => string | null;
};

function querySelectorAllSafe(root: ParentNode, selector: string) {
	return Array.from(root.querySelectorAll(selector)) as Element[];
}

function matchesSafe(node: Element, selector: string) {
	return node.matches(selector);
}

function closestSafe(node: Element, selector: string) {
	return node.closest(selector);
}

function sortByDocumentOrder(nodes: Element[]) {
	return [...nodes].sort((left, right) => {
		if (left === right) {
			return 0;
		}
		const relation = left.compareDocumentPosition(right);
		if (relation & Node.DOCUMENT_POSITION_FOLLOWING) {
			return -1;
		}
		if (relation & Node.DOCUMENT_POSITION_PRECEDING) {
			return 1;
		}
		return 0;
	});
}

function filterMostSpecificNodes(nodes: Element[]) {
	const unique = Array.from(new Set(nodes));
	return sortByDocumentOrder(
		unique.filter(
			(node) => !unique.some((other) => other !== node && node.contains(other)),
		),
	);
}

function collectRuleRoots(rootNode: ParentNode, rule: NormalizedSiteRule) {
	if (!rule.rootsSelector) {
		return [rootNode];
	}

	const scopes = new Set<ParentNode>();
	if (rootNode instanceof Element) {
		if (matchesSafe(rootNode, rule.rootsSelector)) {
			scopes.add(rootNode);
		}
		if (closestSafe(rootNode, rule.rootsSelector)) {
			scopes.add(rootNode);
		}
	}
	for (const matchedRoot of querySelectorAllSafe(
		rootNode,
		rule.rootsSelector,
	)) {
		scopes.add(matchedRoot);
	}
	return Array.from(scopes);
}

function collectExplicitNodes(scopes: ParentNode[], selector: string) {
	const nodes: Element[] = [];
	for (const scope of scopes) {
		if (scope instanceof Element && matchesSafe(scope, selector)) {
			nodes.push(scope);
		}
		nodes.push(...querySelectorAllSafe(scope, selector));
	}
	return nodes;
}

function filterIgnoredNodes(nodes: Element[], rule: NormalizedSiteRule) {
	if (!rule.ignoreSelector) {
		return nodes;
	}
	return nodes.filter((node) => !closestSafe(node, rule.ignoreSelector));
}

export function collectRuleMatchedNodes(
	rootNode: ParentNode,
	rule: NormalizedSiteRule,
) {
	const scopes = collectRuleRoots(rootNode, rule);
	if (!scopes.length) {
		return [];
	}

	const nodes: Element[] = [];
	if (rule.selector) {
		nodes.push(...collectExplicitNodes(scopes, rule.selector));
	}
	if (!rule.selector || rule.autoScan === "true") {
		for (const scope of scopes) {
			nodes.push(...grabAllNode(scope as Node));
		}
	}
	return filterMostSpecificNodes(filterIgnoredNodes(nodes, rule));
}

function restoreProtectedHtml(html: string, entries: ProtectedEntry[]) {
	let nextHtml = html;
	const tokenMatches = new Set<string>();
	for (const entry of entries) {
		if (nextHtml.includes(entry.token)) {
			tokenMatches.add(entry.id);
			nextHtml = nextHtml.split(entry.token).join(entry.html);
		}
	}

	const container = document.createElement("div");
	container.innerHTML = nextHtml;
	const restoredIds = new Set<string>(tokenMatches);
	for (const entry of entries) {
		const placeholders = Array.from(
			container.querySelectorAll(`[${PLACEHOLDER_ATTR}="${entry.id}"]`),
		);
		if (!placeholders.length) {
			continue;
		}
		restoredIds.add(entry.id);
		for (const placeholder of placeholders) {
			const template = document.createElement("template");
			template.innerHTML = entry.html;
			placeholder.replaceWith(template.content.cloneNode(true));
		}
	}
	if (restoredIds.size !== entries.length) {
		return null;
	}
	return container.innerHTML;
}

function createProtectedClone(node: Element, keepSelector: string) {
	const clonedNode = node.cloneNode(true) as Element;
	if (!keepSelector) {
		return {
			node: clonedNode,
			restoreHtml: (translatedHtml: string) => translatedHtml,
		};
	}
	let protectedNodes: Element[] = [];
	try {
		protectedNodes = querySelectorAllSafe(clonedNode, keepSelector);
	} catch {
		return {
			node: clonedNode,
			restoreHtml: (translatedHtml: string) => translatedHtml,
		};
	}
	if (!protectedNodes.length) {
		return {
			node: clonedNode,
			restoreHtml: (translatedHtml: string) => translatedHtml,
		};
	}
	const entries: ProtectedEntry[] = [];
	protectedNodes.forEach((protectedNode, index) => {
		const id = `fr-keep-${index}`;
		const token = `__FR_KEEP_${index}__`;
		entries.push({
			id,
			token,
			html: protectedNode.outerHTML,
		});
		const placeholder = document.createElement("span");
		placeholder.setAttribute(PLACEHOLDER_ATTR, id);
		placeholder.textContent = token;
		protectedNode.replaceWith(placeholder);
	});
	return {
		node: clonedNode,
		restoreHtml: (translatedHtml: string) =>
			restoreProtectedHtml(translatedHtml, entries),
	};
}

export function createRuleNodePayload(
	node: Element,
	rule: NormalizedSiteRule | null,
): RuleNodePayload {
	const protectedClone = createProtectedClone(node, rule?.keepSelector || "");
	return {
		bilingualSource: protectedClone.node.textContent?.trim() || "",
		machineSource: protectedClone.node.innerHTML,
		aiSource: LLMStandardHTML(protectedClone.node),
		restoreHtml: protectedClone.restoreHtml,
	};
}
