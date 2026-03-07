import { contentPostHandler } from "@/entrypoints/utils/check";
import { config } from "@/entrypoints/utils/config";
import { services } from "@/entrypoints/utils/option";
import { method } from "../utils/constant";
import { commonMsgTemplate } from "../utils/template";

async function custom(message: any) {
	const headers = new Headers();
	headers.append("Content-Type", "application/json");
	headers.append("Authorization", `Bearer ${config.token[services.custom]}`);

	const resp = await fetch(config.custom, {
		method: method.POST,
		headers: headers,
		body: commonMsgTemplate(message.origin),
	});

	if (resp.ok) {
		const result = await resp.json();
		return contentPostHandler(result.choices[0].message.content);
	} else {
		console.log("翻译失败：", resp);
		throw new Error(
			`翻译失败: ${resp.status} ${resp.statusText} body: ${await resp.text()}`,
		);
	}
}

export default custom;
