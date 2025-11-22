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
                    <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm animate-in slide-in-from-top-2 mb-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                                {editingTagId ? "Edit Tag" : "New Tag"}
                            </span>
                            <button onClick={resetForm}>
                                <X className="h-3 w-3 text-[var(--muted)]" />
                            </button>
                        </div>

                        <input
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="Tag Name"
                            className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:border-[var(--accent)]"
                            autoFocus
                        />

                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setNewTagColor(color)}
                                    className={`w-5 h-5 rounded-full border transition-all ${newTagColor === color
                                            ? "ring-1 ring-offset-1 ring-[var(--foreground)] border-transparent scale-110"
                                            : "border-[var(--border)] hover:scale-105"
                                        }`}
                                    style={{ backgroundColor: `var(--color-${color}-500, #ccc)` }}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={!newTagName.trim()}
                            className="w-full bg-[var(--foreground)] text-[var(--background)] py-1.5 rounded text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                            {editingTagId ? "Update" : "Create"}
                        </button>
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
