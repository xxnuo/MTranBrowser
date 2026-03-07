import { config } from "@/entrypoints/utils/config";
import { method, urls } from "../utils/constant";
import { services } from "../utils/option";

function isHtmlContent(text: string) {
	return /<\/?[a-z][\s\S]*>/i.test(text);
}

function extractTranslatedText(payload: unknown): string | null {
	if (typeof payload === "string") {
		return payload;
	}

	if (Array.isArray(payload)) {
		for (const item of payload) {
			const text = extractTranslatedText(item);
			if (text) {
				return text;
			}
		}
		return null;
	}

	if (!payload || typeof payload !== "object") {
		return null;
	}

	const result = payload as Record<string, unknown>;
	for (const key of [
		"text",
		"translation",
		"translatedText",
		"targetText",
		"result",
		"data",
	]) {
		const value = result[key];
		if (typeof value === "string" && value.trim()) {
			return value;
		}
	}

	for (const key of ["translation", "result", "data", "translations", "texts"]) {
		const value = result[key];
		const text = extractTranslatedText(value);
		if (text) {
			return text;
		}
	}

	return null;
}

async function mtranserver(message: any) {
	const url = config.mtranServerUrl?.trim() || urls[services.mtranServer];
	const headers = new Headers({
		"Content-Type": "application/json",
	});
	const token = config.token[services.mtranServer]?.trim();

	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	const resp = await fetch(url, {
		method: method.POST,
		headers,
		body: JSON.stringify({
			from: config.from,
			to: config.to,
			text: message.origin,
			html: isHtmlContent(message.origin),
		}),
	});
	const raw = await resp.text();

	if (!resp.ok) {
		throw new Error(
			`MTranServer 翻译失败: ${resp.status} ${resp.statusText}${raw ? ` body: ${raw}` : ""}`,
		);
	}

	if (!raw.trim()) {
		throw new Error("MTranServer 翻译失败: 上游未返回内容");
	}

	try {
		const translatedText = extractTranslatedText(JSON.parse(raw));
		if (translatedText) {
			return translatedText;
		}
		throw new Error(`MTranServer 翻译失败: 返回格式异常 body: ${raw}`);
	} catch (error) {
		if (!(error instanceof SyntaxError)) {
			throw error;
		}
	}

	return raw;
}

export default mtranserver;
