import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/entrypoints/ui/i18n/I18nProvider";
import {
	type ParsedHotkey,
	parseHotkey,
	validateHotkeyConflicts,
} from "@/entrypoints/utils/hotkey";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentValue?: string;
	onConfirm: (hotkey: string) => void;
	onCancel: () => void;
}

const recommendedHotkeys = [
	{ value: "Alt+A", label: "Alt+A" },
	{ value: "Alt+T", label: "Alt+T" },
	{ value: "Alt+Q", label: "Alt+Q" },
	{ value: "Alt+D", label: "Alt+D" },
	{ value: "F9", label: "F9" },
	{ value: "F10", label: "F10" },
];

function keyToLabel(key: string) {
	if (key.length === 1) {
		return key.toUpperCase();
	}
	if (/^f\d+$/.test(key)) {
		return key.toUpperCase();
	}
	const map: Record<string, string> = {
		escape: "Esc",
		enter: "Enter",
		space: "Space",
		tab: "Tab",
		backspace: "Backspace",
		delete: "Delete",
		arrowup: "ArrowUp",
		arrowdown: "ArrowDown",
		arrowleft: "ArrowLeft",
		arrowright: "ArrowRight",
	};
	return map[key] || key;
}

function parseFromPressedKeys(keys: Set<string>) {
	const modifiers: string[] = [];
	if (keys.has("ctrl")) modifiers.push("Ctrl");
	if (keys.has("alt")) modifiers.push("Alt");
	if (keys.has("shift")) modifiers.push("Shift");
	if (keys.has("meta")) modifiers.push("Meta");
	const main = Array.from(keys).find(
		(k) => !["ctrl", "alt", "shift", "meta"].includes(k),
	);
	if (!main) {
		return "";
	}
	return [...modifiers, keyToLabel(main)].join("+");
}

export default function CustomHotkeyInput({
	open,
	onOpenChange,
	currentValue,
	onConfirm,
	onCancel,
}: Props) {
	const { t } = useI18n();
	const [currentHotkey, setCurrentHotkey] = useState(currentValue || "");
	const [isRecording, setIsRecording] = useState(false);
	const [pressedKeys, setPressedKeys] = useState(new Set<string>());
	const [errorMessage, setErrorMessage] = useState("");
	const [conflictWarning, setConflictWarning] = useState("");
	const inputRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		setCurrentHotkey(currentValue || "");
	}, [currentValue]);

	const parsedHotkey = useMemo<ParsedHotkey | null>(() => {
		if (!currentHotkey || currentHotkey === "none") {
			return null;
		}
		return parseHotkey(currentHotkey, t);
	}, [currentHotkey, t]);

	useEffect(() => {
		setErrorMessage("");
		setConflictWarning("");
		if (!currentHotkey || currentHotkey === "none") {
			return;
		}
		const parsed = parseHotkey(currentHotkey, t);
		if (!parsed.isValid) {
			setErrorMessage(parsed.errorMessage || t("无效的快捷键"));
			return;
		}
		const conflict = validateHotkeyConflicts(parsed, t);
		if (conflict.hasConflict) {
			setConflictWarning(conflict.conflictDescription || t("可能与系统冲突"));
		}
	}, [currentHotkey, t]);

	const canConfirm =
		currentHotkey === "none" ||
		(!!parsedHotkey?.isValid && !errorMessage.length);

	const startRecording = () => {
		setIsRecording(true);
		setPressedKeys(new Set());
		inputRef.current?.focus();
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		if (!isRecording) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		const next = new Set(pressedKeys);
		if (event.ctrlKey) next.add("ctrl");
		if (event.altKey) next.add("alt");
		if (event.shiftKey) next.add("shift");
		if (event.metaKey) next.add("meta");
		const key = event.key.toLowerCase();
		const code = event.code?.toLowerCase();
		if (!["control", "alt", "shift", "meta"].includes(key)) {
			if (code?.startsWith("key")) {
				next.add(code.slice(3));
			} else if (key.length === 1) {
				next.add(key);
			} else if (/^f\d+$/.test(key)) {
				next.add(key);
			} else {
				const specialKeys: Record<string, string> = {
					escape: "escape",
					enter: "enter",
					space: "space",
					tab: "tab",
					backspace: "backspace",
					delete: "delete",
					arrowup: "arrowup",
					arrowdown: "arrowdown",
					arrowleft: "arrowleft",
					arrowright: "arrowright",
				};
				if (specialKeys[key]) {
					next.add(specialKeys[key]);
				}
			}
		}
		setPressedKeys(next);
	};

	const handleKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		if (!isRecording) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		const hotkey = parseFromPressedKeys(pressedKeys);
		if (hotkey) {
			setCurrentHotkey(hotkey);
		}
		setPressedKeys(new Set());
		setIsRecording(false);
	};

	const handleConfirm = () => {
		onConfirm(currentHotkey || "none");
		onOpenChange(false);
	};

	const handleCancel = () => {
		setIsRecording(false);
		setPressedKeys(new Set());
		onCancel();
		onOpenChange(false);
	};

	return (
		<Modal open={open} onOpenChange={onOpenChange} title={t("自定义快捷键")}>
			<div className="space-y-3">
				<button
					ref={inputRef}
					type="button"
					onClick={startRecording}
					onKeyDown={handleKeyDown}
					onKeyUp={handleKeyUp}
					className="min-h-10 w-full rounded-md border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					{!isRecording && !currentHotkey && t("点击这里开始录制快捷键")}
					{isRecording && t("正在录制，请按下快捷键")}
					{!isRecording && !!currentHotkey && currentHotkey}
				</button>
				{errorMessage && (
					<div className="text-xs text-destructive">{errorMessage}</div>
				)}
				{!errorMessage && conflictWarning && (
					<div className="text-xs text-amber-500">{conflictWarning}</div>
				)}
				{!errorMessage && !conflictWarning && parsedHotkey?.isValid && (
					<div className="text-xs text-emerald-500">{t("快捷键有效")}</div>
				)}
				<div className="flex flex-wrap gap-2">
					{recommendedHotkeys.map((item) => (
						<Button
							key={item.value}
							size="sm"
							variant={currentHotkey === item.value ? "default" : "outline"}
							onClick={() => setCurrentHotkey(item.value)}
						>
							{item.label}
						</Button>
					))}
				</div>
				<div className="text-xs text-muted-foreground">
					{t("建议使用修饰键组合，且不支持 CMD 作为快捷键")}
				</div>
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={handleCancel}>
						{t("取消")}
					</Button>
					{!!currentHotkey && (
						<Button variant="outline" onClick={() => setCurrentHotkey("none")}>
							{t("清除")}
						</Button>
					)}
					<Button onClick={handleConfirm} disabled={!canConfirm}>
						{t("确认")}
					</Button>
				</div>
			</div>
		</Modal>
	);
}
