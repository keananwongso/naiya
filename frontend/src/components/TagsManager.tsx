"use client";

import { useState } from "react";
import { Plus, X, Trash2, Edit2 } from "lucide-react";
import { Tag } from "shared/types";

const COLORS = [
    "sage",
    "lavender",
    "coral",
    "sky",
    "amber",
    "emerald",
    "rose",
    "indigo",
];

type Props = {
    tags: Tag[];
    onAddTag: (tag: Tag) => void;
    onUpdateTag: (tag: Tag) => void;
    onDeleteTag: (id: string) => void;
};

export function TagsManager({ tags, onAddTag, onUpdateTag, onDeleteTag }: Props) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingTagId, setEditingTagId] = useState<string | null>(null);

    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState(COLORS[0]);

    const resetForm = () => {
        setNewTagName("");
        setNewTagColor(COLORS[0]);
        setIsAdding(false);
        setEditingTagId(null);
    };

    const handleSave = () => {
        if (!newTagName.trim()) return;

        if (editingTagId) {
            onUpdateTag({
                id: editingTagId,
                name: newTagName,
                color: newTagColor,
            });
        } else {
            onAddTag({
                id: `tag-${Date.now()}`,
                name: newTagName,
                color: newTagColor,
            });
        }
        resetForm();
    };

    const startEditing = (tag: Tag) => {
        setNewTagName(tag.name);
        setNewTagColor(tag.color);
        setEditingTagId(tag.id);
        setIsAdding(true);
    };

    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
                    Tags
                </h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="p-1 hover:bg-[var(--surface-hover)] rounded-md transition-colors"
                    title="Add Tag"
                >
                    <Plus className="h-4 w-4 text-[var(--muted)] hover:text-[var(--foreground)]" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-sm bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-lg font-semibold text-[var(--foreground)]">
                                    {editingTagId ? "Edit Tag" : "Create New Tag"}
                                </span>
                                <button onClick={resetForm} className="p-1 hover:bg-[var(--surface-hover)] rounded-full transition-colors">
                                    <X className="h-5 w-5 text-[var(--muted)]" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5 block">
                                        Tag Name
                                    </label>
                                    <input
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        placeholder="e.g., Deep Work"
                                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                                        Color
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setNewTagColor(color)}
                                                className={`w-8 h-8 rounded-full transition-all ${newTagColor === color
                                                    ? "ring-2 ring-offset-2 ring-[var(--foreground)] scale-110"
                                                    : "hover:scale-110 hover:opacity-80"
                                                    }`}
                                                style={{ backgroundColor: `var(--color-${color}-500, #ccc)` }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        onClick={resetForm}
                                        className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={!newTagName.trim()}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--foreground)] text-[var(--background)] text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity shadow-sm"
                                    >
                                        {editingTagId ? "Save Changes" : "Create Tag"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tags.map((tag) => (
                    <div
                        key={tag.id}
                        className="group flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors border border-transparent hover:border-[var(--border)]"
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: `var(--color-${tag.color}-500, #ccc)` }}
                            />
                            <span className="text-sm font-medium text-[var(--foreground)]">
                                {tag.name}
                            </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => startEditing(tag)}
                                className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                            >
                                <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                                onClick={() => onDeleteTag(tag.id)}
                                className="p-1 text-[var(--muted)] hover:text-red-500"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ))}

                {tags.length === 0 && !isAdding && (
                    <p className="text-xs text-[var(--muted)] text-center py-4">
                        No tags yet. Create one to organize your schedule!
                    </p>
                )}
            </div>
        </div>
    );
}
