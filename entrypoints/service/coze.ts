import { config } from "@/entrypoints/utils/config";
import { cozeTemplate } from "@/entrypoints/utils/template";
import { method, urls } from "../utils/constant";

async function coze(message: any) {
	// 构建请求头
	const headers = new Headers();
	headers.append("Content-Type", "application/json");
	headers.append("Authorization", `Bearer ${config.token[config.service]}`);

	// 判断是否使用代理
	const url: string = config.proxy[config.service]
		? config.proxy[config.service]
		: urls[config.service];

	// 发起 fetch 请求
	const resp = await fetch(url, {
		method: method.POST,
		headers: headers,
		body: cozeTemplate(message.origin),
	});

	if (resp.ok) {
		const result = await resp.json();
		if (result.code === 0 && result.msg === "success") {
			console.log(result.messages[0]);
			return result.messages[0].content;
		} else {
			throw new Error(`请求失败: ${result.msg}`);
		}
	} else {
		console.log(resp);
		throw new Error(
			`请求失败: ${resp.status} ${resp.statusText} body: ${await resp.text()}`,
		);
	}
}

export default coze;
