import { Toaster } from "sonner";
import Header from "@/components/Header";
import Main from "@/components/Main";
import { useConfig } from "@/entrypoints/ui/hooks/useConfig";
import { I18nProvider } from "@/entrypoints/ui/i18n/I18nProvider";

export default function App() {
	const { config } = useConfig();

	return (
		<I18nProvider
			language={config.uiLanguage}
			syncDocument
			title={(t) => t("MTranBrowser - 设置")}
		>
			<div className="mx-auto w-full max-w-5xl bg-background p-5 text-foreground">
				<div className="space-y-4">
					<Header />
					<Main />
				</div>
				<Toaster position="top-center" richColors />
			</div>
		</I18nProvider>
	);
}
