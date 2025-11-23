"use client";

import { X } from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mode: "single" | "future" | "all") => void;
};

export function RecurringEditModal({ isOpen, onClose, onConfirm }: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="w-[320px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Edit recurring event</h3>
                    <button onClick={onClose} className="p-1 hover:bg-[var(--background)] rounded-lg transition-colors">
                        <X className="h-4 w-4 text-[var(--muted)]" />
                    </button>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => onConfirm("single")}
                        className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--background)] hover:border-[var(--accent)] transition-all group"
                    >
                        <div className="font-medium text-[var(--foreground)]">This event</div>
                        <div className="text-xs text-[var(--muted)] group-hover:text-[var(--foreground)]/70">
                            Only this instance will be changed
                        </div>
                    </button>

                    <button
                        onClick={() => onConfirm("future")}
                        className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--background)] hover:border-[var(--accent)] transition-all group"
                    >
                        <div className="font-medium text-[var(--foreground)]">This and following events</div>
                        <div className="text-xs text-[var(--muted)] group-hover:text-[var(--foreground)]/70">
                            This and all future instances
                        </div>
                    </button>

                    <button
                        onClick={() => onConfirm("all")}
                        className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--background)] hover:border-[var(--accent)] transition-all group"
                    >
                        <div className="font-medium text-[var(--foreground)]">All events</div>
                        <div className="text-xs text-[var(--muted)] group-hover:text-[var(--foreground)]/70">
                            Every instance in the series
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
