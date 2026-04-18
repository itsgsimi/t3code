import { useEffect, useRef, useState, type ReactNode } from "react";
import { Send, X } from "lucide-react";

import { useBeardyDrawerStore } from "../../sentinel/beardyDrawerStore";

/**
 * Beardy — ambient right-rail companion. Mono voice, first-person, no bubbles
 * on Beardy's side. Never hosts harness sessions (those live in the Sessions
 * route). See design README §"Two chat surfaces".
 */
export function BeardyDrawer() {
  const open = useBeardyDrawerStore((state) => state.open);
  const toggle = useBeardyDrawerStore((state) => state.toggle);

  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const canSend = draft.trim().length > 0;

  function send() {
    // Mocked for this pass — the Sentinel API wiring is a later phase.
    setDraft("");
  }

  return (
    <aside
      aria-label="Beardy"
      className="flex h-full shrink-0 flex-col"
      style={{
        width: 360,
        background: "var(--canvas-1)",
        borderLeft: "1px solid var(--border-soft)",
      }}
    >
      <header
        className="flex shrink-0 items-center gap-[9px]"
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div
          aria-hidden
          className="overflow-hidden"
          style={{
            width: 24,
            height: 24,
            borderRadius: 5,
            background: "var(--canvas-3)",
          }}
        >
          <img src="/beardy/beardy.png" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col">
          <span style={{ fontSize: 12.5, color: "var(--fg-1)", fontWeight: 500 }}>Beardy</span>
          <span
            className="flex items-center gap-[6px]"
            style={{
              fontSize: 10.5,
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span className="ds-dot ds-dot--healthy" aria-hidden />
            awake · 14d uptime
          </span>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          aria-label="Close Beardy"
          onClick={() => toggle()}
          className="cursor-pointer border-0 bg-transparent p-1.5 transition-colors"
          style={{ color: "var(--fg-3)" }}
        >
          <X size={14} />
        </button>
      </header>

      <div
        ref={bodyRef}
        className="flex flex-1 flex-col gap-[10px] overflow-auto"
        style={{
          padding: "12px 12px 4px",
          fontFamily: "var(--font-mono)",
        }}
      >
        <Divider label="03:12 · dream cycle" />
        <BeardySay>
          <Glance state="healthy" label="4/4" /> Nothing regressed overnight. Ran a dream pass at
          03:12 — wrote <Mono>14 insights</Mono>, pruned <Mono>312 stale facts</Mono> from graphiti.
        </BeardySay>
        <BeardySay>
          One nag: <Mono>beardy-tool-routing</Mono> eval hasn't run in 9 days. Last score{" "}
          <Mono>89.4%</Mono>.
        </BeardySay>

        <Divider label="08:14 · now" />

        <UserTurn>what's using disk?</UserTurn>
        <BeardySay>
          <Glance state="degraded" label="87%" /> Mostly <Mono>~/models/quarantine</Mono> (41 GB —
          three half-failed Q4 pulls) and <Mono>~/sessions/archive</Mono> (22 GB). I can prune the
          quarantine dir safely. Want me to?
        </BeardySay>

        <UserTurn>yeah, go</UserTurn>
        <BeardySay>
          <Mono>fs.prune ~/models/quarantine</Mono> → freed <Mono>41.2 GB</Mono>. Disk now at{" "}
          <Mono>54%</Mono>. Noted in memory.
        </BeardySay>
      </div>

      <footer
        className="shrink-0"
        style={{
          padding: 10,
          borderTop: "1px solid var(--border-soft)",
        }}
      >
        <div
          className="flex items-end gap-[6px]"
          style={{
            background: "var(--canvas-2)",
            border: "1px solid var(--border-default)",
            borderRadius: 6,
            padding: 6,
          }}
        >
          <span
            aria-hidden
            style={{
              color: "var(--ember-400)",
              fontFamily: "var(--font-mono)",
              marginRight: 6,
              userSelect: "none",
            }}
          >
            ›
          </span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) {
                  send();
                }
              }
            }}
            placeholder="ask beardy"
            rows={1}
            className="flex-1 border-0 bg-transparent outline-none"
            style={{
              color: "var(--fg-1)",
              fontSize: 12.5,
              fontFamily: "var(--font-mono)",
              resize: "none",
              minHeight: 20,
              maxHeight: 120,
              padding: "3px 4px",
            }}
          />
          <button
            type="button"
            aria-label="Send"
            onClick={send}
            disabled={!canSend}
            className="flex items-center justify-center border-0"
            style={{
              width: 26,
              height: 26,
              borderRadius: 4,
              background: canSend ? "var(--ember-400)" : "var(--canvas-3)",
              color: canSend ? "var(--fg-on-accent)" : "var(--fg-4)",
              cursor: canSend ? "pointer" : "default",
            }}
          >
            <Send size={12} />
          </button>
        </div>
        <div
          className="mt-[6px] flex gap-[10px]"
          style={{
            fontSize: 10,
            color: "var(--fg-4)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>qwen3.5-122b</span>
          <span>·</span>
          <span>ctx 87k / 128k</span>
          <span style={{ marginLeft: "auto" }}>⏎ send</span>
        </div>
      </footer>
    </aside>
  );
}

function BeardySay({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.55,
        color: "var(--fg-2)",
        padding: "2px 2px",
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span style={{ color: "var(--fg-1)" }}>{children}</span>;
}

function Glance({
  state,
  label,
}: {
  state: "healthy" | "busy" | "degraded" | "down" | "dream" | "unknown";
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-[6px]"
      style={{
        padding: "2px 7px",
        borderRadius: 3,
        background: "var(--canvas-2)",
        border: "1px solid var(--border-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--fg-1)",
        marginRight: 4,
        verticalAlign: 1,
      }}
    >
      <span className={`ds-dot ds-dot--${state}`} aria-hidden />
      {label}
    </span>
  );
}

function UserTurn({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 flex justify-end">
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12.5,
          lineHeight: 1.4,
          color: "var(--fg-1)",
          background: "var(--canvas-3)",
          border: "1px solid var(--border-default)",
          padding: "6px 10px",
          borderRadius: 6,
          maxWidth: 260,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div
      className="my-[10px_0_2px] flex items-center gap-2"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--fg-4)",
        letterSpacing: "0.06em",
      }}
    >
      <span>{label}</span>
      <span aria-hidden className="h-px flex-1" style={{ background: "var(--border-soft)" }} />
    </div>
  );
}
