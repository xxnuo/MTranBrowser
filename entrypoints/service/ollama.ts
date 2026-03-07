import { contentPostHandler } from "@/entrypoints/utils/check";
import { config } from "@/entrypoints/utils/config";
import { normalizeChatCompletionsUrl } from "@/entrypoints/utils/openaiCompat";
import { services } from "@/entrypoints/utils/option";
import { method } from "../utils/constant";
import { commonMsgTemplate } from "../utils/template";

async function ollama(message: any) {
	try {
		const headers = new Headers({
			"Content-Type": "application/json",
		});

		const token = config.token[services.ollama];
		if (token && token.trim() !== "") {
			headers.append("Authorization", `Bearer ${token.trim()}`);
		}

		const url = normalizeChatCompletionsUrl(config.ollamaUrl);
		if (!url) {
			throw new Error("Ollama地址未配置");
		}

		const resp = await fetch(url, {
			method: method.POST,
			headers,
			body: commonMsgTemplate(message.origin),
		});

		if (!resp.ok) {
			throw new Error(
				`翻译失败: ${resp.status} ${resp.statusText} body: ${await resp.text()}`,
			);
		}

		const result = await resp.json();
		if (result.choices && result.choices.length > 0) {
			return contentPostHandler(result.choices[0].message.content);
		}

		throw new Error("翻译失败: 上游未返回内容");
	} catch (error) {
		console.error("Ollama API调用失败:", error);
		throw error;
	}
}

export default ollama;
