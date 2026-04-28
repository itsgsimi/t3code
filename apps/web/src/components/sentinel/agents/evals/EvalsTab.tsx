import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  useSentinelEvalJob,
  useSentinelEvalJobs,
  useSentinelEvalRuns,
  useSentinelEvalSuites,
  useSentinelEvalSuite,
  useSentinelWriteEvalSuite,
  useSentinelRunEval,
} from "../../../../sentinel/hooks";
import type {
  EvalJob,
  EvalRunInput,
  SentinelEvalRun,
} from "../../../../sentinel/api";
import type { DotState } from "../../shared";
import { Card, EmptyCard, TableHead } from "../_shared";
import { relativeFromTimestamp } from "../diagnostics/diagnosticsHelpers";
import {
  buildSuiteSummaries,
  formatMtime,
  passRate,
  type SuiteSummary,
} from "./evalHelpers";

export function EvalsTab() {
  const runs = useSentinelEvalRuns(50);
  const runEval = useSentinelRunEval();
  const jobsList = useSentinelEvalJobs();
  const suitesList = useSentinelEvalSuites();
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null);
  const [editingSuite, setEditingSuite] = useState<string | null>(null);
  const job = useSentinelEvalJob(trackedJobId);
  const rows = runs.data?.runs ?? [];
  const suites = buildSuiteSummaries(rows);
  const editableSuiteNames = new Set(
    (suitesList.data?.suites ?? []).map((s) => s.name),
  );

  const activeId = jobsList.data?.active_job_id ?? null;
  // Adopt the server-reported active job if we have no local one
  useEffect(() => {
    if (!trackedJobId && activeId) setTrackedJobId(activeId);
  }, [trackedJobId, activeId]);

  const jobRunning = job.data?.status === "running" || activeId !== null;
  const startDisabled = runEval.isPending || jobRunning;

  const startEval = (input: EvalRunInput) => {
    runEval.mutate(input, {
      onSuccess: (resp) => setTrackedJobId(resp.job_id),
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => startEval({ grounding: true, quick: true })}
          disabled={startDisabled}
          title="Run the core YAML grounding suites (faithfulness, contradiction, scope, etc). Skips web-search + skill-workflows. ~2 min."
        >
          {startDisabled ? <Loader2 className="animate-spin" /> : null}
          Run grounding (quick)
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => startEval({ memory: true })}
          disabled={startDisabled}
          title="Isolated memory-system eval under group_id=eval-memory. Verifies Graphiti recall without polluting production memory."
        >
          Run memory evals
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => startEval({ grounding: true })}
          disabled={startDisabled}
          title="All grounding suites including web-search + skill-workflows. Slower (~5-8 min) but full coverage."
        >
          Run grounding (full)
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => startEval({ subsystem: true })}
          disabled={startDisabled}
          title="Offline checks against small models: classifiers, dream-nudges, deep-think. No API restart needed."
        >
          Run subsystem evals
        </Button>
        {runEval.isError ? (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--state-down-fg)",
              fontFamily: "var(--font-mono)",
            }}
          >
            failed — {(runEval.error as Error).message}
          </span>
        ) : null}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => runs.refetch()}
          disabled={runs.isLoading}
          aria-label="Refresh runs"
          title="Refresh runs"
        >
          <RefreshCw className={runs.isLoading ? "animate-spin" : ""} />
        </Button>
      </div>
      {trackedJobId ? (
        <EvalJobProgressCard
          data={job.data ?? null}
          isLoading={job.isLoading}
          isError={job.isError}
          onDismiss={() => setTrackedJobId(null)}
        />
      ) : null}
      {suites.length > 0 ? (
        <div
          className="mb-3 grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        >
          {suites.map((s) => (
            <SuiteSummaryCard
              key={s.suite}
              summary={s}
              editable={editableSuiteNames.has(s.suite)}
              disabled={startDisabled}
              onRun={() =>
                startEval({ grounding: true, suite: s.suite })
              }
              onEdit={() => setEditingSuite(s.suite)}
            />
          ))}
        </div>
      ) : null}
      {editingSuite ? (
        <SuiteEditor
          name={editingSuite}
          onClose={() => setEditingSuite(null)}
        />
      ) : null}
      {rows.length === 0 ? (
        <EmptyCard>
          {runs.isError
            ? "API offline — run `uv run sentinel api up` and refresh."
            : "No eval runs yet. Click Run grounding (quick) above to generate the first one (~2 min)."}
        </EmptyCard>
      ) : (
        <Card>
          <TableHead
            columns={["when", "file", "suite", "pass rate", "cases"]}
            widths={["180px", "1.4fr", "1fr", "120px", "140px"]}
          />
          {rows.map((run, i) => (
            <EvalRow key={run.file} run={run} last={i === rows.length - 1} />
          ))}
        </Card>
      )}
    </div>
  );
}

function SuiteSummaryCard({
  summary,
  editable,
  disabled,
  onRun,
  onEdit,
}: {
  summary: SuiteSummary;
  editable: boolean;
  disabled: boolean;
  onRun: () => void;
  onEdit: () => void;
}) {
  const { suite, history, latestRate, deltaPct, runCount } = summary;
  const series = history
    .map((r) => passRate(r))
    .filter((v): v is number => typeof v === "number");
  const state: DotState =
    latestRate == null
      ? "unknown"
      : latestRate >= 0.95
        ? "healthy"
        : latestRate >= 0.8
          ? "degraded"
          : "down";
  const deltaColor =
    deltaPct == null
      ? "var(--fg-3)"
      : deltaPct > 0.5
        ? "var(--state-healthy-fg)"
        : deltaPct < -0.5
          ? "var(--state-down-fg)"
          : "var(--fg-3)";
  const deltaLabel =
    deltaPct == null
      ? "no prior run"
      : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}pp`;

  return (
    <Card>
      <div style={{ padding: "12px 14px" }}>
        <div className="flex items-center gap-[8px]">
          <span className={`ds-dot ds-dot--${state}`} aria-hidden />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-1)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}
            title={suite}
          >
            {suite}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--fg-4)",
            }}
          >
            {runCount} runs
          </span>
        </div>
        <div
          className="mt-2 flex items-end gap-3"
          style={{ justifyContent: "space-between" }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 600,
                color: "var(--fg-1)",
                lineHeight: 1,
              }}
            >
              {latestRate != null ? `${Math.round(latestRate * 100)}%` : "—"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: deltaColor,
                marginTop: 4,
              }}
            >
              {deltaLabel}
            </div>
          </div>
          <Sparkline values={series} width={120} height={36} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--fg-4)",
            marginTop: 6,
          }}
          title={summary.latest.file}
        >
          last {relativeFromTimestamp(summary.latest.mtime)}
          {typeof summary.latest.cases_total === "number" &&
          typeof summary.latest.cases_passed === "number"
            ? ` · ${summary.latest.cases_passed}/${summary.latest.cases_total}`
            : ""}
        </div>
        {editable ? (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onRun}
              disabled={disabled}
              className="cursor-pointer border-0"
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                background: disabled ? "var(--canvas-3)" : "var(--ember-400)",
                color: disabled ? "var(--fg-3)" : "var(--fg-on-accent)",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              Run
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="cursor-pointer"
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                background: "var(--canvas-3)",
                color: "var(--fg-1)",
                border: "1px solid var(--border-soft)",
                fontSize: 11,
              }}
            >
              Edit
            </button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function SuiteEditor({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const suite = useSentinelEvalSuite(name);
  const write = useSentinelWriteEvalSuite();
  const [draft, setDraft] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (suite.data && draft === null) setDraft(suite.data.content);
  }, [suite.data, draft]);

  const dirty = draft !== null && suite.data && draft !== suite.data.content;

  const save = () => {
    if (draft === null) return;
    setSaveError(null);
    write.mutate(
      { name, content: draft },
      {
        onError: (err) => setSaveError(err.message),
      },
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 90vw)",
          background: "var(--canvas-1)",
          borderLeft: "1px solid var(--border-soft)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-1)" }}>
            Edit suite · <b>{name}</b>
            {suite.data ? (
              <span style={{ color: "var(--fg-4)", marginLeft: 8, fontSize: 11 }}>
                {suite.data.path}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer"
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              background: "var(--canvas-3)",
              color: "var(--fg-1)",
              border: "1px solid var(--border-soft)",
              fontSize: 11,
            }}
          >
            Close
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {suite.isLoading ? (
            <div style={{ color: "var(--fg-3)", fontSize: 12 }}>Loading…</div>
          ) : suite.isError ? (
            <div style={{ color: "var(--state-down-fg)", fontSize: 12 }}>
              Failed to load suite: {(suite.error as Error).message}
            </div>
          ) : (
            <textarea
              value={draft ?? ""}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: "60vh",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                lineHeight: 1.5,
                padding: 12,
                background: "var(--canvas-2)",
                color: "var(--fg-1)",
                border: "1px solid var(--border-soft)",
                borderRadius: 4,
                resize: "vertical",
              }}
            />
          )}
        </div>
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={save}
            disabled={!dirty || write.isPending}
            className="cursor-pointer border-0"
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              background: !dirty || write.isPending ? "var(--canvas-3)" : "var(--ember-400)",
              color: !dirty || write.isPending ? "var(--fg-3)" : "var(--fg-on-accent)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {write.isPending ? "Saving…" : "Save"}
          </button>
          {write.isSuccess && !dirty ? (
            <span style={{ fontSize: 11, color: "var(--state-healthy-fg)" }}>
              Saved.
            </span>
          ) : null}
          {saveError ? (
            <span
              style={{
                fontSize: 11,
                color: "var(--state-down-fg)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {saveError}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Sparkline({
  values,
  width,
  height,
}: {
  values: readonly number[];
  width: number;
  height: number;
}) {
  if (values.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          fontSize: 10,
          color: "var(--fg-4)",
          fontFamily: "var(--font-mono)",
        }}
      >
        no data
      </div>
    );
  }
  const padX = 2;
  const padY = 3;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = padX + i * step;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const latest = points[points.length - 1]!;
  const lineColor =
    values.length > 1 && values[values.length - 1]! < values[values.length - 2]!
      ? "var(--state-down-fg)"
      : "var(--state-healthy-fg)";
  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block" }}
      aria-hidden
    >
      <line
        x1={padX}
        x2={padX + innerW}
        y1={padY + innerH - (1 - min) / range * innerH}
        y2={padY + innerH - (1 - min) / range * innerH}
        stroke="var(--border-soft)"
        strokeDasharray="2 3"
      />
      <path d={path} fill="none" stroke={lineColor} strokeWidth={1.5} />
      <circle cx={latest[0]} cy={latest[1]} r={2.5} fill={lineColor} />
    </svg>
  );
}

function EvalRow({ run, last }: { run: SentinelEvalRun; last: boolean }) {
  const passRate =
    typeof run.pass_rate === "number"
      ? `${(run.pass_rate * 100).toFixed(1)}%`
      : typeof run.cases_total === "number" && typeof run.cases_passed === "number"
        ? `${((run.cases_passed / Math.max(1, run.cases_total)) * 100).toFixed(1)}%`
        : "—";
  const cases =
    typeof run.cases_total === "number" && typeof run.cases_passed === "number"
      ? `${run.cases_passed} / ${run.cases_total}`
      : "—";
  const state: DotState =
    typeof run.pass_rate === "number"
      ? run.pass_rate >= 0.95
        ? "healthy"
        : run.pass_rate >= 0.8
          ? "degraded"
          : "down"
      : "unknown";
  return (
    <div
      className="grid items-center gap-3"
      style={{
        gridTemplateColumns: "180px 1.4fr 1fr 120px 140px",
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontSize: 12.5,
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
        {formatMtime(run.mtime)}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--fg-1)",
          fontSize: 11,
          wordBreak: "break-all",
        }}
      >
        {run.file}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}>
        {run.suite ?? "—"}
      </span>
      <span
        className="flex items-center gap-[6px]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}
      >
        <span className={`ds-dot ds-dot--${state}`} aria-hidden />
        {passRate}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{cases}</span>
    </div>
  );
}

function EvalJobProgressCard({
  data,
  isLoading,
  isError,
  onDismiss,
}: {
  data: EvalJob | null;
  isLoading: boolean;
  isError: boolean;
  onDismiss: () => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-4)",
          }}
        >
          Starting eval job…
        </div>
      </Card>
    );
  }
  if (isError || !data) {
    return (
      <Card>
        <div
          className="flex items-center gap-3"
          style={{
            padding: "12px 14px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-3)",
          }}
        >
          <span style={{ color: "var(--fg-3)" }}>
            Job gone — API may have restarted (normal for grounding). Check
            the runs list below for new artefacts.
          </span>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              borderRadius: 4,
              background: "var(--canvas-3)",
              color: "var(--fg-2)",
              border: "1px solid var(--border-soft)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            dismiss
          </button>
        </div>
      </Card>
    );
  }

  const state: DotState =
    data.status === "running"
      ? "busy"
      : data.status === "ok"
        ? "healthy"
        : "down";
  const durationMs = data.finished_at
    ? Math.max(0, Date.parse(data.finished_at) - Date.parse(data.started_at))
    : Date.now() - Date.parse(data.started_at);
  const durationLabel =
    durationMs < 10_000 ? `${Math.round(durationMs / 1000)}s` : `${Math.round(durationMs / 1000)}s`;
  const stdoutTail = (data.stdout || "").trim().split("\n").slice(-8).join("\n");
  const stderrTail = (data.stderr || "").trim().split("\n").slice(-4).join("\n");

  return (
    <div className="mb-3">
      <Card>
        <div
          className="flex items-center gap-3"
          style={{
            padding: "10px 14px",
            borderBottom: stdoutTail || stderrTail ? "1px solid var(--border-soft)" : "none",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          <span className={`ds-dot ds-dot--${state}`} aria-hidden />
          <span style={{ color: "var(--fg-1)" }}>{data.kind}</span>
          <span style={{ color: "var(--fg-3)", fontSize: 11 }}>
            {data.status} · {durationLabel}
            {data.returncode != null ? ` · exit ${data.returncode}` : ""}
          </span>
          {data.message ? (
            <span
              style={{
                color: data.status === "error" ? "var(--state-down-fg)" : "var(--fg-3)",
                fontSize: 11,
              }}
            >
              {data.message}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              borderRadius: 4,
              background: "var(--canvas-3)",
              color: "var(--fg-2)",
              border: "1px solid var(--border-soft)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            dismiss
          </button>
        </div>
        {stdoutTail ? (
          <pre
            style={{
              margin: 0,
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              lineHeight: 1.45,
              color: "var(--fg-3)",
              background: "var(--canvas-1)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: 180,
              overflow: "auto",
            }}
          >
            {stdoutTail}
          </pre>
        ) : null}
        {stderrTail ? (
          <pre
            style={{
              margin: 0,
              padding: "10px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              lineHeight: 1.45,
              color: "var(--state-down-fg)",
              background: "var(--canvas-1)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: 120,
              overflow: "auto",
              borderTop: stdoutTail ? "1px solid var(--border-soft)" : "none",
            }}
          >
            {stderrTail}
          </pre>
        ) : null}
      </Card>
    </div>
  );
}
