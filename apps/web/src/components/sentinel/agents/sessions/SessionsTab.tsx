import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useSentinelSessions } from "../../../../sentinel/hooks";
import type { SentinelSession } from "../../../../sentinel/api";
import { Card } from "../_shared";

export function SessionsTab() {
  const [query, setQuery] = useState("");
  const sessions = useSentinelSessions(200);
  const rows = sessions.data ?? [];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.session_id.toLowerCase().includes(q) ||
          (r.topic_preview ?? "").toLowerCase().includes(q),
      )
    : rows;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by session id or topic…"
          style={{
            flex: 1,
            maxWidth: 360,
            padding: "6px 10px",
            background: "var(--canvas-2)",
            border: "1px solid var(--border-soft)",
            borderRadius: 4,
            color: "var(--fg-1)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            outline: "none",
          }}
        />
        <span
          style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}
        >
          {filtered.length} of {rows.length} sessions
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => sessions.refetch()}
          disabled={sessions.isLoading}
          aria-label="Refresh"
        >
          <RefreshCw className={sessions.isLoading ? "animate-spin" : ""} />
        </Button>
      </div>
      <Card>
        {sessions.isError ? (
          <div
            style={{
              padding: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--state-down-fg)",
            }}
          >
            Can't reach /v1/sessions — {(sessions.error as Error).message}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-4)",
            }}
          >
            {q
              ? `No sessions matching "${query}".`
              : sessions.isLoading
                ? "Loading…"
                : "No sessions yet."}
          </div>
        ) : (
          filtered.map((s, i) => (
            <SessionRow
              key={s.session_id}
              session={s}
              last={i === filtered.length - 1}
            />
          ))
        )}
      </Card>
    </div>
  );
}

function SessionRow({ session, last }: { session: SentinelSession; last: boolean }) {
  const started = session.started_at ?? "—";
  const msgs = session.message_count;
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      <div className="flex items-center gap-2" style={{ color: "var(--fg-1)" }}>
        <span style={{ wordBreak: "break-all" }}>{session.session_id}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            color: "var(--fg-4)",
          }}
        >
          {msgs} msg{msgs === 1 ? "" : "s"}
        </span>
      </div>
      {session.topic_preview ? (
        <div
          style={{
            color: "var(--fg-2)",
            fontFamily: "var(--font-sans)",
            marginTop: 3,
            fontSize: 12,
          }}
        >
          {session.topic_preview}
        </div>
      ) : null}
      <div style={{ color: "var(--fg-4)", fontSize: 10.5, marginTop: 3 }}>
        started {started} · last {session.last_activity ?? "—"}
      </div>
    </div>
  );
}
