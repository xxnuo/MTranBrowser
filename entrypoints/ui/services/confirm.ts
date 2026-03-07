export function confirmAction(message: string) {
	return Promise.resolve(window.confirm(message));
}
