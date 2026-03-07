import { Toaster } from "sonner";
import Header from "@/components/Header";
import PopupQuickSettings from "@/components/PopupQuickSettings";
import { useConfig } from "@/entrypoints/ui/hooks/useConfig";
import { I18nProvider } from "@/entrypoints/ui/i18n/I18nProvider";

export default function App() {
	const { config } = useConfig();

	return (
		<I18nProvider
			language={config.uiLanguage}
			syncDocument
			title="MTranBrowser"
		>
			<div className="mx-auto min-w-[360px] bg-background p-4 text-foreground">
				<div className="space-y-4">
					<Header />
					<PopupQuickSettings />
				</div>
				<Toaster position="top-center" richColors />
			</div>
		</I18nProvider>
	);
}
