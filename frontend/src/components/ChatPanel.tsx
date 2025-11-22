type ChatMessage = {
  role: "user" | "naiya";
  text: string;
  tag?: string;
};

type Props = {
  transcript: ChatMessage[];
  notes?: string[];
};

export function ChatPanel({ transcript, notes = [] }: Props) {
  return (
    <section className="card rounded-3xl p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Chat adjustments
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Ask in plain language. Naiya rebalances around you.
          </h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
          Natural language edits
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {transcript.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "naiya" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
                message.role === "naiya"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-800"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                <span>{message.role === "naiya" ? "Naiya" : "You"}</span>
                {message.tag && (
                  <span className="rounded-full border border-current px-2 py-0.5 text-[10px]">
                    {message.tag}
                  </span>
                )}
              </div>
              <p className="mt-1">{message.text}</p>
            </div>
          </div>
        ))}
      </div>

      {notes.length ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
            What Naiya considered
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {notes.map((note, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
