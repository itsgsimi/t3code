import { useState } from "react";

import {
  useSentinelRecordTracingScore,
  useSentinelTracingMetrics,
  useSentinelTracingTrace,
  useSentinelTracingTraces,
} from "../../../../sentinel/hooks";
import type {
  TracingScoreInput,
  TracingTraceFull,
} from "../../../../sentinel/api";
import { Card, CardHead, KV, MiniStat } from "../_shared";
import { relativeFromTimestamp } from "../diagnostics/diagnosticsHelpers";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export function TracingTab() {
  const metrics = useSentinelTracingMetrics();
  const [filterName, setFilterName] = useState<string>("");
  const [filterSession, setFilterSession] = useState<string>("");
  const traces = useSentinelTracingTraces(
    50,
    filterName || undefined,
    filterSession || undefined,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useSentinelTracingTrace(selectedId);

  const m = metrics.data?.metrics;
  const queueDepth = m?.queue_depth ?? 0;
  const writes = m?.rows_written_total ?? 0;
  const errors = m?.write_errors ?? 0;
  const flushMs = m?.flush_ms_ema ?? 0;
  const traceCount = metrics.data?.trace_count ?? 0;
  const dbBytes = m?.db_size_bytes ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHead>Writer</CardHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          <MiniStat label="traces" value={String(traceCount)} />
          <MiniStat label="queue" value={String(queueDepth)} />
          <MiniStat label="writes" value={writes.toLocaleString()} />
          <MiniStat label="errors" value={String(errors)} />
          <MiniStat label="flush ema" value={`${flushMs.toFixed(2)} ms`} />
          <MiniStat label="db size" value={formatBytes(dbBytes)} />
        </div>
      </Card>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)" }}
      >
        <Card>
          <CardHead>
            <span>Recent traces</span>
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="name"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "3px 7px",
                  borderRadius: 4,
                  background: "var(--canvas-2)",
                  border: "1px solid var(--border-soft)",
                  color: "var(--fg-1)",
                  width: 120,
                }}
              />
              <input
                type="text"
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                placeholder="session_id"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "3px 7px",
                  borderRadius: 4,
                  background: "var(--canvas-2)",
                  border: "1px solid var(--border-soft)",
                  color: "var(--fg-1)",
                  width: 140,
                }}
              />
            </span>
          </CardHead>
          {traces.isLoading ? (
            <div
              style={{
                padding: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-4)",
              }}
            >
              Loading…
            </div>
          ) : (traces.data?.traces ?? []).length === 0 ? (
            <div
              style={{
                padding: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-3)",
              }}
            >
              {traces.data?.detail ?? "No traces yet."}
            </div>
          ) : (
            <div
              style={{
                maxHeight: "calc(100vh - 360px)",
                overflow: "auto",
              }}
            >
              {(traces.data?.traces ?? []).map((t, i, arr) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 14px",
                    borderBottom:
                      i === arr.length - 1 ? "none" : "1px solid var(--border-soft)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    background:
                      selectedId === t.id ? "var(--canvas-3)" : "transparent",
                    borderLeft:
                      selectedId === t.id
                        ? "2px solid var(--ember-400)"
                        : "2px solid transparent",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  <div
                    className="flex items-baseline gap-2"
                    style={{ width: "100%", minWidth: 0 }}
                  >
                    <span style={{ color: "var(--fg-1)", fontSize: 12 }}>{t.name}</span>
                    <span style={{ color: "var(--fg-4)", fontSize: 10.5 }} title={t.started_at}>
                      {relativeFromTimestamp(t.started_at)}
                    </span>
                    <span
                      style={{ color: "var(--fg-2)", marginLeft: "auto", fontSize: 10.5 }}
                    >
                      {typeof t.duration_ms === "number"
                        ? `${(t.duration_ms / 1000).toFixed(2)}s`
                        : "—"}
                    </span>
                  </div>
                  <div
                    style={{
                      color: "var(--fg-3)",
                      fontSize: 10.5,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.input_preview || "(no input)"}
                  </div>
                  <div
                    style={{
                      color: "var(--fg-4)",
                      fontSize: 10,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.source ?? "—"} · {t.session_id || "—"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
        <div style={{ alignSelf: "start", position: "sticky", top: 0 }}>
          {selectedId ? (
            <TraceDetailCard
              trace={detail.data ?? null}
              loading={detail.isLoading}
            />
          ) : (
            <Card>
              <CardHead>
                <span>Trace detail</span>
              </CardHead>
              <div
                style={{
                  padding: 24,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--fg-3)",
                  lineHeight: 1.7,
                }}
              >
                Pick a trace on the left to see its spans, scores, and
                input/output. You can attach a manual quality score
                from there — hover the <span style={{ color: "var(--fg-1)" }}>?</span>{" "}
                icon next to <span style={{ color: "var(--fg-1)" }}>scores</span>{" "}
                for what that means.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TraceDetailCard({
  trace,
  loading,
}: {
  trace: TracingTraceFull | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-4)" }}>
          Loading trace…
        </div>
      </Card>
    );
  }
  if (!trace) {
    return (
      <Card>
        <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>
          Trace not found.
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <CardHead>
        <span>Trace</span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--fg-4)",
          }}
        >
          {trace.id}
        </span>
      </CardHead>
      <div style={{ padding: 14, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-2)" }}>
        <KV label="name" value={trace.name} />
        <KV label="session" value={trace.session_id ?? "—"} />
        <KV label="source" value={trace.source ?? "—"} />
        <KV label="started" value={trace.started_at} />
        <KV
          label="duration"
          value={typeof trace.duration_ms === "number" ? `${(trace.duration_ms / 1000).toFixed(2)}s` : "—"}
        />
        <div style={{ marginTop: 10 }}>
          <div style={{ color: "var(--fg-3)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>input</div>
          <pre
            style={{
              margin: 0,
              padding: 10,
              background: "var(--canvas-1)",
              borderRadius: 5,
              fontSize: 11,
              color: "var(--fg-1)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: 180,
              overflow: "auto",
            }}
          >
            {trace.input ?? "(empty)"}
          </pre>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ color: "var(--fg-3)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>output</div>
          <pre
            style={{
              margin: 0,
              padding: 10,
              background: "var(--canvas-1)",
              borderRadius: 5,
              fontSize: 11,
              color: "var(--fg-1)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: 220,
              overflow: "auto",
            }}
          >
            {trace.output ?? "(empty)"}
          </pre>
        </div>
      </div>
      {trace.spans.length > 0 ? (
        <>
          <div
            style={{
              padding: "8px 14px",
              borderTop: "1px solid var(--border-soft)",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--fg-3)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            spans · {trace.spans.length}
          </div>
          {trace.spans.map((s) => (
            <div
              key={s.id}
              className="grid items-center gap-2"
              style={{
                gridTemplateColumns: "130px 1fr 90px 90px",
                padding: "6px 14px",
                borderTop: "1px solid var(--border-soft)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span style={{ color: "var(--fg-3)" }}>{s.kind}</span>
              <span style={{ color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.name}
              </span>
              <span style={{ color: "var(--fg-2)" }}>
                {typeof s.duration_ms === "number" ? `${s.duration_ms} ms` : "—"}
              </span>
              <span style={{ color: "var(--fg-3)" }}>
                {s.total_tokens ? `${s.total_tokens} tok` : ""}
              </span>
            </div>
          ))}
        </>
      ) : null}
      <ScoreSection trace={trace} />
    </Card>
  );
}

function ScoreSection({ trace }: { trace: TracingTraceFull }) {
  const record = useSentinelRecordTracingScore();
  const [name, setName] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  const submit = () => {
    const trimmedName = name.trim();
    const numeric = Number(value);
    if (!trimmedName || Number.isNaN(numeric)) return;
    const input: TracingScoreInput = {
      trace_id: trace.id,
      name: trimmedName,
      value: numeric,
    };
    if (comment.trim()) input.comment = comment.trim();
    record.mutate(input, {
      onSuccess: () => {
        setName("");
        setValue("");
        setComment("");
      },
    });
  };

  return (
    <div
      style={{
        padding: 14,
        borderTop: "1px solid var(--border-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--fg-2)",
      }}
    >
      <div
        className="flex items-center gap-2"
        style={{ marginBottom: 6 }}
      >
        <span
          style={{
            color: "var(--fg-3)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          scores
        </span>
        <button
          type="button"
          onClick={() => setHelpOpen((x) => !x)}
          title="What are trace scores?"
          aria-expanded={helpOpen}
          style={{
            width: 16,
            height: 16,
            borderRadius: 999,
            background: helpOpen ? "var(--ember-400)" : "var(--canvas-2)",
            color: helpOpen ? "var(--fg-on-accent)" : "var(--fg-3)",
            border: "1px solid var(--border-soft)",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            lineHeight: "14px",
            textAlign: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ?
        </button>
      </div>
      {helpOpen ? (
        <div
          style={{
            padding: 10,
            marginBottom: 10,
            background: "var(--canvas-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: 5,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            lineHeight: 1.55,
            color: "var(--fg-2)",
          }}
        >
          <div style={{ color: "var(--fg-1)", marginBottom: 4 }}>
            What a score is
          </div>
          <div style={{ color: "var(--fg-3)" }}>
            A labelled quality signal attached to this trace. Name it
            whatever you're measuring (e.g. <code>routing_accuracy</code>,{" "}
            <code>briefing_quality</code>, <code>manual-review</code>).
            Value is a float, usually <code>0.0</code>–<code>1.0</code> — higher is
            better.
          </div>
          <div style={{ color: "var(--fg-1)", marginTop: 8, marginBottom: 4 }}>
            What it impacts
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
              color: "var(--fg-3)",
            }}
          >
            <li>
              <strong style={{ color: "var(--fg-2)" }}>Fine-tune gating.</strong>{" "}
              <code>sentinel finetune export --min-score 0.8 --score-name X</code>{" "}
              pulls only traces where score <em>X</em> ≥ 0.8. Manual
              scores count the same as evaluator scores.
            </li>
            <li>
              <strong style={{ color: "var(--fg-2)" }}>Curation shortlist.</strong>{" "}
              Traces with low manual scores are the first candidates for
              drop/rewrite in the Curate tab.
            </li>
            <li>
              <strong style={{ color: "var(--fg-2)" }}>Regression tracking.</strong>{" "}
              Grounding + dataset evals attach scores automatically. Your
              manual scores show up alongside them in the sparkline on
              the Evals tab.
            </li>
          </ul>
          <div style={{ color: "var(--fg-4)", marginTop: 8 }}>
            Scores are append-only. Re-scoring the same name just adds
            another row; export filters pass the trace if{" "}
            <em>any</em> row for that name meets the threshold.
          </div>
        </div>
      ) : null}
      {trace.scores.length === 0 ? (
        <div style={{ color: "var(--fg-4)", fontSize: 11, marginBottom: 8 }}>
          No scores yet.
        </div>
      ) : (
        trace.scores.map((sc) => (
          <div key={sc.id} style={{ marginBottom: 4 }}>
            <span style={{ color: "var(--fg-1)" }}>{sc.name}</span>
            <span style={{ color: "var(--fg-3)", marginLeft: 8 }}>
              {sc.value.toFixed(3)}
            </span>
            {sc.comment ? (
              <span style={{ color: "var(--fg-4)", marginLeft: 8 }}>{sc.comment}</span>
            ) : null}
          </div>
        ))
      )}
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "minmax(120px, 1fr) 80px minmax(180px, 2fr) auto",
          gap: 8,
          alignItems: "end",
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="score name"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            padding: "5px 8px",
            borderRadius: 4,
            background: "var(--canvas-2)",
            border: "1px solid var(--border-soft)",
            color: "var(--fg-1)",
          }}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.0-1.0"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            padding: "5px 8px",
            borderRadius: 4,
            background: "var(--canvas-2)",
            border: "1px solid var(--border-soft)",
            color: "var(--fg-1)",
          }}
        />
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="comment (optional)"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            padding: "5px 8px",
            borderRadius: 4,
            background: "var(--canvas-2)",
            border: "1px solid var(--border-soft)",
            color: "var(--fg-1)",
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={
            record.isPending || !name.trim() || Number.isNaN(Number(value))
          }
          style={{
            padding: "5px 12px",
            borderRadius: 4,
            background:
              record.isPending || !name.trim() || Number.isNaN(Number(value))
                ? "var(--canvas-3)"
                : "var(--ember-400)",
            color:
              record.isPending || !name.trim() || Number.isNaN(Number(value))
                ? "var(--fg-3)"
                : "var(--fg-on-accent)",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            fontWeight: 500,
            cursor: record.isPending ? "default" : "pointer",
          }}
        >
          {record.isPending ? "Saving…" : "Add score"}
        </button>
      </div>
      {record.isError ? (
        <div
          style={{
            color: "var(--state-down-fg)",
            fontSize: 10.5,
            marginTop: 6,
          }}
        >
          {(record.error as Error).message}
        </div>
      ) : null}
    </div>
  );
}
