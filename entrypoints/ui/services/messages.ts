import browser from "webextension-polyfill";

export async function broadcastMessage(message: any) {
	const tabs = await browser.tabs.query({});
	await Promise.all(
		tabs
			.filter((tab) => !!tab.id)
			.map((tab) => browser.tabs.sendMessage(tab.id!, message).catch(() => {})),
	);
}
