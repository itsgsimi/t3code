import { useEffect, useState, type CSSProperties } from "react";

import {
  useSentinelCurationDecisions,
  useSentinelCurationExamples,
  useSentinelFinetuneDatasets,
  useSentinelRecordCurationDecision,
} from "../../../../sentinel/hooks";
import type {
  CurationBucket,
  CurationDecisionInput,
} from "../../../../sentinel/api";
import { Card, CardHead, EmptyCard } from "../_shared";
import { relativeFromTimestamp } from "../diagnostics/diagnosticsHelpers";

export function CurateTab() {
  const datasets = useSentinelFinetuneDatasets();
  const [dataset, setDataset] = useState<string>("");
  const [offset, setOffset] = useState<number>(0);
  const [rewriteDraft, setRewriteDraft] = useState<string>("");
  const [rewriteNotes, setRewriteNotes] = useState<string>("");
  const [rewriteOpen, setRewriteOpen] = useState<boolean>(false);

  const available = datasets.data?.datasets ?? [];
  useEffect(() => {
    if (!dataset && available.length > 0) {
      setDataset(available[0]!.name);
    }
  }, [dataset, available]);

  useEffect(() => {
    // reset pointer when switching dataset
    setOffset(0);
    setRewriteOpen(false);
  }, [dataset]);

  const page = useSentinelCurationExamples(dataset || null, offset, 1);
  const decisions = useSentinelCurationDecisions(dataset || null);
  const record = useSentinelRecordCurationDecision();

  const total = page.data?.total ?? 0;
  const example = page.data?.examples?.[0] ?? null;
  const exampleId = String(example?.record?.id ?? `idx-${example?.index ?? ""}`);
  const currentDecision =
    decisions.data?.decisions?.[exampleId] ?? null;

  const counts = {
    keep: 0,
    rewrite: 0,
    drop: 0,
    "needs-user-decision": 0,
  } as Record<CurationBucket, number>;
  for (const d of Object.values(decisions.data?.decisions ?? {})) {
    if (d.bucket in counts) counts[d.bucket as CurationBucket] += 1;
  }
  const reviewed = Object.values(counts).reduce((a, b) => a + b, 0);

  // Seed rewrite draft from the assistant message when opened.
  useEffect(() => {
    setRewriteOpen(false);
  }, [exampleId]);

  const mark = (bucket: CurationBucket) => {
    if (!dataset || !example) return;
    // Rewrite requires the inline editor — open it instead of
    // recording immediately.
    if (bucket === "rewrite" && !rewriteOpen) {
      const msgs = example.record?.messages ?? [];
      const assistant = msgs.find((m) => m.role === "assistant")?.content ?? "";
      setRewriteDraft(assistant);
      setRewriteNotes("");
      setRewriteOpen(true);
      return;
    }
    record.mutate(
      { dataset, example_id: exampleId, bucket },
      {
        onSuccess: () => {
          setRewriteOpen(false);
          setOffset((o) => Math.min(o + 1, Math.max(0, total - 1)));
        },
      },
    );
  };

  const submitRewrite = () => {
    if (!dataset || !example || !rewriteDraft.trim()) return;
    const payload: CurationDecisionInput = {
      dataset,
      example_id: exampleId,
      bucket: "rewrite",
      rewrite: rewriteDraft,
    };
    if (rewriteNotes.trim()) payload.notes = rewriteNotes.trim();
    record.mutate(payload, {
      onSuccess: () => {
        setRewriteOpen(false);
        setRewriteDraft("");
        setRewriteNotes("");
        setOffset((o) => Math.min(o + 1, Math.max(0, total - 1)));
      },
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!example || record.isPending) return;
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "TEXTAREA") return;
      if (target && target.tagName === "INPUT") return;
      if (e.key === "k") mark("keep");
      else if (e.key === "r") mark("rewrite");
      else if (e.key === "d") mark("drop");
      else if (e.key === "u") mark("needs-user-decision");
      else if (e.key === "ArrowLeft") setOffset((o) => Math.max(0, o - 1));
      else if (e.key === "ArrowRight")
        setOffset((o) => Math.min(o + 1, Math.max(0, total - 1)));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [example, record.isPending, total, dataset]);

  const msgs = example?.record?.messages ?? [];
  const userMsg = msgs.find((m) => m.role === "user")?.content ?? "";
  const assistantMsg = msgs.find((m) => m.role === "assistant")?.content ?? "";

  const recentDecisions = Object.values(decisions.data?.decisions ?? {})
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 12);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHead>
          <span>Curate dataset</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10.5,
              color: "var(--fg-4)",
              fontFamily: "var(--font-mono)",
            }}
          >
            shortcuts: k / r / d / u · ← →
          </span>
        </CardHead>
        <div
          style={{
            padding: 12,
            display: "grid",
            gridTemplateColumns: "minmax(240px, 1fr) auto auto auto auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 4,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              color: "var(--fg-1)",
            }}
          >
            <option value="">-- pick dataset --</option>
            {available.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <CurateCountPill label="keep" value={counts.keep} color="var(--state-healthy-fg)" />
          <CurateCountPill label="rewrite" value={counts.rewrite} color="var(--ember-400)" />
          <CurateCountPill label="drop" value={counts.drop} color="var(--state-down-fg)" />
          <CurateCountPill
            label="user"
            value={counts["needs-user-decision"]}
            color="var(--fg-2)"
          />
        </div>
      </Card>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 280px)" }}
      >
        <div>
      {!dataset ? (
        <EmptyCard>Pick a dataset to start curating.</EmptyCard>
      ) : page.isLoading ? (
        <EmptyCard>Loading…</EmptyCard>
      ) : !example ? (
        <EmptyCard>No examples at offset {offset}.</EmptyCard>
      ) : (
        <Card>
          <div
            className="flex items-center gap-3"
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border-soft)",
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--fg-3)",
            }}
          >
            <span>
              {offset + 1} / {total}
            </span>
            <span style={{ color: "var(--fg-4)" }}>·</span>
            <span style={{ color: "var(--fg-1)" }}>{exampleId}</span>
            {currentDecision ? (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "var(--canvas-2)",
                  color: "var(--fg-2)",
                  border: "1px solid var(--border-soft)",
                  fontSize: 10.5,
                }}
              >
                marked: {currentDecision.bucket}
              </span>
            ) : null}
            <span style={{ color: "var(--fg-4)", marginLeft: "auto" }}>
              reviewed {reviewed} / {total}
            </span>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              disabled={offset === 0}
              style={miniBtnStyle(offset === 0)}
            >
              ← prev
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.min(o + 1, Math.max(0, total - 1)))}
              disabled={offset >= total - 1}
              style={miniBtnStyle(offset >= total - 1)}
            >
              next →
            </button>
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}
          >
            <CuratePane label="user" value={userMsg} />
            <CuratePane label="assistant" value={assistantMsg} />
          </div>
          <div
            className="flex items-center gap-2"
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--border-soft)",
            }}
          >
            <CurateBucketButton
              label="keep (k)"
              bucket="keep"
              onClick={mark}
              pending={record.isPending}
              accent="var(--state-healthy-fg)"
            />
            <CurateBucketButton
              label="rewrite (r)"
              bucket="rewrite"
              onClick={mark}
              pending={record.isPending}
              accent="var(--ember-400)"
            />
            <CurateBucketButton
              label="drop (d)"
              bucket="drop"
              onClick={mark}
              pending={record.isPending}
              accent="var(--state-down-fg)"
            />
            <CurateBucketButton
              label="needs user (u)"
              bucket="needs-user-decision"
              onClick={mark}
              pending={record.isPending}
              accent="var(--fg-2)"
            />
            {record.isError ? (
              <span style={{ color: "var(--state-down-fg)", fontSize: 11, marginLeft: 8 }}>
                {(record.error as Error).message}
              </span>
            ) : null}
          </div>
          {rewriteOpen ? (
            <div
              style={{
                padding: 14,
                borderTop: "1px solid var(--border-soft)",
                background: "var(--canvas-1)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ember-400)",
                  marginBottom: 6,
                }}
              >
                rewrite assistant reply
              </div>
              <textarea
                value={rewriteDraft}
                onChange={(e) => setRewriteDraft(e.target.value)}
                spellCheck={false}
                autoFocus
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: 180,
                  padding: 12,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  lineHeight: 1.55,
                  background: "var(--canvas-2)",
                  color: "var(--fg-1)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 5,
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <input
                type="text"
                value={rewriteNotes}
                onChange={(e) => setRewriteNotes(e.target.value)}
                placeholder="notes (optional — why the rewrite)"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 8,
                  padding: "6px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  background: "var(--canvas-2)",
                  color: "var(--fg-1)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 4,
                }}
              />
              <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={submitRewrite}
                  disabled={record.isPending || !rewriteDraft.trim()}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 5,
                    background:
                      record.isPending || !rewriteDraft.trim()
                        ? "var(--canvas-3)"
                        : "var(--ember-400)",
                    color:
                      record.isPending || !rewriteDraft.trim()
                        ? "var(--fg-3)"
                        : "var(--fg-on-accent)",
                    border: "none",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    cursor: record.isPending ? "default" : "pointer",
                  }}
                >
                  {record.isPending ? "Saving…" : "Save rewrite"}
                </button>
                <button
                  type="button"
                  onClick={() => setRewriteOpen(false)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 5,
                    background: "var(--canvas-2)",
                    color: "var(--fg-2)",
                    border: "1px solid var(--border-soft)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      )}
        </div>
        <Card>
          <CardHead>
            <span>Recent decisions</span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10.5,
                color: "var(--fg-4)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {reviewed} / {total}
            </span>
          </CardHead>
          {recentDecisions.length === 0 ? (
            <div
              style={{
                padding: 16,
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: "var(--fg-4)",
                lineHeight: 1.6,
              }}
            >
              No decisions yet. Pick a bucket for the current example
              (k / r / d / u) and the history lands here.
            </div>
          ) : (
            recentDecisions.map((d, i) => (
              <div
                key={`${d.example_id}-${d.created_at}-${i}`}
                style={{
                  padding: "8px 12px",
                  borderBottom:
                    i === recentDecisions.length - 1
                      ? "none"
                      : "1px solid var(--border-soft)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                }}
              >
                <div
                  className="flex items-center gap-[6px]"
                  style={{ color: "var(--fg-1)" }}
                >
                  <CurateDecisionDot bucket={d.bucket as CurationBucket} />
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {d.example_id}
                  </span>
                </div>
                <div style={{ color: "var(--fg-4)", marginTop: 2, fontSize: 10 }}>
                  {d.bucket} · {relativeFromTimestamp(d.created_at)}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function CurateDecisionDot({ bucket }: { bucket: CurationBucket }) {
  const color =
    bucket === "keep"
      ? "var(--state-healthy-fg)"
      : bucket === "rewrite"
        ? "var(--ember-400)"
        : bucket === "drop"
          ? "var(--state-down-fg)"
          : "var(--fg-2)";
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function CurateCountPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: "var(--canvas-2)",
        border: "1px solid var(--border-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--fg-2)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color }}>{label}</span>
      <span style={{ color: "var(--fg-1)", marginLeft: 6 }}>{value}</span>
    </div>
  );
}

function CuratePane({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          padding: "6px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
          background: "var(--canvas-1)",
          borderBottom: "1px solid var(--border-soft)",
          borderRight: "1px solid var(--border-soft)",
        }}
      >
        {label}
      </div>
      <pre
        style={{
          margin: 0,
          padding: 14,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.55,
          color: "var(--fg-1)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          minHeight: 280,
          maxHeight: 520,
          overflow: "auto",
          borderRight: "1px solid var(--border-soft)",
        }}
      >
        {value || "(empty)"}
      </pre>
    </div>
  );
}

function CurateBucketButton({
  label,
  bucket,
  onClick,
  pending,
  accent,
}: {
  label: string;
  bucket: CurationBucket;
  onClick: (b: CurationBucket) => void;
  pending: boolean;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(bucket)}
      disabled={pending}
      style={{
        padding: "6px 12px",
        borderRadius: 5,
        background: "var(--canvas-2)",
        color: accent,
        border: "1px solid var(--border-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        cursor: pending ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function miniBtnStyle(disabled: boolean): CSSProperties {
  return {
    padding: "3px 8px",
    borderRadius: 4,
    background: disabled ? "var(--canvas-3)" : "var(--canvas-2)",
    color: disabled ? "var(--fg-4)" : "var(--fg-1)",
    border: "1px solid var(--border-soft)",
    fontSize: 11,
    cursor: disabled ? "default" : "pointer",
  };
}
