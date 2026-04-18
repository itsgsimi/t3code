import { useState, type CSSProperties, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import {
  useSentinelDreamRuns,
  useSentinelEvalRuns,
  useSentinelLangfuseStatus,
  useSentinelRunEval,
  useSentinelSyncLangfuse,
  useSentinelTriggerDream,
} from "../../sentinel/hooks";
import type { SentinelEvalRun } from "../../sentinel/api";
import { PageCrumb, PageHeader, Tabs, type DotState, type TabOption } from "./shared";

/**
 * Agents — evals, dream, sessions browser, fine-tune, langfuse. Wired to
 *   /v1/evals/runs           (read)
 *   /v1/evals/run            (action)
 *   /v1/dream/runs           (read — latest snapshot)
 *   /v1/admin/trigger-dream  (action)
 *   /v1/langfuse/status      (read)
 *   /v1/langfuse/sync-prompts (action)
 * Fine-tune + historical sessions remain mocked (no endpoints yet).
 */
export function AgentsView() {
  const [tab, setTab] = useState<TabKey>("evals");
  const evalRuns = useSentinelEvalRuns(30);

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Agents</PageCrumb>
        <PageHeader
          title="Agents"
          chip={{ state: "healthy", text: "3 tracks · healthy" }}
          subtitle="Evals, nightly dream, session history, fine-tuning, and the Langfuse bridge."
        />

        <Tabs
          value={tab}
          onChange={(v) => setTab(v as TabKey)}
          options={
            [
              { key: "evals", label: "Evals", count: evalRuns.data?.runs.length ?? 0 },
              { key: "dream", label: "Dream" },
              { key: "sessions", label: "Sessions" },
              { key: "finetune", label: "Fine-tune" },
              { key: "langfuse", label: "Langfuse" },
            ] satisfies TabOption[]
          }
        />

        {tab === "evals" ? <EvalsTab /> : null}
        {tab === "dream" ? <DreamTab /> : null}
        {tab === "sessions" ? <SessionsTab /> : null}
        {tab === "finetune" ? <FineTuneTab /> : null}
        {tab === "langfuse" ? <LangfuseTab /> : null}
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: "24px 28px 60px",
  maxWidth: 1200,
  margin: "0 auto",
};

type TabKey = "evals" | "dream" | "sessions" | "finetune" | "langfuse";

// ---- Evals ----------------------------------------------------------------

function EvalsTab() {
  const runs = useSentinelEvalRuns(50);
  const runEval = useSentinelRunEval();
  const rows = runs.data?.runs ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => runEval.mutate({ grounding: true, quick: true })}
          disabled={runEval.isPending}
          className="flex cursor-pointer items-center gap-2 border-0"
          style={{
            padding: "7px 14px",
            borderRadius: 5,
            background: runEval.isPending ? "var(--canvas-3)" : "var(--ember-400)",
            color: runEval.isPending ? "var(--fg-3)" : "var(--fg-on-accent)",
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          {runEval.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
          {runEval.isPending ? "Running grounding…" : "Run grounding (quick)"}
        </button>
        <button
          type="button"
          onClick={() => runEval.mutate({ memory: true })}
          disabled={runEval.isPending}
          className="cursor-pointer border-0"
          style={{
            padding: "7px 14px",
            borderRadius: 5,
            background: "var(--canvas-3)",
            color: "var(--fg-1)",
            border: "1px solid var(--border-soft)",
            fontSize: 12.5,
          }}
        >
          Run memory evals
        </button>
        <button
          type="button"
          onClick={() => runEval.mutate({})}
          disabled={runEval.isPending}
          className="cursor-pointer border-0"
          style={{
            padding: "7px 14px",
            borderRadius: 5,
            background: "var(--canvas-3)",
            color: "var(--fg-1)",
            border: "1px solid var(--border-soft)",
            fontSize: 12.5,
          }}
        >
          Run all datasets
        </button>
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
      </div>
      {rows.length === 0 ? (
        <EmptyCard>
          {runs.isError ? "API offline." : "No eval artefacts found in benchmarks/results/."}
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

function formatMtime(iso: string): string {
  try {
    const d = new Date(iso);
    return d
      .toISOString()
      .replace("T", " ")
      .replace(/:\d{2}\.\d+Z/, "Z");
  } catch {
    return iso;
  }
}

// ---- Dream ----------------------------------------------------------------

function DreamTab() {
  const dream = useSentinelTriggerDream();
  const runs = useSentinelDreamRuns();
  const lastRun = runs.data?.runs?.[0];

  const status = (() => {
    if (dream.isPending) return { label: "Running dream…", state: "busy" as const };
    if (dream.isError)
      return { label: `Failed: ${(dream.error as Error).message}`, state: "down" as const };
    if (dream.isSuccess) return { label: "Triggered", state: "healthy" as const };
    return null;
  })();

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)" }}>
      <Card>
        <CardHead>Next run</CardHead>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--fg-2)",
          }}
        >
          <KV label="scheduled" value="01:00 phoenix" />
          <KV label="orchestrator (dream role)" value="gemma-4-26b-a4b (config-driven)" />
          <KV label="expected duration" value="8–12 min on a healthy stack" />
        </div>
        <div
          className="flex items-center gap-3"
          style={{ borderTop: "1px solid var(--border-soft)", padding: "10px 14px" }}
        >
          <button
            type="button"
            onClick={() => dream.mutate()}
            disabled={dream.isPending}
            className="cursor-pointer border-0"
            style={{
              padding: "7px 14px",
              borderRadius: 5,
              background: dream.isPending ? "var(--canvas-3)" : "var(--ember-400)",
              color: dream.isPending ? "var(--fg-3)" : "var(--fg-on-accent)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: dream.isPending ? "default" : "pointer",
            }}
          >
            {dream.isPending ? "Running…" : "Run dream now"}
          </button>
          {status ? (
            <span
              className="flex items-center gap-[6px]"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: `var(--state-${status.state}-fg)`,
              }}
            >
              <span className={`ds-dot ds-dot--${status.state}`} aria-hidden />
              {status.label}
            </span>
          ) : null}
        </div>
      </Card>
      <Card>
        <CardHead>Last run</CardHead>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: "var(--fg-2)",
            lineHeight: 1.7,
          }}
        >
          {runs.isError ? (
            <span style={{ color: "var(--state-down-fg)" }}>
              API offline — can't read run/dream-last-run.json
            </span>
          ) : !lastRun ? (
            <span style={{ color: "var(--fg-4)" }}>No runs recorded yet.</span>
          ) : (
            <>
              <KV label="at" value={String(lastRun.last_run ?? "—")} />
              <KV label="duration" value={formatDuration(lastRun.duration_seconds)} />
              <KV label="sessions reviewed" value={String(lastRun.sessions_reviewed ?? 0)} />
              <KV label="episodes ingested" value={String(lastRun.episodes_ingested ?? 0)} />
              <KV label="impulses stored" value={String(lastRun.impulses_stored ?? 0)} />
              <KV label="facts pruned" value={String(lastRun.facts_pruned ?? 0)} />
              {Array.isArray(lastRun.errors) && lastRun.errors.length > 0 ? (
                <KV label="errors" value={lastRun.errors.join("; ")} />
              ) : null}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-baseline gap-3"
      style={{ padding: "4px 0", borderBottom: "1px dashed var(--border-soft)" }}
    >
      <span style={{ color: "var(--fg-3)", fontSize: 11, width: 180 }}>{label}</span>
      <span style={{ color: "var(--fg-1)", fontSize: 13, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

// ---- Sessions (placeholder) ----------------------------------------------

function SessionsTab() {
  return (
    <Card>
      <div style={{ padding: 18, fontSize: 13, color: "var(--fg-2)" }}>
        Live sessions list (harness sessions) lives at{" "}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--fg-1)",
            background: "var(--canvas-3)",
            padding: "2px 6px",
            borderRadius: 3,
          }}
        >
          /sessions
        </span>
        . This tab is for browsing historical sentinel-vault sessions — search, filter by model,
        filter by tool calls. Not wired yet; the source data comes from{" "}
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>
          GET /v1/sessions
        </span>
        .
      </div>
    </Card>
  );
}

// ---- Fine-tune (placeholder — no endpoints yet) --------------------------

function FineTuneTab() {
  return (
    <EmptyCard>
      Fine-tune datasets and recipes are CLI-only today (`sentinel finetune …`). Web surface lands
      after the /v1/finetune/* endpoints.
    </EmptyCard>
  );
}

// ---- Langfuse -------------------------------------------------------------

function LangfuseTab() {
  const status = useSentinelLangfuseStatus();
  const sync = useSentinelSyncLangfuse();
  const st = status.data;

  const reachableState: DotState =
    st?.reachable === true ? "healthy" : status.isError || st?.detail ? "down" : "unknown";

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
      <Card>
        <CardHead>Connection</CardHead>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: "var(--fg-2)",
          }}
        >
          <KV label="enabled" value={st?.enabled ? "yes" : "no"} />
          <KV label="endpoint" value={st?.base_url ?? "—"} />
          <div
            className="flex items-baseline gap-3"
            style={{ padding: "4px 0", borderBottom: "1px dashed var(--border-soft)" }}
          >
            <span style={{ color: "var(--fg-3)", fontSize: 11, width: 180 }}>reachable</span>
            <span
              className="flex items-center gap-[6px]"
              style={{ color: "var(--fg-1)", fontSize: 13 }}
            >
              <span className={`ds-dot ds-dot--${reachableState}`} aria-hidden />
              {st?.reachable ? "yes" : (st?.detail ?? "no")}
            </span>
          </div>
          <KV
            label="latency"
            value={typeof st?.latency_ms === "number" ? `${st.latency_ms} ms` : "—"}
          />
        </div>
      </Card>
      <Card>
        <CardHead>Prompt sync</CardHead>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: "var(--fg-2)",
            lineHeight: 1.7,
          }}
        >
          Pushes <span style={{ color: "var(--fg-1)" }}>agents/orchestrator/*.md</span> from git
          into the Langfuse prompt library.
          {sync.isSuccess ? (
            <div style={{ marginTop: 8, color: "var(--state-healthy-fg)" }}>
              {sync.data?.message ?? "sync ok"}
            </div>
          ) : null}
          {sync.isError ? (
            <div style={{ marginTop: 8, color: "var(--state-down-fg)" }}>
              failed — {(sync.error as Error).message}
            </div>
          ) : null}
        </div>
        <div style={{ borderTop: "1px solid var(--border-soft)", padding: "10px 14px" }}>
          <button
            type="button"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="flex cursor-pointer items-center gap-2 border-0"
            style={{
              padding: "6px 12px",
              borderRadius: 5,
              background: sync.isPending ? "var(--canvas-2)" : "var(--canvas-3)",
              color: "var(--fg-1)",
              border: "1px solid var(--border-default)",
              fontSize: 12,
            }}
          >
            {sync.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            {sync.isPending ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ---- Local shared bits ----------------------------------------------------

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function CardHead({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-soft)",
        fontSize: 12.5,
        fontWeight: 500,
        color: "var(--fg-1)",
      }}
    >
      {children}
    </div>
  );
}

function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 20,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--fg-3)",
      }}
    >
      {children}
    </div>
  );
}

function TableHead({ columns, widths }: { columns: readonly string[]; widths: readonly string[] }) {
  return (
    <div
      className="grid items-center gap-3"
      style={{
        gridTemplateColumns: widths.join(" "),
        padding: "8px 14px",
        borderBottom: "1px solid var(--border-default)",
        background: "var(--canvas-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--fg-3)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {columns.map((col) => (
        <span key={col}>{col}</span>
      ))}
    </div>
  );
}
