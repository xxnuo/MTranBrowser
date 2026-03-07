import common from "@/entrypoints/service/common";
import coze from "@/entrypoints/service/coze";
import infini from "@/entrypoints/service/infini";
import minimax from "@/entrypoints/service/minimax";
import { services } from "../utils/option";
import azureOpenai from "./azure-openai";
import chromeTranslator from "./chrome-translator";
import claude from "./claude";
import custom from "./custom";
import deepl from "./deepl";
import deeplx from "./deeplx";
import deepseek from "./deepseek";
import gemini from "./gemini";
import google from "./google";
import hunyuanTranslation from "./hunyuan-translation";
import microsoft from "./microsoft";
import mtranserver from "./mtranserver";
import newapi from "./newapi";
import ollama from "./ollama";
import tencent from "./tencent";
import tongyi from "./tongyi";
import xiaoniu from "./xiaoniu";
import yiyan from "./yiyan";
import youdao from "./youdao";
import zhipu from "./zhipu";

type ServiceFunction = (message: any) => Promise<any>;
type ServiceMap = { [key: string]: ServiceFunction };

export const _service: ServiceMap = {
	[services.mtranServer]: mtranserver,
	[services.microsoft]: microsoft,
	[services.deepL]: deepl,
	[services.deeplx]: deeplx,
	[services.google]: google,
	[services.xiaoniu]: xiaoniu,
	[services.youdao]: youdao,
	[services.tencent]: tencent,
	[services.chromeTranslator]: chromeTranslator,

	// 大模型翻译
	[services.custom]: custom,
	[services.tongyi]: tongyi,
	[services.zhipu]: zhipu,
	[services.yiyan]: yiyan,
	[services.gemini]: gemini,
	[services.claude]: claude,
	[services.infini]: infini,
	[services.minimax]: minimax,
	[services.cozecom]: coze,
	[services.cozecn]: coze,
	[services.deepseek]: deepseek,
	[services.newapi]: newapi,
	[services.ollama]: ollama,
	// openai schema
	[services.openai]: common,
	[services.azureOpenai]: azureOpenai,
	[services.moonshot]: common,
	[services.baichuan]: common,
	[services.lingyi]: common,
	[services.jieyue]: common,
	[services.groq]: common,
	[services.huanYuan]: common,
	[services.huanYuanTranslation]: hunyuanTranslation,
	[services.doubao]: common,
	[services.siliconCloud]: common,
	[services.openrouter]: common,
	[services.grok]: common,
};
