import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  useSentinelActivityLog,
  useSentinelActivitySources,
  useSentinelBriefingEvents,
  useSentinelBriefingRuns,
  useSentinelTriggerBriefing,
} from "../../../../sentinel/hooks";
import type {
  ActivityLogLevel,
  BriefingRun,
} from "../../../../sentinel/api";
import { Card } from "../_shared";
import { useDebounced } from "../dream/dreamHelpers";
import { relativeFromTimestamp } from "./diagnosticsHelpers";

export function DiagnosticsTab() {
  const [source, setSource] = useState<string>("api");
  const [level, setLevel] = useState<ActivityLogLevel>("WARNING");
  const [containsInput, setContainsInput] = useState<string>("");
  const contains = useDebounced(containsInput, 350);
  const briefing = useSentinelBriefingEvents(20);
  const briefingRuns = useSentinelBriefingRuns(10);
  const triggerBriefing = useSentinelTriggerBriefing();
  const sources = useSentinelActivitySources();
  const logs = useSentinelActivityLog({
    source,
    level,
    ...(contains ? { contains } : {}),
    limit: 150,
  });
  const events = briefing.data?.events ?? [];
  const runs = briefingRuns.data?.runs ?? [];
  const records = logs.data?.records ?? [];
  const sourceList = sources.data?.sources ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div
          className="mb-2 flex items-center gap-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--fg-2)",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          Briefing runs
          <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
            one record per run with the actual response body
          </span>
          <div style={{ flex: 1 }} />
          {triggerBriefing.isError ? (
            <span
              style={{
                fontSize: 10.5,
                color: "var(--state-down-fg)",
                fontFamily: "var(--font-mono)",
              }}
              title={(triggerBriefing.error as Error).message}
            >
              trigger failed — hover
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => triggerBriefing.mutate()}
            disabled={triggerBriefing.isPending}
            className="flex cursor-pointer items-center gap-[6px] border-0"
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              background: triggerBriefing.isPending
                ? "var(--canvas-3)"
                : "var(--ember-400)",
              color: triggerBriefing.isPending
                ? "var(--fg-3)"
                : "var(--fg-on-accent)",
              fontSize: 11.5,
              fontFamily: "var(--font-mono)",
              cursor: triggerBriefing.isPending ? "default" : "pointer",
            }}
          >
            {triggerBriefing.isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : null}
            {triggerBriefing.isPending ? "Firing…" : "Re-fire briefing"}
          </button>
        </div>
        <Card>
          {runs.length === 0 ? (
            <div
              style={{
                padding: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-4)",
              }}
            >
              No briefing runs recorded yet. Runs land here once the bridge fires a scheduled
              or manually-triggered briefing.
            </div>
          ) : (
            runs.map((r, i) => (
              <BriefingRunRow
                key={`${r.started_at}-${i}`}
                run={r}
                last={i === runs.length - 1}
              />
            ))
          )}
        </Card>
      </div>

      <div>
        <div
          className="mb-2 flex items-center gap-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--fg-2)",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          Briefing log events
          <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
            start / sent / failed lines parsed from assistant.log
          </span>
        </div>
        <Card>
          {events.length === 0 ? (
            <div
              style={{
                padding: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-4)",
              }}
            >
              No briefing events in the current log window.
            </div>
          ) : (
            events.map((e, i) => (
              <BriefingEventRow
                key={`${e.timestamp}-${e.event}`}
                timestamp={e.timestamp}
                event={e.event}
                detail={e.detail}
                last={i === events.length - 1}
              />
            ))
          )}
        </Card>
      </div>

      <div>
        <div
          className="mb-2 flex items-center gap-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--fg-2)",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          Recent log records
          <div style={{ flex: 1 }} />
          <input
            value={containsInput}
            onChange={(e) => setContainsInput(e.target.value)}
            placeholder="filter by text…"
            style={{
              width: 170,
              padding: "4px 8px",
              background: "var(--canvas-3)",
              border: "1px solid var(--border-soft)",
              borderRadius: 4,
              color: "var(--fg-1)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              outline: "none",
            }}
          />
          <LogFilterSelect
            label="source"
            value={source}
            onChange={setSource}
            options={
              sourceList.length > 0 ? sourceList.map((s) => s.key) : ["api"]
            }
          />
          <LogFilterSelect
            label="min level"
            value={level}
            onChange={(v) => setLevel(v as ActivityLogLevel)}
            options={["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]}
          />
        </div>
        <Card>
          {logs.isError ? (
            <div
              style={{
                padding: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--state-down-fg)",
              }}
            >
              {(logs.error as Error).message}
            </div>
          ) : records.length === 0 ? (
            <div
              style={{
                padding: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-4)",
              }}
            >
              No records at {level} or above.
            </div>
          ) : (
            records.map((r, i) => (
              <LogRow
                key={`${r.timestamp}-${i}`}
                record={r}
                last={i === records.length - 1}
              />
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function BriefingRunRow({ run, last }: { run: BriefingRun; last: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const color =
    run.status === "ok"
      ? "var(--state-healthy-fg)"
      : run.status === "failed"
        ? "var(--state-down-fg)"
        : "var(--fg-4)";
  const dot =
    run.status === "ok" ? "healthy" : run.status === "failed" ? "down" : "unknown";
  const duration =
    typeof run.duration_seconds === "number"
      ? `${run.duration_seconds.toFixed(1)}s`
      : "—";
  const response = run.response ?? "";
  return (
    <div
      style={{
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "11px 14px",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span className={`ds-dot ds-dot--${dot}`} style={{ marginTop: 7 }} aria-hidden />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="flex items-center gap-2"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
          >
            <span style={{ color }}>{run.status}</span>
            <span style={{ color: "var(--fg-1)" }}>{run.started_at}</span>
            <span style={{ color: "var(--fg-4)", fontSize: 11 }}>· {duration}</span>
            {run.channel_id ? (
              <span style={{ color: "var(--fg-4)", fontSize: 11 }}>
                · channel {run.channel_id}
              </span>
            ) : null}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              marginTop: 3,
            }}
          >
            {typeof run.response_chars === "number" ? `${run.response_chars} chars` : "0 chars"}
            {typeof run.chunks_sent === "number" ? ` · ${run.chunks_sent} sent` : ""}
            {typeof run.feed_sections === "number" && run.feed_sections > 0
              ? ` · ${run.feed_sections} feed sections (${run.feed_items ?? 0} items)`
              : ""}
            {run.session_id ? ` · ${run.session_id}` : ""}
          </div>
          {run.error ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--state-down-fg)",
                marginTop: 4,
                wordBreak: "break-all",
              }}
            >
              {run.error}
            </div>
          ) : null}
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--fg-4)",
          }}
        >
          {expanded ? "hide" : "show"} response
        </span>
      </button>
      {expanded ? (
        <pre
          style={{
            margin: 0,
            padding: "10px 14px 14px 36px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-2)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 360,
            overflow: "auto",
            borderTop: "1px dashed var(--border-soft)",
            background: "var(--canvas-2)",
          }}
        >
          {response.trim() === ""
            ? "(empty — agent returned no text)"
            : response}
        </pre>
      ) : null}
    </div>
  );
}

function BriefingEventRow({
  timestamp,
  event,
  detail,
  last,
}: {
  timestamp: string;
  event: string;
  detail: Record<string, string>;
  last: boolean;
}) {
  const kind = event.toLowerCase().includes("fail")
    ? "down"
    : event.toLowerCase().includes("sent")
      ? "healthy"
      : "busy";
  return (
    <div
      className="flex items-start gap-3"
      style={{
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontSize: 12,
      }}
    >
      <span className={`ds-dot ds-dot--${kind}`} style={{ marginTop: 7 }} aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="flex items-center gap-2"
          style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}
        >
          <span>{event}</span>
          <span style={{ color: "var(--fg-4)", fontSize: 11 }}>{timestamp}</span>
        </div>
        {Object.keys(detail).length > 0 ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              marginTop: 3,
              wordBreak: "break-all",
            }}
          >
            {Object.entries(detail)
              .map(([k, v]) => `${k}=${v}`)
              .join(" · ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LogRow({
  record,
  last,
}: {
  record: { timestamp: string; logger: string; level: string; message: string };
  last: boolean;
}) {
  const levelColor =
    record.level === "ERROR" || record.level === "CRITICAL"
      ? "var(--state-down-fg)"
      : record.level === "WARNING"
        ? "var(--state-degraded-fg)"
        : "var(--fg-3)";
  const relative = relativeFromTimestamp(record.timestamp);
  return (
    <div
      style={{
        padding: "9px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
      }}
    >
      <div className="flex items-center gap-2" style={{ color: "var(--fg-4)" }}>
        <span title={record.timestamp} style={{ color: "var(--fg-3)" }}>
          {relative}
        </span>
        <span style={{ color: levelColor }}>{record.level}</span>
        <span style={{ color: "var(--fg-4)" }}>{record.logger}</span>
      </div>
      <div
        style={{
          color: "var(--fg-2)",
          marginTop: 3,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {record.message}
      </div>
    </div>
  );
}

function LogFilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
}) {
  return (
    <label
      className="flex items-center gap-[6px]"
      style={{
        fontSize: 10.5,
        fontFamily: "var(--font-mono)",
        color: "var(--fg-4)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "3px 8px",
          borderRadius: 4,
          background: "var(--canvas-3)",
          border: "1px solid var(--border-soft)",
          color: "var(--fg-1)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
