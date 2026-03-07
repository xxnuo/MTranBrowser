import { type ReactNode, useMemo } from "react";
import browser from "webextension-polyfill";
import { Button } from "@/components/ui/button";
import { localizeOptions } from "@/lib/i18n";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useConfig } from "@/entrypoints/ui/hooks/useConfig";
import { useI18n } from "@/entrypoints/ui/i18n/I18nProvider";
import { broadcastMessage } from "@/entrypoints/ui/services/messages";
import { options, services } from "@/entrypoints/utils/option";

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border bg-background px-3 py-2">
			<div className="text-sm text-foreground">{label}</div>
			<div className="min-w-[140px]">{children}</div>
		</div>
	);
}

export default function PopupQuickSettings() {
	const { config, updateConfig } = useConfig();
	const { t } = useI18n();
	const localizedOptions = useMemo(() => localizeOptions(options, t), [t]);

	const filteredServices = useMemo(
		() =>
			localizedOptions.services.filter(
				(item: any) =>
					!(item.value === services.google && Number(config.display) !== 1),
			),
		[config.display, localizedOptions.services],
	);

	const handlePluginStateChange = async (enabled: boolean) => {
		updateConfig((draft) => {
			draft.on = enabled;
			if (!enabled) {
				draft.disableFloatingBall = true;
				draft.selectionTranslatorMode = "disabled";
			}
		});
		if (!enabled) {
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

	const openSettingsPage = async () => {
		try {
			await browser.tabs.create({
				url: browser.runtime.getURL("/options.html?standalone=1"),
			});
		} catch {
			await browser.runtime.openOptionsPage();
		}
	};

	return (
		<div className="space-y-3">
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
							options={localizedOptions.display.map((item: any) => ({
								label: item.label,
								value: item.value,
							}))}
						/>
					</FieldRow>
					<FieldRow label={t("翻译服务")}>
						<Select
							value={config.service}
							onValueChange={(value) =>
								updateConfig((draft) => {
									draft.service = value;
								})
							}
							options={filteredServices.map((item: any) => ({
								label: item.label,
								value: item.value,
								disabled: !!item.disabled,
							}))}
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
							options={localizedOptions.to.map((item: any) => ({
								label: item.label,
								value: item.value,
							}))}
						/>
					</FieldRow>
				</>
			)}
			<Button className="w-full" onClick={openSettingsPage}>
				{t("打开设置页面")}
			</Button>
		</div>
	);
}
