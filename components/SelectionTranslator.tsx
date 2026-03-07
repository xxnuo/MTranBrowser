import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/entrypoints/ui/i18n/I18nProvider";
import { config } from "@/entrypoints/utils/config";
import { translateText } from "@/entrypoints/utils/translateApi";

export default function SelectionTranslator() {
	const { direction, t } = useI18n();
	const [selectedText, setSelectedText] = useState("");
	const [translationResult, setTranslationResult] = useState("");
	const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
	const [showIndicator, setShowIndicator] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [copySuccess, setCopySuccess] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentPlayingText, setCurrentPlayingText] = useState("");
	const [isDarkTheme, setIsDarkTheme] = useState(false);

	const hideTimerRef = useRef<number | null>(null);
	const debounceRef = useRef<number | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const isSelectingRef = useRef(false);

	const indicatorStyle = useMemo(() => {
		if (!selectionRect) return {};
		return {
			left: `${selectionRect.right}px`,
			top: `${selectionRect.top}px`,
			transform: "translate(3px, -50%)",
		};
	}, [selectionRect]);

	const tooltipStyle = useMemo(() => {
		if (!selectionRect) return {};
		const left = Math.min(selectionRect.right + 15, window.innerWidth - 350);
		return {
			left: `${left}px`,
			top: `${selectionRect.top}px`,
		};
	}, [selectionRect]);

	const detectLanguage = (text: string) => {
		if (/[\u4e00-\u9fa5]/.test(text)) return "zh-CN";
		if (/[\u3040-\u30ff]/.test(text)) return "ja-JP";
		if (/[\uAC00-\uD7A3]/.test(text)) return "ko-KR";
		if (/[\u0400-\u04FF]/.test(text)) return "ru-RU";
		return "en-US";
	};

	const stopAudio = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
		}
		if ("speechSynthesis" in window) {
			window.speechSynthesis.cancel();
		}
		setIsPlaying(false);
		setCurrentPlayingText("");
	}, []);

	const playAudio = (text: string) => {
		if (!text) {
			return;
		}
		if (isPlaying && currentPlayingText === text) {
			stopAudio();
			return;
		}
		stopAudio();
		const language = detectLanguage(text);
		const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${encodeURIComponent(text)}`;
		const audio = new Audio(url);
		audioRef.current = audio;
		setIsPlaying(true);
		setCurrentPlayingText(text);
		audio.onended = stopAudio;
		audio.onerror = () => {
			stopAudio();
			if ("speechSynthesis" in window) {
				const utter = new SpeechSynthesisUtterance(text);
				utter.lang = language;
				utter.onend = stopAudio;
				utter.onerror = stopAudio;
				setIsPlaying(true);
				setCurrentPlayingText(text);
				window.speechSynthesis.speak(utter);
			}
		};
		audio.play().catch(() => {
			audio.onerror?.(new Event("error"));
		});
	};

	const getTranslation = useCallback(async () => {
		if (!selectedText) {
			return;
		}
		setIsLoading(true);
		setError("");
		try {
			const result = await translateText(selectedText);
			setTranslationResult(result);
		} catch {
			setError(t("翻译失败，请重试"));
		} finally {
			setIsLoading(false);
		}
	}, [selectedText, t]);

	const handleSelection = useCallback(() => {
		if (isSelectingRef.current) {
			return;
		}
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = window.setTimeout(() => {
			const selection = window.getSelection();
			if (!selection || selection.rangeCount === 0) {
				setShowIndicator(false);
				return;
			}
			const text = selection.toString().trim();
			if (!text || text.length < 2 || text.length > 4096) {
				setShowIndicator(false);
				return;
			}
			const rect = selection.getRangeAt(0).getBoundingClientRect();
			setSelectedText(text);
			setSelectionRect(rect);
			setShowIndicator(true);
		}, 200);
	}, []);

	const hideTooltipLater = useCallback(() => {
		if (hideTimerRef.current) {
			clearTimeout(hideTimerRef.current);
		}
		hideTimerRef.current = window.setTimeout(() => {
			if (!isPlaying) {
				setShowTooltip(false);
			}
		}, 250);
	}, [isPlaying]);

	const showTooltipNow = useCallback(() => {
		if (hideTimerRef.current) {
			clearTimeout(hideTimerRef.current);
		}
		setShowTooltip(true);
	}, []);

	useEffect(() => {
		const updateTheme = () => {
			const theme = config.theme || "auto";
			if (theme === "auto") {
				setIsDarkTheme(
					window.matchMedia("(prefers-color-scheme: dark)").matches,
				);
			} else {
				setIsDarkTheme(theme === "dark");
			}
		};
		updateTheme();
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onMedia = () => {
			if ((config.theme || "auto") === "auto") updateTheme();
		};
		media.addEventListener("change", onMedia);

		const onMouseDown = () => {
			isSelectingRef.current = true;
		};
		const onMouseUp = () => {
			isSelectingRef.current = false;
			handleSelection();
		};
		const onSelectionChange = () => {
			if (!isSelectingRef.current) {
				handleSelection();
			}
		};
		const onClick = (event: Event) => {
			const target = event.target as HTMLElement;
			if (
				target.closest(".fr-selection-indicator") ||
				target.closest(".fr-translation-tooltip")
			) {
				return;
			}
			setShowIndicator(false);
			setShowTooltip(false);
			stopAudio();
		};

		document.addEventListener("mousedown", onMouseDown);
		document.addEventListener("mouseup", onMouseUp);
		document.addEventListener("selectionchange", onSelectionChange);
		document.addEventListener("click", onClick);

		return () => {
			media.removeEventListener("change", onMedia);
			document.removeEventListener("mousedown", onMouseDown);
			document.removeEventListener("mouseup", onMouseUp);
			document.removeEventListener("selectionchange", onSelectionChange);
			document.removeEventListener("click", onClick);
			if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
			if (debounceRef.current) clearTimeout(debounceRef.current);
			stopAudio();
		};
	}, [handleSelection, stopAudio]);

	useEffect(() => {
		if (showTooltip) {
			getTranslation();
		} else {
			stopAudio();
		}
	}, [showTooltip, getTranslation, stopAudio]);

	const copyTranslation = async () => {
		if (!translationResult) {
			return;
		}
		try {
			await navigator.clipboard.writeText(translationResult);
			setCopySuccess(true);
			window.setTimeout(() => setCopySuccess(false), 1500);
		} catch {}
	};

	return createPortal(
		<>
			{showIndicator && (
				<button
					type="button"
					className="fr-selection-indicator border-0 bg-transparent p-0"
					style={indicatorStyle}
					onMouseEnter={showTooltipNow}
					onFocus={showTooltipNow}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							showTooltipNow();
						}
					}}
					onMouseLeave={hideTooltipLater}
					onBlur={hideTooltipLater}
				/>
			)}
			{showTooltip && (
				<div
					className={`fr-translation-tooltip ${isDarkTheme ? "fr-dark-theme" : ""}`}
					style={tooltipStyle}
					dir={direction}
					role="tooltip"
					tabIndex={-1}
					onMouseEnter={() => {
						if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
					}}
					onMouseLeave={hideTooltipLater}
				>
					<div className="fr-tooltip-header">
						<span>
							{t("翻译结果")}
							<small>{t("（via MTranBrowser）")}</small>
						</span>
						<div className="fr-tooltip-actions">
							<button
								type="button"
								className="fr-action-btn"
								onClick={copyTranslation}
							>
								{t("复制")}
							</button>
							<button
								type="button"
								className="fr-close-btn"
								onClick={() => {
									setShowTooltip(false);
									stopAudio();
								}}
							>
								×
							</button>
						</div>
					</div>
					<div className="fr-tooltip-content">
						{isLoading && (
							<div
								className={`fr-loading-spinner ${!config.animations ? "fr-static" : ""}`}
							/>
						)}
						{!isLoading && !!error && (
							<div className="fr-error-message">{error}</div>
						)}
						{!isLoading && !error && (
							<div className="fr-translation-container">
								{config.selectionTranslatorMode === "bilingual" && (
									<div className="fr-original-text fr-no-select">
										<pre>{selectedText}</pre>
										<button
											type="button"
											className="fr-text-audio-btn"
											onClick={() => playAudio(selectedText)}
										>
											{isPlaying && currentPlayingText === selectedText
												? t("停")
												: t("听")}
										</button>
									</div>
								)}
								{(config.selectionTranslatorMode === "bilingual" ||
									config.selectionTranslatorMode === "translation-only") && (
									<div className="fr-translation-result fr-no-select">
										<pre>{translationResult}</pre>
										<button
											type="button"
											className="fr-text-audio-btn"
											onClick={() => playAudio(translationResult)}
										>
											{isPlaying && currentPlayingText === translationResult
												? t("停")
												: t("听")}
										</button>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}
			{copySuccess && (
				<div
					className={`fr-copy-success-toast ${isDarkTheme ? "fr-dark-theme" : ""}`}
					dir={direction}
				>
					{t("复制译文成功")}
				</div>
			)}
		</>,
		document.body,
	);
}
