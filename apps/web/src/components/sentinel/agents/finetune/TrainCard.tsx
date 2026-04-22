import { useEffect, useState } from "react";

import {
  useSentinelFinetuneRecipes,
  useSentinelFinetuneTrainJob,
  useSentinelFinetuneTrainJobs,
  useSentinelStartFinetuneTraining,
} from "../../../../sentinel/hooks";
import type { FinetuneTrainJob } from "../../../../sentinel/api";
import type { DotState } from "../../shared";
import { Card, CardHead, MiniStat } from "../_shared";
import { Sparkline } from "../evals/EvalsTab";

export function TrainCard() {
  const recipes = useSentinelFinetuneRecipes();
  const jobsList = useSentinelFinetuneTrainJobs();
  const start = useSentinelStartFinetuneTraining();
  const [recipe, setRecipe] = useState<string>("");
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null);
  const tracked = useSentinelFinetuneTrainJob(trackedJobId);

  const activeId = jobsList.data?.active_job_id ?? null;
  useEffect(() => {
    if (!trackedJobId && activeId) setTrackedJobId(activeId);
  }, [trackedJobId, activeId]);

  const recipeList = recipes.data?.recipes ?? [];
  useEffect(() => {
    if (!recipe && recipeList.length > 0) {
      setRecipe(recipeList[0]!.name);
    }
  }, [recipe, recipeList]);

  const running =
    tracked.data?.status === "running" || (activeId !== null && !trackedJobId);
  const disabled = !recipe || start.isPending || running;

  const handleStart = () => {
    start.mutate(
      { recipe },
      { onSuccess: (resp) => setTrackedJobId(resp.job_id) },
    );
  };

  return (
    <Card>
      <CardHead>
        <span>Train</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            color: "var(--fg-4)",
          }}
        >
          sentinel finetune train (detached)
        </span>
      </CardHead>
      <div
        style={{
          padding: 14,
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) auto",
          gap: 10,
          alignItems: "end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 10,
              color: "var(--fg-3)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            recipe
          </span>
          <select
            value={recipe}
            onChange={(e) => setRecipe(e.target.value)}
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
            <option value="">-- pick recipe --</option>
            {recipeList.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleStart}
          disabled={disabled}
          style={{
            padding: "7px 14px",
            borderRadius: 5,
            background: disabled ? "var(--canvas-3)" : "var(--ember-400)",
            color: disabled ? "var(--fg-3)" : "var(--fg-on-accent)",
            border: "none",
            fontSize: 12.5,
            fontWeight: 500,
            cursor: disabled ? "default" : "pointer",
          }}
        >
          {running ? "Training…" : start.isPending ? "Launching…" : "Start training"}
        </button>
      </div>
      {start.isError ? (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--border-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--state-down-fg)",
          }}
        >
          {(start.error as Error).message}
        </div>
      ) : null}
      {trackedJobId ? (
        <TrainJobProgress
          data={tracked.data ?? null}
          loading={tracked.isLoading}
          error={tracked.isError}
          onDismiss={() => setTrackedJobId(null)}
        />
      ) : null}
    </Card>
  );
}

function TrainJobProgress({
  data,
  loading,
  error,
  onDismiss,
}: {
  data: FinetuneTrainJob | null;
  loading: boolean;
  error: boolean;
  onDismiss: () => void;
}) {
  if (loading) {
    return (
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border-soft)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-4)",
        }}
      >
        Launching training job…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border-soft)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-3)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>Job not found.</span>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            marginLeft: "auto",
            padding: "3px 8px",
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
    );
  }

  const stateDot: DotState =
    data.status === "running"
      ? "busy"
      : data.status === "ok"
        ? "healthy"
        : "down";
  const durationMs = data.finished_at
    ? Math.max(0, Date.parse(data.finished_at) - Date.parse(data.started_at))
    : Date.now() - Date.parse(data.started_at);
  const durationLabel =
    durationMs < 90_000
      ? `${Math.round(durationMs / 1000)}s`
      : `${Math.round(durationMs / 60_000)}m`;

  const latest = data.metrics.latest;
  const lossSeries = data.metrics.points.map((p) => p.loss);
  const stdoutTail = data.stdout.trim().split("\n").slice(-14).join("\n");

  return (
    <div style={{ borderTop: "1px solid var(--border-soft)" }}>
      <div
        className="flex items-center gap-3"
        style={{
          padding: "10px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-2)",
        }}
      >
        <span className={`ds-dot ds-dot--${stateDot}`} aria-hidden />
        <span style={{ color: "var(--fg-1)" }}>{data.recipe}</span>
        <span style={{ color: "var(--fg-3)", fontSize: 11 }}>
          {data.status} · {durationLabel}
          {data.returncode != null ? ` · exit ${data.returncode}` : ""}
        </span>
        {data.message ? (
          <span
            style={{
              color:
                data.status === "error"
                  ? "var(--state-down-fg)"
                  : "var(--fg-3)",
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
            padding: "3px 8px",
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          borderTop: "1px solid var(--border-soft)",
          alignItems: "stretch",
        }}
      >
        <MiniStat
          label="steps"
          value={String(data.metrics.step_count)}
        />
        <MiniStat
          label="loss"
          value={latest ? latest.loss.toFixed(4) : "—"}
          sub={
            lossSeries.length >= 2
              ? `Δ ${(lossSeries[lossSeries.length - 1]! - lossSeries[0]!).toFixed(4)}`
              : undefined
          }
        />
        <MiniStat
          label="epoch"
          value={latest?.epoch != null ? latest.epoch.toFixed(2) : "—"}
        />
        <MiniStat
          label="lr"
          value={
            latest?.learning_rate != null
              ? latest.learning_rate.toExponential(2)
              : "—"
          }
        />
      </div>
      {lossSeries.length >= 2 ? (
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border-soft)" }}>
          <Sparkline values={lossSeries} width={320} height={48} />
        </div>
      ) : null}
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
            maxHeight: 220,
            overflow: "auto",
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          {stdoutTail}
        </pre>
      ) : null}
    </div>
  );
}
