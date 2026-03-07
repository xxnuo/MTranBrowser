import { storage } from "@wxt-dev/storage";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import browser from "webextension-polyfill";
import CustomHotkeyInput from "@/components/CustomHotkeyInput";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getUiLanguageOptions, localizeOptions } from "@/lib/i18n";
import { useConfig } from "@/entrypoints/ui/hooks/useConfig";
import { useI18n } from "@/entrypoints/ui/i18n/I18nProvider";
import { useTheme } from "@/entrypoints/ui/hooks/useTheme";
import { broadcastMessage } from "@/entrypoints/ui/services/messages";
import {
	toastError,
	toastSuccess,
	toastWarning,
} from "@/entrypoints/ui/services/toast";
import { parseHotkey } from "@/entrypoints/utils/hotkey";
import { parseOpenAIExtraParams } from "@/entrypoints/utils/openaiCompat";
import { DEFAULT_FULL_PAGE_RULE_URL } from "@/entrypoints/utils/fullPageRule";
import {
	customModelString,
	defaultOption,
	models,
	options,
	services,
	servicesType,
} from "@/entrypoints/utils/option";

type TabKey = "basic" | "features" | "service" | "advanced";

function Tabs({
	value,
	tabs,
	onChange,
}: {
	value: TabKey;
	tabs: Array<{ key: TabKey; label: string }>;
	onChange: (value: TabKey) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
			{tabs.map((tab) => (
				<Button
					key={tab.key}
					variant={value === tab.key ? "default" : "outline"}
					onClick={() => onChange(tab.key)}
				>
					{tab.label}
				</Button>
			))}
		</div>
	);
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid grid-cols-1 items-center gap-2 rounded-lg border bg-background px-3 py-2 md:grid-cols-[220px_1fr]">
			<div className="text-sm text-foreground">{label}</div>
			<div>{children}</div>
		</div>
	);
}

function toSelectOptions(list: any[]) {
	return list.map((item: any) => ({
		value: item.value,
		label: item.label,
		disabled: !!item.disabled,
	}));
}

export default function Main() {
	const { config, updateConfig, loaded } = useConfig();
	const { t } = useI18n();
	useTheme(config.theme || "auto");

	const [activeTab, setActiveTab] = useState<TabKey>("basic");
	const [showCustomHotkeyDialog, setShowCustomHotkeyDialog] = useState(false);
	const [showCustomMouseHotkeyDialog, setShowCustomMouseHotkeyDialog] =
		useState(false);
	const [showExportBox, setShowExportBox] = useState(false);
	const [exportData, setExportData] = useState("");
	const [showImportBox, setShowImportBox] = useState(false);
	const [importData, setImportData] = useState("");
	const [ruleUrlDraft, setRuleUrlDraft] = useState(DEFAULT_FULL_PAGE_RULE_URL);

	const localizedOptions = useMemo(() => localizeOptions(options, t), [t]);
	const uiLanguageOptions = useMemo(() => getUiLanguageOptions(t), [t]);
	const tabs = useMemo<Array<{ key: TabKey; label: string }>>(
		() => [
			{ key: "basic", label: t("基础设置") },
			{ key: "features", label: t("翻译功能") },
			{ key: "service", label: t("服务配置") },
			{ key: "advanced", label: t("高级与配置管理") },
		],
		[t],
	);

	useEffect(() => {
		if (!loaded) {
			return;
		}
		setRuleUrlDraft(config.fullPageRuleUrl || DEFAULT_FULL_PAGE_RULE_URL);
	}, [config.fullPageRuleUrl, loaded]);

	useEffect(() => {
		if (!loaded) {
			return;
		}
		if (!servicesType.isOpenAICompatible(config.service)) {
			return;
		}
		if (!config.reasoningEffort) {
			updateConfig((draft) => {
				draft.reasoningEffort = {};
			});
			return;
		}
		if (!config.openaiExtraParams) {
			updateConfig((draft) => {
				draft.openaiExtraParams = {};
			});
			return;
		}
		if (!config.reasoningEffort[config.service]) {
			updateConfig((draft) => {
				draft.reasoningEffort[config.service] = "default";
			});
		}
		if (config.openaiExtraParams[config.service] === undefined) {
			updateConfig((draft) => {
				draft.openaiExtraParams[config.service] = "";
			});
		}
	}, [
		config.openaiExtraParams,
		config.reasoningEffort,
		config.service,
		loaded,
		updateConfig,
	]);

	useEffect(() => {
		if (!loaded) {
			return;
		}
		broadcastMessage({
			type: "updateSelectionTranslatorMode",
			mode: config.selectionTranslatorMode,
		}).catch(() => {});
	}, [config.selectionTranslatorMode, loaded]);

	const styleGroups = useMemo(() => {
		const groups = localizedOptions.styles.filter((item: any) => item.disabled);
		return groups.map((group: any) => ({
			...group,
			options: localizedOptions.styles.filter(
				(item: any) => !item.disabled && item.group === group.value,
			),
		}));
	}, [localizedOptions.styles]);

	const filteredServices = useMemo(
		() =>
			localizedOptions.services.filter(
				(item: any) =>
					!(item.value === services.google && Number(config.display) !== 1),
			),
		[config.display, localizedOptions.services],
	);

	const showAI = servicesType.isAI(config.service);
	const showProxy = servicesType.isUseProxy(config.service);
	const showModel = servicesType.isUseModel(config.service);
	const showToken = servicesType.isUseToken(config.service);
	const showAkSk = servicesType.isUseAkSk(config.service);
	const showYoudao = servicesType.isYoudao(config.service);
	const showTencent = servicesType.isTencent(config.service);
	const showCustom = servicesType.isCustom(config.service);
	const showMTranServerUrl = config.service === services.mtranServer;
	const showDeepLX = config.service === services.deeplx;
	const showCustomModel =
		servicesType.isAI(config.service) &&
		config.model[config.service] === customModelString;
	const showRobotId = servicesType.isCoze(config.service);
	const showNewAPI = servicesType.isNewApi(config.service);
	const showAzureOpenaiEndpoint = servicesType.isAzureOpenai(config.service);
	const showOllamaUrl = servicesType.isOllama(config.service);
	const showOpenAICompatible = servicesType.isOpenAICompatible(config.service);
	const serviceModels = models.get(config.service) || [];

	const floatingBallEnabled = !config.disableFloatingBall && config.on;

	const handlePluginStateChange = async (val: boolean) => {
		updateConfig((draft) => {
			draft.on = val;
			if (!val) {
				draft.disableFloatingBall = true;
				draft.selectionTranslatorMode = "disabled";
			}
		});
		if (!val) {
			await broadcastMessage({
				type: "toggleFloatingBall",
				isEnabled: false,
			});
			await broadcastMessage({
				type: "updateSelectionTranslatorMode",
				mode: "disabled",
			});
		}
	};

	const handleFloatingBallChange = async (enabled: boolean) => {
		updateConfig((draft) => {
			draft.disableFloatingBall = !enabled;
		});
		await broadcastMessage({
			type: "toggleFloatingBall",
			isEnabled: enabled,
		});
	};

	const handleSelectionModeChange = (mode: string) => {
		updateConfig((draft) => {
			draft.selectionTranslatorMode = mode;
		});
	};

	const resetTemplate = () => {
		const ok = window.confirm(
			t("确定要恢复默认的 system 和 user 模板吗？此操作将覆盖当前模板。"),
		);
		if (!ok) {
			return;
		}
		updateConfig((draft) => {
			draft.system_role[draft.service] = defaultOption.system_role;
			draft.user_role[draft.service] = defaultOption.user_role;
		});
		toastSuccess(t("已恢复默认翻译模板"));
	};

	const handleHotkeyChange = (value: string) => {
		updateConfig((draft) => {
			draft.floatingBallHotkey = value;
		});
		if (value === "custom" && !config.customFloatingBallHotkey) {
			setShowCustomHotkeyDialog(true);
		}
	};

	const handleMouseHotkeyChange = (value: string) => {
		updateConfig((draft) => {
			draft.hotkey = value;
		});
		if (value === "custom" && !config.customHotkey) {
			setShowCustomMouseHotkeyDialog(true);
		}
	};

	const handleCustomHotkeyConfirm = (hotkey: string) => {
		updateConfig((draft) => {
			draft.customFloatingBallHotkey = hotkey;
			draft.floatingBallHotkey = "custom";
		});
		toastSuccess(
			hotkey === "none"
				? t("已禁用快捷键")
				: t("快捷键已设置为: {hotkey}", {
						hotkey: hotkeyDisplayName(hotkey, t),
					}),
		);
	};

	const handleCustomMouseHotkeyConfirm = (hotkey: string) => {
		updateConfig((draft) => {
			draft.customHotkey = hotkey;
			draft.hotkey = "custom";
		});
		toastSuccess(
			hotkey === "none"
				? t("已禁用快捷键")
				: t("快捷键已设置为: {hotkey}", {
						hotkey: hotkeyDisplayName(hotkey, t),
					}),
		);
	};

	const handleCustomHotkeyCancel = () => {
		if (!config.customFloatingBallHotkey) {
			updateConfig((draft) => {
				draft.floatingBallHotkey = "Alt+A";
			});
		}
	};

	const handleCustomMouseHotkeyCancel = () => {
		if (!config.customHotkey) {
			updateConfig((draft) => {
				draft.hotkey = "Control";
			});
		}
	};

	const handleConcurrentChange = (value: string) => {
		const next = Number(value);
		if (!Number.isFinite(next) || next < 1 || next > 100) {
			updateConfig((draft) => {
				draft.maxConcurrentTranslations = 6;
			});
			toastWarning(t("并发数量必须在 1-100 之间"));
			return;
		}
		updateConfig((draft) => {
			draft.maxConcurrentTranslations = next;
		});
		toastSuccess(t("并发数量已更新为 {count}", { count: next }));
	};

	const saveRuleUrl = async (nextUrl: string, successMessage?: string) => {
		try {
			const response = (await browser.runtime.sendMessage({
				type: "mtranbrowser:update-rule-source",
				url: nextUrl,
			})) as any;
			if (!response?.success) {
				throw new Error(response?.error || t("规则地址校验失败"));
			}
			const sourceUrl = response.sourceUrl || nextUrl;
			updateConfig((draft) => {
				draft.fullPageRuleUrl = sourceUrl;
			});
			setRuleUrlDraft(sourceUrl);
			toastSuccess(successMessage || t("规则地址已保存"));
			return true;
		} catch (error) {
			toastError(
				error instanceof Error ? error.message : t("规则地址校验失败"),
			);
			return false;
		}
	};

	const handleSaveRuleUrl = async () => {
		const nextUrl = ruleUrlDraft.trim();
		if (!nextUrl) {
			toastError(t("规则地址不能为空"));
			return;
		}
		await saveRuleUrl(nextUrl);
	};

	const handleResetRuleUrl = async () => {
		setRuleUrlDraft(DEFAULT_FULL_PAGE_RULE_URL);
		const saved = await saveRuleUrl(
			DEFAULT_FULL_PAGE_RULE_URL,
			t("已恢复默认规则地址"),
		);
		if (!saved) {
			setRuleUrlDraft(config.fullPageRuleUrl || DEFAULT_FULL_PAGE_RULE_URL);
		}
	};

	const handleExport = async () => {
		const configStr = await storage.getItem("local:config");
		if (!configStr) {
			toastWarning(t("没有找到配置信息"));
			return;
		}
		const configToExport = JSON.parse(configStr as string);
		const cleanedConfig = JSON.parse(JSON.stringify(configToExport));
		if (cleanedConfig.system_role) {
			Object.keys(cleanedConfig.system_role).forEach((service) => {
				if (cleanedConfig.system_role[service] === defaultOption.system_role) {
					delete cleanedConfig.system_role[service];
				}
			});
			if (Object.keys(cleanedConfig.system_role).length === 0) {
				delete cleanedConfig.system_role;
			}
		}
		if (cleanedConfig.user_role) {
			Object.keys(cleanedConfig.user_role).forEach((service) => {
				if (cleanedConfig.user_role[service] === defaultOption.user_role) {
					delete cleanedConfig.user_role[service];
				}
			});
			if (Object.keys(cleanedConfig.user_role).length === 0) {
				delete cleanedConfig.user_role;
			}
		}
		setExportData(JSON.stringify(cleanedConfig, null, 2));
		setShowExportBox((value) => !value);
		setShowImportBox(false);
	};

	const handleImport = () => {
		setShowImportBox((value) => !value);
		setShowExportBox(false);
	};

	const saveImport = async () => {
		try {
			const parsedConfig = JSON.parse(importData);
			if (
				typeof parsedConfig !== "object" ||
				parsedConfig === null ||
				!("on" in parsedConfig) ||
				!("service" in parsedConfig) ||
				!("display" in parsedConfig) ||
				!("from" in parsedConfig) ||
				!("to" in parsedConfig)
			) {
				toastError(t("配置无效或格式不正确"));
				return;
			}
			await storage.setItem("local:config", JSON.stringify(parsedConfig));
			toastSuccess(t("配置导入成功"));
			setShowImportBox(false);
			setImportData("");
		} catch {
			toastError(t("配置格式错误"));
		}
	};

	const isValidAzureEndpoint = (endpoint: string) =>
		!!endpoint &&
		endpoint.startsWith("https://") &&
		endpoint.includes("openai.azure.com") &&
		endpoint.includes("/chat/completions");

	const isValidOpenAIExtraParams = (value: string) => {
		try {
			parseOpenAIExtraParams(value);
			return true;
		} catch {
			return false;
		}
	};

	const serviceOptionList = toSelectOptions(filteredServices);

	return (
		<div className="space-y-4">
			<Tabs value={activeTab} tabs={tabs} onChange={setActiveTab} />

			{activeTab === "basic" && (
				<div className="space-y-3">
					<FieldRow label={t("界面语言")}>
						<Select
							value={config.uiLanguage || "auto"}
							onValueChange={(value) =>
								updateConfig((draft) => {
									draft.uiLanguage = value;
								})
							}
							options={uiLanguageOptions}
						/>
					</FieldRow>

					<FieldRow label={t("插件状态")}>
						<Switch
							checked={!!config.on}
							onCheckedChange={handlePluginStateChange}
						/>
					</FieldRow>

					{!config.on && (
						<div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
							{t("插件处于禁用状态")}
						</div>
					)}

					{config.on && (
						<>
							<FieldRow label={t("翻译模式")}>
								<Select
									value={config.display}
									onValueChange={(value) =>
										updateConfig((draft) => {
											draft.display = Number(value);
										})
									}
									options={toSelectOptions(localizedOptions.display)}
								/>
							</FieldRow>
							{Number(config.display) === 1 && (
								<FieldRow label={t("译文样式")}>
									<select
										value={String(config.style)}
										onChange={(event) =>
											updateConfig((draft) => {
												draft.style = Number(event.target.value);
											})
										}
										className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										{styleGroups.map((group: any) => (
											<optgroup
												key={String(group.value)}
												label={String(group.label)}
											>
												{group.options.map((item: any) => (
													<option
														key={String(item.value)}
														value={String(item.value)}
													>
														{item.label}
													</option>
												))}
											</optgroup>
										))}
									</select>
								</FieldRow>
							)}
							<FieldRow label={t("翻译服务")}>
								<Select
									value={config.service}
									onValueChange={(value) =>
										updateConfig((draft) => {
											draft.service = value;
										})
									}
									options={serviceOptionList}
								/>
							</FieldRow>
							<FieldRow label={t("富文本翻译")}>
								<Switch
									checked={!!config.richTextTranslate}
									onCheckedChange={(value) =>
										updateConfig((draft) => {
											draft.richTextTranslate = value;
										})
									}
								/>
							</FieldRow>
							<FieldRow label={t("目标语言")}>
								<Select
									value={config.to}
									onValueChange={(value) =>
										updateConfig((draft) => {
											draft.to = value;
										})
									}
									options={toSelectOptions(localizedOptions.to)}
								/>
							</FieldRow>
						</>
					)}
				</div>
			)}

			{activeTab === "features" && (
				<div className="space-y-3">
					<FieldRow label={t("鼠标悬浮快捷键")}>
						<div className="space-y-2">
							<Select
								value={config.hotkey}
								onValueChange={handleMouseHotkeyChange}
								options={toSelectOptions(localizedOptions.keys)}
							/>
							{config.hotkey === "custom" && (
								<div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2 text-sm">
									<span>
										{config.customHotkey
											? hotkeyDisplayName(config.customHotkey, t)
											: t("点击设置自定义快捷键")}
									</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowCustomMouseHotkeyDialog(true)}
									>
										{t("编辑")}
									</Button>
								</div>
							)}
						</div>
					</FieldRow>

					<FieldRow label={t("全文翻译快捷键")}>
						<div className="space-y-2">
							<Select
								value={config.floatingBallHotkey}
								onValueChange={handleHotkeyChange}
								options={toSelectOptions(localizedOptions.floatingBallHotkeys)}
							/>
							{config.floatingBallHotkey === "custom" && (
								<div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2 text-sm">
									<span>
										{config.customFloatingBallHotkey
											? hotkeyDisplayName(config.customFloatingBallHotkey, t)
											: t("点击设置自定义快捷键")}
									</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowCustomHotkeyDialog(true)}
									>
										{t("编辑")}
									</Button>
								</div>
							)}
						</div>
					</FieldRow>

					<FieldRow label={t("划词翻译")}>
						<Select
							value={config.selectionTranslatorMode}
							onValueChange={handleSelectionModeChange}
							options={[
								{ value: "disabled", label: t("关闭") },
								{ value: "bilingual", label: t("双语显示") },
								{ value: "translation-only", label: t("只显示译文") },
							]}
						/>
					</FieldRow>

					<FieldRow label={t("全文翻译悬浮球")}>
						<Switch
							checked={floatingBallEnabled}
							onCheckedChange={handleFloatingBallChange}
						/>
					</FieldRow>

					<FieldRow label={t("动画效果")}>
						<Switch
							checked={!!config.animations}
							onCheckedChange={(value) =>
								updateConfig((draft) => {
									draft.animations = value;
								})
							}
						/>
					</FieldRow>

					<FieldRow label={t("输入框翻译")}>
						<Select
							value={config.inputBoxTranslationTrigger}
							onValueChange={(value) =>
								updateConfig((draft) => {
									draft.inputBoxTranslationTrigger = value;
								})
							}
							options={toSelectOptions(
								localizedOptions.inputBoxTranslationTrigger,
							)}
						/>
					</FieldRow>

					{config.inputBoxTranslationTrigger !== "disabled" && (
						<FieldRow label={t("输入框目标语言")}>
							<Select
								value={config.inputBoxTranslationTarget}
								onValueChange={(value) =>
									updateConfig((draft) => {
										draft.inputBoxTranslationTarget = value;
									})
								}
								options={toSelectOptions(
									localizedOptions.inputBoxTranslationTarget,
								)}
							/>
						</FieldRow>
					)}

					<FieldRow label={t("翻译并发数")}>
						<Input
							type="number"
							min={1}
							max={100}
							value={String(config.maxConcurrentTranslations)}
							onChange={(event) => handleConcurrentChange(event.target.value)}
						/>
					</FieldRow>
				</div>
			)}

			{activeTab === "service" && (
				<div className="space-y-3">
					{showToken && (
						<FieldRow label={t("访问令牌")}>
							<Input
								type="password"
								value={config.token?.[config.service] || ""}
								onChange={(event) =>
									updateConfig((draft) => {
										draft.token[draft.service] = event.target.value;
									})
								}
							/>
						</FieldRow>
					)}

					{showAzureOpenaiEndpoint && (
						<FieldRow label={t("Azure 端点")}>
							<div className="space-y-1">
								<Input
									value={config.azureOpenaiEndpoint || ""}
									onChange={(event) =>
										updateConfig((draft) => {
											draft.azureOpenaiEndpoint = event.target.value;
										})
									}
								/>
								{!!config.azureOpenaiEndpoint &&
									!isValidAzureEndpoint(config.azureOpenaiEndpoint) && (
										<div className="text-xs text-destructive">
											{t("端点地址格式不正确")}
										</div>
									)}
							</div>
						</FieldRow>
					)}

					{showDeepLX && (
						<FieldRow label={t("DeepLX 地址")}>
							<Input
								value={config.deeplx || ""}
								onChange={(event) =>
									updateConfig((draft) => {
										draft.deeplx = event.target.value;
									})
								}
							/>
						</FieldRow>
					)}

					{showMTranServerUrl && (
						<FieldRow label={t("MTranServer 地址")}>
							<Input
								value={config.mtranServerUrl || ""}
								onChange={(event) =>
									updateConfig((draft) => {
										draft.mtranServerUrl = event.target.value;
									})
								}
							/>
						</FieldRow>
					)}

					{showAkSk && (
						<>
							<FieldRow label={t("API Key")}>
								<Input
									value={config.ak || ""}
									onChange={(event) =>
										updateConfig((draft) => {
											draft.ak = event.target.value;
										})
									}
								/>
							</FieldRow>
							<FieldRow label={t("Secret Key")}>
								<Input
									type="password"
									value={config.sk || ""}
									onChange={(event) =>
										updateConfig((draft) => {
											draft.sk = event.target.value;
										})
									}
								/>
							</FieldRow>
						</>
					)}

					{showYoudao && (
						<>
							<FieldRow label={t("有道 AppKey")}>
								<Input
									value={config.youdaoAppKey || ""}
									onChange={(event) =>
										updateConfig((draft) => {
											draft.youdaoAppKey = event.target.value;
										})
									}
								/>
							</FieldRow>
							<FieldRow label={t("有道 AppSecret")}>
								<Input
									type="password"
									value={config.youdaoAppSecret || ""}
									onChange={(event) =>
										updateConfig((draft) => {
											draft.youdaoAppSecret = event.target.value;
										})
									}
								/>
							</FieldRow>
						</>
					)}

					{showTencent && (
						<>
							<FieldRow label={t("腾讯云 SecretId")}>
								<Input
									value={config.tencentSecretId || ""}
									onChange={(event) =>
										updateConfig((draft) => {
											draft.tencentSecretId = event.target.value;
										})
									}
								/>
							</FieldRow>
							<FieldRow label={t("腾讯云 SecretKey")}>
								<Input
									type="password"
									value={config.tencentSecretKey || ""}
									onChange={(event) =>
										updateConfig((draft) => {
											draft.tencentSecretKey = event.target.value;
										})
									}
								/>
							</FieldRow>
						</>
					)}

					{showRobotId && (
						<FieldRow label={t("Coze 机器人ID")}>
							<Input
								value={config.robot_id?.[config.service] || ""}
								onChange={(event) =>
									updateConfig((draft) => {
										draft.robot_id[draft.service] = event.target.value;
									})
								}
							/>
						</FieldRow>
					)}

					{showCustom && (
						<FieldRow label={t("自定义接口地址")}>
							<Input
								value={config.custom || ""}
								onChange={(event) =>
									updateConfig((draft) => {
										draft.custom = event.target.value;
									})
								}
							/>
						</FieldRow>
					)}

					{showNewAPI && (
						<FieldRow label={t("NewAPI 地址")}>
							<Input
								value={config.newApiUrl || ""}
								onChange={(event) =>
									updateConfig((draft) => {
										draft.newApiUrl = event.target.value;
									})
								}
							/>
						</FieldRow>
					)}

					{showOllamaUrl && (
						<FieldRow label={t("Ollama 地址")}>
							<Input
								value={config.ollamaUrl || ""}
								onChange={(event) =>
									updateConfig((draft) => {
										draft.ollamaUrl = event.target.value;
									})
								}
							/>
						</FieldRow>
					)}

					{showOpenAICompatible && (
						<>
							<FieldRow label={t("思维链长度")}>
								<Select
									value={config.reasoningEffort?.[config.service] || "default"}
									onValueChange={(value) =>
										updateConfig((draft) => {
											draft.reasoningEffort[draft.service] = value;
										})
									}
									options={toSelectOptions(localizedOptions.reasoningEffort)}
								/>
							</FieldRow>
							<FieldRow label={t("额外参数 JSON")}>
								<div className="space-y-1">
									<Textarea
										rows={5}
										value={config.openaiExtraParams?.[config.service] || ""}
										onChange={(event) =>
											updateConfig((draft) => {
												draft.openaiExtraParams[draft.service] =
													event.target.value;
											})
										}
									/>
									{!!config.openaiExtraParams?.[config.service] &&
										!isValidOpenAIExtraParams(
											config.openaiExtraParams[config.service],
										) && (
											<div className="text-xs text-destructive">
												{t("JSON 格式错误")}
											</div>
										)}
								</div>
							</FieldRow>
						</>
					)}

					{showModel && (
						<FieldRow label={t("模型")}>
							<Select
								value={config.model?.[config.service] || ""}
								onValueChange={(value) =>
									updateConfig((draft) => {
										draft.model[draft.service] = value;
									})
								}
								options={serviceModels.map((item) => ({
									value: item,
									label: item === customModelString ? t("自定义模型") : item,
								}))}
							/>
						</FieldRow>
					)}

					{showCustomModel && (
						<FieldRow label={t("自定义模型")}>
							<Input
								value={config.customModel?.[config.service] || ""}
								onChange={(event) =>
									updateConfig((draft) => {
										draft.customModel[draft.service] = event.target.value;
									})
								}
							/>
						</FieldRow>
					)}

					{showProxy && (
						<FieldRow label={t("代理地址")}>
							<Input
								value={config.proxy?.[config.service] || ""}
								onChange={(event) =>
									updateConfig((draft) => {
										draft.proxy[draft.service] = event.target.value;
									})
								}
							/>
						</FieldRow>
					)}

					{showAI && (
						<>
							<FieldRow label={t("System Message")}>
								<Textarea
									rows={5}
									value={config.system_role?.[config.service] || ""}
									onChange={(event) =>
										updateConfig((draft) => {
											draft.system_role[draft.service] = event.target.value;
										})
									}
								/>
							</FieldRow>
							<FieldRow label={t("User Template")}>
								<Textarea
									rows={5}
									value={config.user_role?.[config.service] || ""}
									onChange={(event) =>
										updateConfig((draft) => {
											draft.user_role[draft.service] = event.target.value;
										})
									}
								/>
							</FieldRow>
							<div className="flex justify-end">
								<Button variant="outline" onClick={resetTemplate}>
									{t("恢复默认模板")}
								</Button>
							</div>
						</>
					)}
				</div>
			)}

			{activeTab === "advanced" && (
				<div className="space-y-3">
					<FieldRow label={t("主题设置")}>
						<Select
							value={config.theme}
							onValueChange={(value) =>
								updateConfig((draft) => {
									draft.theme = value;
								})
							}
							options={toSelectOptions(localizedOptions.theme)}
						/>
					</FieldRow>

					<FieldRow label={t("缓存翻译结果")}>
						<Switch
							checked={!!config.useCache}
							onCheckedChange={(value) =>
								updateConfig((draft) => {
									draft.useCache = value;
								})
							}
						/>
					</FieldRow>

					<FieldRow label={t("全文规则 URL")}>
						<div className="space-y-2">
							<Input
								value={ruleUrlDraft}
								onChange={(event) => setRuleUrlDraft(event.target.value)}
							/>
							<div className="grid grid-cols-2 gap-2">
								<Button onClick={handleSaveRuleUrl}>{t("保存规则地址")}</Button>
								<Button variant="secondary" onClick={handleResetRuleUrl}>
									{t("重置默认规则地址")}
								</Button>
							</div>
						</div>
					</FieldRow>

					<div className="grid grid-cols-2 gap-2">
						<Button onClick={handleExport}>{t("导出配置")}</Button>
						<Button variant="secondary" onClick={handleImport}>
							{t("导入配置")}
						</Button>
					</div>

					{showExportBox && (
						<Textarea
							readOnly
							rows={8}
							value={exportData}
							onChange={() => {}}
						/>
					)}

					{showImportBox && (
						<div className="space-y-2">
							<Textarea
								rows={8}
								value={importData}
								onChange={(event) => setImportData(event.target.value)}
							/>
							<div className="flex justify-end">
								<Button onClick={saveImport}>{t("保存")}</Button>
							</div>
						</div>
					)}
				</div>
			)}

			<Footer />

			<CustomHotkeyInput
				open={showCustomHotkeyDialog}
				onOpenChange={setShowCustomHotkeyDialog}
				currentValue={config.customFloatingBallHotkey}
				onConfirm={handleCustomHotkeyConfirm}
				onCancel={handleCustomHotkeyCancel}
			/>

			<CustomHotkeyInput
				open={showCustomMouseHotkeyDialog}
				onOpenChange={setShowCustomMouseHotkeyDialog}
				currentValue={config.customHotkey}
				onConfirm={handleCustomMouseHotkeyConfirm}
				onCancel={handleCustomMouseHotkeyCancel}
			/>
		</div>
	);
}

function hotkeyDisplayName(hotkey: string, t: (source: string) => string) {
	if (!hotkey) {
		return "";
	}
	if (hotkey === "none") {
		return t("已禁用");
	}
	const parsed = parseHotkey(hotkey, t);
	return parsed.isValid ? parsed.displayName : hotkey;
}
