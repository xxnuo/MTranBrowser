import { createTranslator } from "@/lib/i18n";
import { config } from "@/entrypoints/utils/config";
import { parseOpenAIExtraParams } from "@/entrypoints/utils/openaiCompat";
import { customModelString, services, servicesType } from "./option";
import { sendErrorMessage } from "./tip";

export function checkConfig(): boolean {
	const t = createTranslator(config.uiLanguage);
	// 1. Check if the plugin is enabled
	if (!config.on) return false;

	// 2. Check if the token is provided for services that require it
	if (
		servicesType.isUseToken(config.service) &&
		!config.token[config.service]
	) {
		if (
			config.service === services.mtranServer ||
			config.service === services.deeplx ||
			config.service === services.ollama
		) {
		} else {
			sendErrorMessage(t("令牌尚未配置，请前往设置页配置"));
			return false;
		}
	}
	if (config.service === services.yiyan && (!config.ak || !config.sk)) {
		sendErrorMessage(t("令牌尚未配置，请前往设置页配置"));
		return false;
	}

	if (
		config.service === services.tencent &&
		(!config.tencentSecretId || !config.tencentSecretKey)
	) {
		sendErrorMessage(
			t("腾讯云机器翻译密钥尚未配置，请前往设置页配置SecretId和SecretKey"),
		);
		return false;
	}

	if (
		servicesType.isAI(config.service) &&
		![services.cozecn, services.cozecom].includes(config.service)
	) {
		const model = config.model[config.service];
		const customModel = config.customModel[config.service];
		if (!model || (model === customModelString && !customModel)) {
			sendErrorMessage(t("模型尚未配置，请前往设置页配置"));
			return false;
		}
	}

	if (config.display === 0 && config.service === services.google) {
		sendErrorMessage(t("「谷歌翻译」仅支持双语模式，请切换翻译服务"));
		return false;
	}

	if (servicesType.isOpenAICompatible(config.service)) {
		try {
			parseOpenAIExtraParams(config.openaiExtraParams?.[config.service]);
		} catch (error) {
			sendErrorMessage(t((error as Error)?.message || "额外参数配置错误"));
			return false;
		}
	}

	return true;
}

export function skipNode(node: Node): boolean {
	return (
		!node ||
		!node.textContent?.trim() ||
		hasLoadingSpinner(node) ||
		hasRetryTag(node)
	);
}

export function hasLoadingSpinner(node: Node): boolean {
	if (node.nodeType === Node.TEXT_NODE) return false;

	if (node instanceof Element && node.classList.contains("fluent-read-loading"))
		return true;

	if (node instanceof Element) {
		return Array.from(node.children).some((child) => hasLoadingSpinner(child));
	}

	return false;
}

export function hasRetryTag(node: Node): boolean {
	if (node.nodeType === Node.TEXT_NODE) return false;

	if (node instanceof Element && node.classList.contains("fluent-read-failure"))
		return true;

	if (node instanceof Element) {
		return Array.from(node.children).some((child) => hasRetryTag(child));
	}

	return false;
}

export function searchClassName(node: Node, className: string): Node | null {
	if (node instanceof Element && node.classList.contains(className))
		return node;

	if (node instanceof Element) {
		for (const child of node.children) {
			const result = searchClassName(child, className);
			if (result) return result;
		}
	}

	return null;
}

export function contentPostHandler(text: string) {
	let content = text;
	content = content.replace(/^<think>[\s\S]*?<\/think>/, "");
	return content;
}
