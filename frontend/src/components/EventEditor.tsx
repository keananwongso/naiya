import { X, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Tag, Recurrence, DayKey } from "shared/types";

type Base44Event = {
  id: string;
  originalId: string;
  title: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  color?: string;
  tagId?: string;
};

type Props = {
  event: Base44Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Base44Event, recurrence?: Recurrence) => void;
  onDelete: (id: string) => void;
  tags: Tag[];
};

export function EventEditor({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
  tags,
}: Props) {
  const [editedEvent, setEditedEvent] = useState<Base44Event | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>({ type: "none" });

  useEffect(() => {
    setEditedEvent(event);
    setRecurrence({ type: "none" }); // Reset recurrence on new event open
  }, [event]);

  if (!isOpen || !editedEvent) return null;

  const handleTagSelect = (tag: Tag) => {
    if (editedEvent.tagId === tag.id) {
      // Unselect if already selected
      setEditedEvent({
        ...editedEvent,
        tagId: undefined,
        color: undefined, // Or reset to default color if needed, but undefined works for fallback logic
      });
    } else {
      setEditedEvent({
        ...editedEvent,
        tagId: tag.id,
        color: tag.color,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-[400px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-start justify-between mb-6">
          <input
            value={editedEvent.title}
            onChange={(e) =>
              setEditedEvent({ ...editedEvent, title: e.target.value })
            }
            className="text-2xl font-semibold bg-transparent border-none focus:outline-none w-full text-[var(--foreground)] placeholder:text-[var(--muted)]/50"
            placeholder="Event Title"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--background)] rounded-lg transition-colors ml-2"
          >
            <X className="h-5 w-5 text-[var(--muted)]" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Tags Section */}
          <div>
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider block mb-2">
              Tag
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagSelect(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${editedEvent.tagId === tag.id
                    ? "ring-2 ring-offset-1 ring-[var(--foreground)] border-transparent"
                    : "border-[var(--border)] hover:border-[var(--accent)]"
                    }`}
                  style={{
                    backgroundColor: `var(--color-${tag.color}-500, #eee)`,
                    borderColor: editedEvent.tagId === tag.id ? "transparent" : undefined,
                  }}
                >
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <span className="text-xs text-[var(--muted)]">No tags available. Create one in the sidebar!</span>
              )}
            </div>
          </div>

          {/* Recurrence Section */}
          <div>
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider block mb-2">
              Repeat
            </label>
            <select
              value={recurrence.type}
              onChange={(e) => setRecurrence({ ...recurrence, type: e.target.value as Recurrence["type"] })}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>

            {recurrence.type === "custom" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as DayKey[]).map((day) => (
                  <button
                    key={day}
                    onClick={() => {
                      const currentDays = recurrence.days || [];
                      const newDays = currentDays.includes(day)
                        ? currentDays.filter((d) => d !== day)
                        : [...currentDays, day];
                      setRecurrence({ ...recurrence, days: newDays });
                    }}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${recurrence.days?.includes(day)
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
                      }`}
                  >
                    {day.charAt(0)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-8 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => {
              onDelete(editedEvent.originalId || editedEvent.id);
              onClose();
            }}
            className="text-red-500/80 hover:text-red-600 flex items-center gap-2 text-sm font-medium px-3 py-2 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button
            onClick={() => {
              onSave(editedEvent, recurrence);
              onClose();
            }}
            className="bg-[var(--foreground)] text-[var(--background)] px-6 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

