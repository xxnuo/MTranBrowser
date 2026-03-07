import { defaultOption, services } from "./option";

interface IMapping {
	[key: string]: string;
}

interface IExtra {
	[key: string]: any;
}

export const DEFAULT_MIN_PARAGRAPH_CHARS = 5;
export const MIN_PARAGRAPH_CHARS_MIN = 1;
export const MIN_PARAGRAPH_CHARS_MAX = 3072;
export const DEFAULT_IMMERSIVE_SHORT_TEXT_THRESHOLD = 12;
export const IMMERSIVE_SHORT_TEXT_THRESHOLD_MIN = 1;
export const IMMERSIVE_SHORT_TEXT_THRESHOLD_MAX = 3072;

export class Config {
	on: boolean;
	autoTranslate: boolean;
	from: string;
	to: string;
	hotkey: string;
	style: number;
	display: number = 1;
	service: string;
	token: IMapping;
	ak: string;
	sk: string;
	appid: string;
	key: string;
	model: IMapping;
	customModel: IMapping;
	proxy: IMapping;
	custom: string;
	extra: IExtra;
	robot_id: IMapping;
	system_role: IMapping;
	user_role: IMapping;
	count: number;
	theme: string;
	uiLanguage: string;
	useCache: boolean;
	richTextTranslate: boolean;
	disableFloatingBall: boolean;
	floatingBallPosition: "left" | "right";
	floatingBallHotkey: string;
	customFloatingBallHotkey: string;
	customHotkey: string;
	disableSelectionTranslator: boolean;
	mtranServerUrl: string;
	deeplx: string;
	selectionTranslatorMode: string;
	newApiUrl: string;
	ollamaUrl: string;
	reasoningEffort: IMapping;
	openaiExtraParams: IMapping;
	maxConcurrentTranslations: number;
	youdaoAppKey: string;
	youdaoAppSecret: string;
	tencentSecretId: string;
	tencentSecretKey: string;
	azureOpenaiEndpoint: string;
	animations: boolean;
	inputBoxTranslationTrigger: string;
	inputBoxTranslationTarget: string;
	minParagraphChars: number;
	immersiveShortTextThreshold: number;

	constructor() {
		this.on = true;
		this.autoTranslate = false;
		this.from = defaultOption.from;
		this.to = defaultOption.to;
		this.style = defaultOption.style;
		this.display = defaultOption.display;
		this.hotkey = defaultOption.hotkey;
		this.service = defaultOption.service;
		this.token = {};
		this.ak = "";
		this.sk = "";
		this.appid = "";
		this.key = "";
		this.model = {};
		this.customModel = {};
		this.proxy = {};
		this.custom = defaultOption.custom;
		this.extra = {};
		this.robot_id = {};
		this.system_role = systemRoleFactory();
		this.user_role = userRoleFactory();
		this.count = 0;
		this.theme = "auto";
		this.uiLanguage = "auto";
		this.useCache = true;
		this.richTextTranslate = true;
		this.disableFloatingBall = false;
		this.floatingBallPosition = "right";
		this.floatingBallHotkey = "Alt+A";
		this.customFloatingBallHotkey = "";
		this.customHotkey = "";
		this.disableSelectionTranslator = false;
		this.mtranServerUrl = defaultOption.mtranServerUrl;
		this.deeplx = "";
		this.selectionTranslatorMode = "bilingual";
		this.newApiUrl = "http://localhost:3000";
		this.ollamaUrl = "http://localhost:11434";
		this.reasoningEffort = {};
		this.openaiExtraParams = {};
		this.maxConcurrentTranslations = 6;
		this.youdaoAppKey = "";
		this.youdaoAppSecret = "";
		this.tencentSecretId = "";
		this.tencentSecretKey = "";
		this.azureOpenaiEndpoint = "";
		this.animations = true;
		this.inputBoxTranslationTrigger = "disabled";
		this.inputBoxTranslationTarget = "en";
		this.minParagraphChars = DEFAULT_MIN_PARAGRAPH_CHARS;
		this.immersiveShortTextThreshold =
			DEFAULT_IMMERSIVE_SHORT_TEXT_THRESHOLD;
	}
}

export function normalizeConfig(input: unknown) {
	const next = new Config();
	if (typeof input !== "object" || input === null) {
		return next;
	}
	const source = input as Record<string, unknown>;
	const target = next as unknown as Record<string, unknown>;
	for (const key of Object.keys(next) as Array<keyof Config>) {
		const value = source[key as string];
		if (value !== undefined) {
			target[key as string] = value;
		}
	}
	return next;
}

function systemRoleFactory(): IMapping {
	const systems_role: IMapping = {};
	Object.keys(services).forEach((key) => {
		systems_role[key] = defaultOption.system_role;
	});
	return systems_role;
}

function userRoleFactory(): IMapping {
	const users_role: IMapping = {};
	Object.keys(services).forEach((key) => {
		users_role[key] = defaultOption.user_role;
	});
	return users_role;
}
