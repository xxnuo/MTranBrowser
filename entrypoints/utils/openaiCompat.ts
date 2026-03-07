import { config } from "@/entrypoints/utils/config";
import { servicesType } from "@/entrypoints/utils/option";

type ReasoningEffortValue = "default" | "none" | "low" | "medium" | "high";

const validReasoningEffort = new Set<ReasoningEffortValue>([
	"default",
	"none",
	"low",
	"medium",
	"high",
]);

export function normalizeChatCompletionsUrl(rawUrl: string) {
	let url = (rawUrl || "").trim();
	if (!url) return "";

	if (url.endsWith("/")) {
		url = url.slice(0, -1);
	}

	if (url.endsWith("/chat/completions")) {
		return url;
	}

	if (url.endsWith("/v1")) {
		return `${url}/chat/completions`;
	}

	return `${url}/v1/chat/completions`;
}

export function getReasoningEffort(service: string): ReasoningEffortValue {
	const value = config.reasoningEffort?.[service];
	if (!value || !validReasoningEffort.has(value as ReasoningEffortValue)) {
		return "default";
	}
	return value as ReasoningEffortValue;
}

export function buildReasoningPayload(service: string): Record<string, any> {
	if (!servicesType.isOpenAICompatible(service)) {
		return {};
	}

	const reasoningEffort = getReasoningEffort(service);
	if (reasoningEffort === "default") {
		return {};
	}

	return { reasoning_effort: reasoningEffort };
}

export function parseOpenAIExtraParams(
	rawText?: string | null,
): Record<string, any> {
	const text = (rawText || "").trim();
	if (!text) {
		return {};
	}

	let parsed: any;
	try {
		parsed = JSON.parse(text);
	} catch (_error) {
		throw new Error("额外参数JSON格式错误");
	}

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error("额外参数必须是JSON对象");
	}

	return parsed;
}

export function getParsedOpenAIExtraParams(
	service: string,
): Record<string, any> {
	if (!servicesType.isOpenAICompatible(service)) {
		return {};
	}
	return parseOpenAIExtraParams(config.openaiExtraParams?.[service]);
}

export function mergeOpenAICompatPayload(
	basePayload: Record<string, any>,
	service: string,
): Record<string, any> {
	if (!servicesType.isOpenAICompatible(service)) {
		return basePayload;
	}

	return {
		...basePayload,
		...buildReasoningPayload(service),
		...getParsedOpenAIExtraParams(service),
	};
}
