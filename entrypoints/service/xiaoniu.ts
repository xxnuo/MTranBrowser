import { config } from "@/entrypoints/utils/config";
import { method, urls } from "../utils/constant";
import { services } from "../utils/option";

async function xiaoniu(message: any) {
	// 根据需要调整目标语言
	const targetLang = config.to === "zh-Hans" ? "zh" : config.to;

	// 判断是否使用代理
	const url: string = config.proxy[config.service]
		? config.proxy[config.service]
		: urls[services.xiaoniu];

	const resp = await fetch(url, {
		method: method.POST,
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: `from=auto&to=${targetLang}&apikey=${config.token[services.xiaoniu]}&src_text=${encodeURIComponent(message.origin)}`,
	});

	if (resp.ok) {
		const result = await resp.json();
		return result.tgt_text;
	} else {
		console.log(resp);
		throw new Error(
			`翻译失败: ${resp.status} ${resp.statusText} body: ${await resp.text()}`,
		);
	}
}

export default xiaoniu;
