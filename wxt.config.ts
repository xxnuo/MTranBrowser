import fs from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

const packageJson = JSON.parse(
	fs.readFileSync(resolve(__dirname, "package.json"), "utf-8"),
);

export default defineConfig({
	modules: ["@wxt-dev/module-react", "@wxt-dev/webextension-polyfill"],
	webExt: {
		startUrls: ["https://news.ycombinator.com/"],
	},
	vite: () => ({
		plugins: [tailwindcss()],
		define: {
			"process.env.APP_VERSION": JSON.stringify(packageJson.version),
		},
	}),
	manifest: {
		permissions: ["storage", "contextMenus", "offscreen"],
		host_permissions: ["<all_urls>"],
		options_ui: {
			open_in_tab: true,
		},
	},
});
