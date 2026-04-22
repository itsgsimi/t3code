import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { History, Send, SquarePen, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useBeardyDrawerStore } from "../../sentinel/beardyDrawerStore";
import {
  useSentinelDreamRuns,
  useSentinelHealth,
  useSentinelQueryMutation,
  useSentinelSessionDetail,
  useSentinelSessions,
} from "../../sentinel/hooks";

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
  const detailOpen = useBeardyDrawerStore((state) => state.detailSheetOpen);
  const toggle = useBeardyDrawerStore((state) => state.toggle);
  const health = useSentinelHealth();
  const query = useSentinelQueryMutation();
  const dream = useSentinelDreamRuns();

  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [liveTurns, setLiveTurns] = useState<LiveTurn[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoreId, setRestoreId] = useState<string | undefined>();
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const sessions = useSentinelSessions(20);
  const sessionDetail = useSentinelSessionDetail(restoreId);

  const apiSessions = useMemo(
    () => (sessions.data ?? []).filter((s) => !s.session_id.startsWith("discord:")),
    [sessions.data],
  );

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [open, liveTurns.length]);

  useEffect(() => {
    if (!restoreId || !sessionDetail.data) return;
    const msgs = sessionDetail.data.recent_messages ?? [];
    const hydrated: LiveTurn[] = msgs.map((m, idx) => ({
      id: `${restoreId}-${idx}`,
      role: m.role === "user" ? "user" : "beardy",
      content: m.content,
    }));
    setLiveTurns(hydrated);
    setSessionId(restoreId);
    setHistoryOpen(false);
    setRestoreId(undefined);
  }, [restoreId, sessionDetail.data]);

  if (!open || detailOpen) {
    return null;
  }

  function startNewChat() {
    setSessionId(undefined);
    setLiveTurns([]);
    setHistoryOpen(false);
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
          aria-label="New chat"
          title="New chat"
          onClick={startNewChat}
          className="cursor-pointer border-0 bg-transparent p-1.5 transition-colors"
          style={{ color: "var(--fg-3)" }}
        >
          <SquarePen size={14} />
        </button>
        <button
          type="button"
          aria-label="History"
          title="History"
          onClick={() => setHistoryOpen((v) => !v)}
          className="cursor-pointer border-0 bg-transparent p-1.5 transition-colors"
          style={{ color: historyOpen ? "var(--ember-400)" : "var(--fg-3)" }}
        >
          <History size={14} />
        </button>
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
        {historyOpen ? (
          <SessionHistoryList
            sessions={apiSessions}
            loading={sessions.isLoading}
            activeId={sessionId}
            onPick={(id) => setRestoreId(id)}
          />
        ) : (
          <>
            {liveTurns.length === 0 ? <AmbientGreeting dream={dream.data?.runs?.[0]} /> : null}
            {liveTurns.length > 0 ? <Divider label="now" /> : null}
            {liveTurns.map((turn) =>
              turn.role === "user" ? (
                <UserTurn key={turn.id}>{turn.content}</UserTurn>
              ) : (
                <BeardySay key={turn.id} error={turn.error}>
                  <BeardyMarkdown text={turn.content} />
                </BeardySay>
              ),
            )}
          </>
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

function AmbientGreeting({
  dream,
}: {
  dream: import("../../sentinel/api").SentinelDreamRun | undefined;
}) {
  if (!dream) {
    return (
      <BeardySay>
        Ready when you are. I haven't run a dream cycle yet — trigger one via{" "}
        <Mono>sentinel dream run</Mono> or from the Agents › Dream tab.
      </BeardySay>
    );
  }
  const errorCount = dream.errors?.length ?? 0;
  const ts = dream.last_run ? prettyWhen(dream.last_run) : "recently";
  if (errorCount > 0) {
    return (
      <>
        <Divider label={`last dream · ${ts}`} />
        <BeardySay error>
          <Glance state="down" label={`${errorCount} err`} /> the last dream cycle hit{" "}
          <Mono>{errorCount} error{errorCount === 1 ? "" : "s"}</Mono>. Check{" "}
          <Mono>Agents › Diagnostics</Mono> for the log.
        </BeardySay>
      </>
    );
  }
  const episodes = dream.episodes_ingested ?? 0;
  const pruned = dream.facts_pruned ?? 0;
  const impulses = dream.impulses_stored ?? 0;
  return (
    <>
      <Divider label={`last dream · ${ts}`} />
      <BeardySay>
        <Glance state="dream" label={`${episodes} ep`} /> ingested{" "}
        <Mono>{episodes}</Mono> episode{episodes === 1 ? "" : "s"} and pruned{" "}
        <Mono>{pruned}</Mono> fact{pruned === 1 ? "" : "s"}.
        {impulses > 0 ? (
          <>
            {" "}
            Filed <Mono>{impulses}</Mono> impulse{impulses === 1 ? "" : "s"} worth surfacing.
          </>
        ) : null}
      </BeardySay>
    </>
  );
}

function prettyWhen(iso: string): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "recently";
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 36) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
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
      }}
    >
      {children}
    </div>
  );
}

function BeardyMarkdown({ text }: { text: string }) {
  return (
    <div className="beardy-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p style={{ margin: "0 0 6px", lineHeight: 1.55 }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: "0 0 6px", paddingLeft: 16 }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: "0 0 6px", paddingLeft: 18 }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ margin: "0 0 2px" }}>{children}</li>
          ),
          strong: ({ children }) => (
            <strong style={{ color: "var(--fg-1)" }}>{children}</strong>
          ),
          em: ({ children }) => <em>{children}</em>,
          code: ({ className, children, ...rest }) => {
            const isBlock = (className ?? "").includes("language-");
            if (isBlock) {
              return (
                <pre
                  style={{
                    background: "var(--canvas-2)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: 4,
                    padding: "6px 8px",
                    margin: "4px 0",
                    overflowX: "auto",
                    fontSize: 11,
                  }}
                >
                  <code {...rest}>{children}</code>
                </pre>
              );
            }
            return (
              <code
                style={{
                  background: "var(--canvas-2)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 3,
                  padding: "0 4px",
                  fontSize: 11,
                  color: "var(--fg-1)",
                }}
                {...rest}
              >
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: "var(--ember-400)", textDecoration: "underline" }}
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <div style={{ fontWeight: 600, color: "var(--fg-1)", margin: "6px 0 4px" }}>
              {children}
            </div>
          ),
          h2: ({ children }) => (
            <div style={{ fontWeight: 600, color: "var(--fg-1)", margin: "6px 0 4px" }}>
              {children}
            </div>
          ),
          h3: ({ children }) => (
            <div style={{ fontWeight: 600, color: "var(--fg-1)", margin: "6px 0 4px" }}>
              {children}
            </div>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: "auto", margin: "4px 0 6px" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  fontSize: 11,
                  width: "100%",
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                border: "1px solid var(--border-soft)",
                padding: "3px 6px",
                textAlign: "left",
                background: "var(--canvas-2)",
                color: "var(--fg-1)",
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                border: "1px solid var(--border-soft)",
                padding: "3px 6px",
              }}
            >
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: "2px solid var(--border-default)",
                margin: "4px 0",
                padding: "0 0 0 8px",
                color: "var(--fg-3)",
              }}
            >
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr
              style={{
                border: 0,
                borderTop: "1px solid var(--border-soft)",
                margin: "8px 0",
              }}
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
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

function SessionHistoryList({
  sessions,
  loading,
  activeId,
  onPick,
}: {
  sessions: import("../../sentinel/api").SentinelSession[];
  loading: boolean;
  activeId: string | undefined;
  onPick: (id: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>loading sessions…</div>
    );
  }
  if (sessions.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
        no past conversations yet.
      </div>
    );
  }
  return (
    <>
      <Divider label="history" />
      <ul className="flex flex-col gap-[4px]" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {sessions.map((s) => {
          const active = s.session_id === activeId;
          const when = s.last_activity ?? s.started_at;
          return (
            <li key={s.session_id}>
              <button
                type="button"
                onClick={() => onPick(s.session_id)}
                className="w-full cursor-pointer text-left border-0"
                style={{
                  background: active ? "var(--canvas-3)" : "var(--canvas-2)",
                  border: "1px solid var(--border-soft)",
                  padding: "6px 8px",
                  borderRadius: 5,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  color: "var(--fg-1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span style={{ color: "var(--fg-1)" }}>
                  {s.topic_preview?.trim() || s.session_id}
                </span>
                <span style={{ fontSize: 10, color: "var(--fg-4)" }}>
                  {s.message_count} msg{s.message_count === 1 ? "" : "s"}
                  {when ? ` · ${prettyWhen(when)}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
