import { useEffect, useRef, useState, type ReactNode } from "react";
import { Send, X } from "lucide-react";

import { useBeardyDrawerStore } from "../../sentinel/beardyDrawerStore";
import { useSentinelHealth, useSentinelQueryMutation } from "../../sentinel/hooks";

interface LiveTurn {
  id: string;
  role: "user" | "beardy";
  content: string;
  error?: boolean;
}

/**
 * Beardy — ambient right-rail companion. Mono voice, first-person, no bubbles
 * on Beardy's side. Never hosts harness sessions (those live in the Sessions
 * route). See design README §"Two chat surfaces".
 *
 * The demo conversation at the top stays as-is so the drawer doesn't look
 * empty on first load. Real turns from /v1/query append below it.
 */
export function BeardyDrawer() {
  const open = useBeardyDrawerStore((state) => state.open);
  const toggle = useBeardyDrawerStore((state) => state.toggle);
  const health = useSentinelHealth();
  const query = useSentinelQueryMutation();

  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [liveTurns, setLiveTurns] = useState<LiveTurn[]>([]);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [open, liveTurns.length]);

  if (!open) {
    return null;
  }

  const canSend = draft.trim().length > 0 && !query.isPending;
  const modelName = health.data?.model_name ?? (health.isError ? "offline" : "loading");
  const contextBudget = health.data?.context_length
    ? `${Math.round(health.data.context_length / 1000)}k ctx`
    : "—";

  async function send() {
    if (!canSend) return;
    const text = draft.trim();
    const userId = crypto.randomUUID();
    setDraft("");
    setLiveTurns((prev) => [...prev, { id: userId, role: "user", content: text }]);

    try {
      const res = await query.mutateAsync({
        query: text,
        ...(sessionId ? { session_id: sessionId } : {}),
      });
      setSessionId(res.session_id);
      setLiveTurns((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "beardy", content: res.response },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLiveTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "beardy",
          content: `couldn't reach the api — ${message}`,
          error: true,
        },
      ]);
    }
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
            <span
              className={`ds-dot ds-dot--${health.isError ? "down" : health.data ? "healthy" : "unknown"}`}
              aria-hidden
            />
            {health.isError ? "offline" : health.data ? "awake" : "connecting…"}
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
        <Divider label="example · dream cycle" />
        <BeardySay>
          <Glance state="healthy" label="4/4" /> Nothing regressed overnight. Ran a dream pass at
          03:12 — wrote <Mono>14 insights</Mono>, pruned <Mono>312 stale facts</Mono> from graphiti.
        </BeardySay>
        <BeardySay>
          One nag: <Mono>beardy-tool-routing</Mono> eval hasn't run in 9 days. Last score{" "}
          <Mono>89.4%</Mono>.
        </BeardySay>

        {liveTurns.length > 0 ? <Divider label="now" /> : null}
        {liveTurns.map((turn) =>
          turn.role === "user" ? (
            <UserTurn key={turn.id}>{turn.content}</UserTurn>
          ) : (
            <BeardySay key={turn.id} error={turn.error}>
              {turn.content}
            </BeardySay>
          ),
        )}
        {query.isPending ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              padding: "2px 2px",
            }}
          >
            <span className="ds-dot ds-dot--busy" aria-hidden /> beardy is thinking…
          </div>
        ) : null}
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
                  void send();
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
            onClick={() => void send()}
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
          <span>{modelName}</span>
          <span>·</span>
          <span>{contextBudget}</span>
          <span style={{ marginLeft: "auto" }}>⏎ send</span>
        </div>
      </footer>
    </aside>
  );
}

function BeardySay({ children, error }: { children: ReactNode; error?: boolean | undefined }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.55,
        color: error ? "var(--state-down-fg)" : "var(--fg-2)",
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
      className="flex items-center gap-2"
      style={{
        margin: "10px 0 2px",
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
