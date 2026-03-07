import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { RiTranslate } from "react-icons/ri";
import { useI18n } from "@/entrypoints/ui/i18n/I18nProvider";
import { config } from "@/entrypoints/utils/config";

const BALL_SIZE = 32;
const ICON_SIZE = 18;
const SIDE_OFFSET = 16;
const EDGE_PADDING = 12;

interface FloatingBallProps {
	position: "left" | "right";
	isTranslating: boolean;
	onToggle: () => void;
	onPositionChanged: (position: "left" | "right") => void;
}

export default function FloatingBall({
	position,
	isTranslating,
	onToggle,
	onPositionChanged,
}: FloatingBallProps) {
	const { t } = useI18n();
	const [internalPosition, setInternalPosition] = useState<"left" | "right">(
		position,
	);
	const [isDragging, setIsDragging] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [dragY, setDragY] = useState<number | null>(null);
	const [coords, setCoords] = useState({ x: 0, y: 0 });
	const nodeRef = useRef<HTMLButtonElement | null>(null);
	const dragStartRef = useRef({ x: 0, y: 0, moved: false });

	useEffect(() => {
		setInternalPosition(position);
	}, [position]);

	useEffect(() => {
		const onMove = (event: MouseEvent) => {
			if (!isDragging) {
				return;
			}
			const nextY = Math.min(
				window.innerHeight - BALL_SIZE - EDGE_PADDING,
				Math.max(
					EDGE_PADDING,
					coords.y + (event.clientY - dragStartRef.current.y),
				),
			);
			dragStartRef.current.moved = true;
			setCoords((prev) => ({ ...prev, y: nextY }));
			dragStartRef.current.x = event.clientX;
			dragStartRef.current.y = event.clientY;
		};

		const onUp = () => {
			if (!isDragging) {
				return;
			}
			setIsDragging(false);
			setInternalPosition(position);
			onPositionChanged(position);
			setDragY(
				Math.min(
					window.innerHeight - BALL_SIZE / 2 - EDGE_PADDING,
					Math.max(EDGE_PADDING + BALL_SIZE / 2, coords.y + BALL_SIZE / 2),
				),
			);
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};

		if (isDragging) {
			window.addEventListener("mousemove", onMove);
			window.addEventListener("mouseup", onUp);
		}
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [coords.y, isDragging, onPositionChanged, position]);

	const style = useMemo<CSSProperties>(() => {
		const baseStyle: CSSProperties = {
			position: "fixed",
			zIndex: 2147483647,
			width: `${BALL_SIZE}px`,
			height: `${BALL_SIZE}px`,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			padding: 0,
			margin: 0,
			border: "none",
			borderRadius: 0,
			background: "transparent",
			boxSizing: "border-box",
			cursor: isDragging ? "grabbing" : "pointer",
			userSelect: "none",
			appearance: "none",
			WebkitAppearance: "none",
			outline: "none",
			fontSize: 0,
			lineHeight: 0,
			overflow: "visible",
			opacity: isExpanded || isTranslating ? 1 : 0.84,
			transition: config.animations
				? "transform 150ms ease, opacity 180ms ease"
				: undefined,
		};
		const offsetStyle =
			internalPosition === "left"
				? { left: `${SIDE_OFFSET}px` }
				: { right: `${SIDE_OFFSET}px` };
		if (isDragging) {
			return {
				...baseStyle,
				...offsetStyle,
				top: `${coords.y}px`,
				transform: "scale(1.04)",
			};
		}
		return {
			...baseStyle,
			...offsetStyle,
			top: dragY === null ? "50%" : `${dragY}px`,
			transform: `translateY(-50%) scale(${isExpanded ? 1.05 : 1})`,
		};
	}, [
		coords.y,
		dragY,
		internalPosition,
		isDragging,
		isExpanded,
		isTranslating,
	]);

	const iconStyle = useMemo<CSSProperties>(
		() => ({
			width: `${ICON_SIZE}px`,
			height: `${ICON_SIZE}px`,
			display: "block",
			pointerEvents: "none",
			color: isTranslating ? "#059669" : "#334155",
			filter: isTranslating
				? "drop-shadow(0 1px 2px rgba(16, 185, 129, 0.16))"
				: "drop-shadow(0 1px 2px rgba(15, 23, 42, 0.12))",
		}),
		[isTranslating],
	);

	const shellStyle = useMemo<CSSProperties>(
		() => ({
			width: "100%",
			height: "100%",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			borderRadius: "9999px",
			background: isTranslating
				? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(236,253,245,0.98) 100%)"
				: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.98) 100%)",
			border: isTranslating
				? "1px solid rgba(16, 185, 129, 0.22)"
				: "1px solid rgba(148, 163, 184, 0.24)",
			boxSizing: "border-box",
			boxShadow: isTranslating
				? "0 6px 16px rgba(16, 185, 129, 0.14), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(16,185,129,0.06)"
				: "0 6px 16px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(148,163,184,0.08)",
		}),
		[isTranslating],
	);

	const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (!nodeRef.current || event.button !== 0) {
			return;
		}
		const rect = nodeRef.current.getBoundingClientRect();
		setCoords({ x: rect.left, y: rect.top });
		dragStartRef.current = { x: event.clientX, y: event.clientY, moved: false };
		setIsDragging(true);
		setIsExpanded(false);
	};

	const handleClick = () => {
		if (dragStartRef.current.moved) {
			dragStartRef.current.moved = false;
			return;
		}
		onToggle();
	};

	return (
		<button
			ref={nodeRef}
			type="button"
			id="fluent-read-floating-ball"
			aria-label={isTranslating ? t("关闭全文翻译") : t("开启全文翻译")}
			onMouseDown={handleMouseDown}
			onClick={handleClick}
			onMouseEnter={() => setIsExpanded(true)}
			onMouseLeave={() => setIsExpanded(false)}
			style={style}
		>
			<span style={shellStyle}>
				<RiTranslate aria-hidden="true" style={iconStyle} />
			</span>
		</button>
	);
}
