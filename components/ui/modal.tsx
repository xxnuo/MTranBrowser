import type * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	children: React.ReactNode;
	className?: string;
}

export function Modal({
	open,
	onOpenChange,
	title,
	children,
	className,
}: ModalProps) {
	if (!open) {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/40 p-4">
			<div
				className={cn(
					"w-full max-w-md rounded-lg border bg-background p-4 shadow-xl",
					className,
				)}
			>
				<div className="mb-3 flex items-center justify-between">
					<div className="text-sm font-semibold">{title}</div>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					>
						关闭
					</button>
				</div>
				{children}
			</div>
		</div>,
		document.body,
	);
}
