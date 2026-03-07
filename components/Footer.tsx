import { useEffect, useMemo, useState } from "react";
import browser from "webextension-polyfill";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/entrypoints/ui/i18n/I18nProvider";
import { useConfig } from "@/entrypoints/ui/hooks/useConfig";

export default function Footer() {
	const { config } = useConfig();
	const { t } = useI18n();
	const [loading, setLoading] = useState(false);
	const [text, setText] = useState(t("清除翻译缓存"));

	const count = useMemo(() => config.count || 0, [config.count]);

	const clearCache = async () => {
		try {
			setLoading(true);
			setText(t("正在清除..."));
			const tabs = await browser.tabs.query({
				active: true,
				currentWindow: true,
			});
			if (!tabs[0]?.id) {
				throw new Error(t("No active tab found"));
			}
			await browser.tabs.sendMessage(tabs[0].id, { message: "clearCache" });
			setText(t("清除成功"));
		} catch {
			setText(t("清除失败"));
		} finally {
			window.setTimeout(() => {
				setLoading(false);
				setText(t("清除翻译缓存"));
			}, 1500);
		}
	};

	useEffect(() => {
		if (!loading) {
			setText(t("清除翻译缓存"));
		}
	}, [loading, t]);

	return (
		<div className="rounded-lg border bg-background p-3">
			<div className="text-center text-sm text-muted-foreground">
				{t("你已经翻译 {count} 次", { count })}
			</div>
			<div className="mt-2 flex items-center justify-between gap-2">
				<Button variant="secondary" disabled={loading} onClick={clearCache}>
					{text}
				</Button>
				<a
					href="https://fluent.thinkstu.com/"
					target="_blank"
					rel="noreferrer"
					className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
				>
					{t("GitHub开源")}
				</a>
			</div>
		</div>
	);
}
