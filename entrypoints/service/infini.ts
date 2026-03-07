// 引入所需模块

import { config } from "@/entrypoints/utils/config";
import { commonMsgTemplate } from "@/entrypoints/utils/template";
import { method } from "../utils/constant";
import { customModelString, services } from "../utils/option";

async function infini(message: any) {
	// 构建请求头
	const headers = new Headers();
	headers.append("Content-Type", "application/json");
	headers.append("Authorization", `Bearer ${config.token[services.infini]}`);

	const model =
		config.model[services.infini] === customModelString
			? config.customModel[services.infini]
			: config.model[services.infini];

	// 发起 fetch 请求
	const resp = await fetch(
		`https://cloud.infini-ai.com/maas/${model}/nvidia/chat/completions`,
		{
			method: method.POST,
			headers: headers,
			body: commonMsgTemplate(message.origin),
		},
	);

	if (resp.ok) {
		const result = await resp.json();
		return result.choices[0].message.content;
	} else {
		console.error(resp);
		throw new Error(
			`请求失败: ${resp.status} ${resp.statusText} body: ${await resp.text()}`,
		);
	}
}

export default infini;
