export const DEFAULT_FULL_PAGE_RULE_URL =
	"https://fishjar.github.io/kiss-rules/kiss-rules.json";

export const FULL_PAGE_RULE_CACHE_KEY = "local:fullPageRuleCache";

export const FULL_PAGE_RULE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export type RuleAutoScan = "true" | "false";

export type NormalizedSiteRule = {
	pattern: string;
	selector: string;
	keepSelector: string;
	rootsSelector: string;
	ignoreSelector: string;
	autoScan: RuleAutoScan;
};

export type RemoteRuleCache = {
	url: string;
	fetchedAt: number;
	etag: string;
	lastModified: string;
	rules: NormalizedSiteRule[];
};

export type FullPageRuleMatchResponse = {
	rule: NormalizedSiteRule | null;
	sourceUrl: string;
	fetchedAt: number | null;
};

function isAllChar(source: string, char: string, index = 0) {
	while (index < source.length) {
		if (source[index] !== char) {
			return false;
		}
		index++;
	}
	return true;
}

function isPatternMatch(source: string, pattern: string) {
	if (!source.length || !pattern.length) {
		return false;
	}

	let matchPattern = `*${pattern}*`;
	let sourceIndex = 0;
	let patternIndex = 0;
	let sourceRecord = -1;
	let patternRecord = -1;

	while (sourceIndex < source.length && patternRecord < matchPattern.length) {
		if (matchPattern[patternIndex] === "*") {
			patternIndex++;
			sourceRecord = sourceIndex;
			patternRecord = patternIndex;
		} else if (source[sourceIndex] === matchPattern[patternIndex]) {
			sourceIndex++;
			patternIndex++;
		} else if (sourceRecord + 1 < source.length) {
			sourceRecord++;
			sourceIndex = sourceRecord;
			patternIndex = patternRecord;
		} else {
			return false;
		}
	}

	if (matchPattern.length === patternIndex) {
		return true;
	}

	return isAllChar(matchPattern, "*", patternIndex);
}

export function normalizeRuleUrl(url: string) {
	return url.trim();
}

export function isValidRuleUrl(url: string) {
	try {
		const target = new URL(normalizeRuleUrl(url));
		return target.protocol === "http:" || target.protocol === "https:";
	} catch {
		return false;
	}
}

function normalizeSelector(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeAutoScan(value: unknown, hasSelector: boolean): RuleAutoScan {
	if (typeof value === "string") {
		const next = value.trim();
		if (next === "false") {
			return "false";
		}
		if (next === "true") {
			return "true";
		}
	}
	return hasSelector ? "false" : "true";
}

function normalizeRule(rawRule: unknown): NormalizedSiteRule | null {
	if (!rawRule || typeof rawRule !== "object") {
		return null;
	}

	const rawPattern = typeof (rawRule as any).pattern === "string"
		? (rawRule as any).pattern.trim()
		: "";

	if (!rawPattern || rawPattern === "*") {
		return null;
	}

	const selector = normalizeSelector((rawRule as any).selector);
	const keepSelector = normalizeSelector((rawRule as any).keepSelector);
	const rootsSelector = normalizeSelector((rawRule as any).rootsSelector);
	const ignoreSelector = normalizeSelector((rawRule as any).ignoreSelector);
	const autoScan = normalizeAutoScan((rawRule as any).autoScan, !!selector);

	if (!selector && !rootsSelector && !ignoreSelector && autoScan !== "true") {
		return null;
	}

	return {
		pattern: rawPattern,
		selector,
		keepSelector,
		rootsSelector,
		ignoreSelector,
		autoScan,
	};
}

export function normalizeRemoteRules(input: unknown) {
	if (!Array.isArray(input)) {
		throw new Error("规则格式错误");
	}

	const seen = new Set<string>();
	const normalized: NormalizedSiteRule[] = [];

	for (const rawRule of input) {
		const rule = normalizeRule(rawRule);
		if (!rule || seen.has(rule.pattern)) {
			continue;
		}
		seen.add(rule.pattern);
		normalized.push(rule);
	}

	if (!normalized.length) {
		throw new Error("规则列表为空");
	}

	return normalized;
}

export function matchSiteRule(url: string, rules: NormalizedSiteRule[]) {
	for (const rule of rules) {
		const patterns = rule.pattern
			.split(/\n|,/) 
			.map((item) => item.trim())
			.filter(Boolean);

		if (patterns.some((pattern) => isPatternMatch(url, pattern))) {
			return rule;
		}
	}

	return null;
}

export function isRuleCacheFresh(cache: RemoteRuleCache | null, url: string) {
	if (!cache) {
		return false;
	}

	return (
		cache.url === normalizeRuleUrl(url) &&
		Date.now() - cache.fetchedAt < FULL_PAGE_RULE_CACHE_MAX_AGE
	);
}
