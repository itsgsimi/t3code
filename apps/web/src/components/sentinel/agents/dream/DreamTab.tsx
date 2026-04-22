import {
  useSentinelConfigSection,
  useSentinelDreamRuns,
  useSentinelTriggerDream,
} from "../../../../sentinel/hooks";
import type { SentinelDreamRun } from "../../../../sentinel/api";
import type { DotState } from "../../shared";
import { Card, CardHead, KV } from "../_shared";
import { formatDuration, formatTimestamp } from "./dreamHelpers";

export function DreamTab() {
  const dream = useSentinelTriggerDream();
  const runs = useSentinelDreamRuns();
  const memoryConfig = useSentinelConfigSection("memory");
  const allRuns = runs.data?.runs ?? [];
  const lastRun = allRuns[0];
  const history = allRuns.slice(1, 10);

  const memoryValue = memoryConfig.data?.value as
    | {
        dream?: {
          cron_schedule?: string;
          cron_timezone?: string;
          trigger?: string;
          session_gap_minutes?: number;
          model?: string;
        };
      }
    | undefined;
  const dreamCfg = memoryValue?.dream;
  const scheduledLabel = dreamCfg
    ? dreamCfg.trigger === "cron"
      ? `${dreamCfg.cron_schedule ?? "—"} ${dreamCfg.cron_timezone ?? ""}`.trim()
      : dreamCfg.trigger === "session_gap"
        ? `${dreamCfg.session_gap_minutes ?? "?"} min idle · then any session`
        : dreamCfg.trigger === "manual"
          ? "manual only"
          : "—"
    : "—";
  const modelLabel = dreamCfg?.model ?? "—";

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
          <KV label="trigger" value={dreamCfg?.trigger ?? "—"} />
          <KV label="scheduled" value={scheduledLabel} />
          <KV label="model" value={modelLabel} />
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
      <div style={{ gridColumn: "1 / -1" }}>
        <DreamHistoryCard history={history} />
      </div>
    </div>
  );
}

function DreamHistoryCard({
  history,
}: {
  history: readonly SentinelDreamRun[];
}) {
  return (
    <Card>
      <CardHead>
        <span>Recent dream cycles</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            color: "var(--fg-4)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {history.length} prior
        </span>
      </CardHead>
      {history.length === 0 ? (
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-4)",
          }}
        >
          No prior runs recorded. The next successful cycle will appear here.
        </div>
      ) : (
        history.map((r, i) => {
          const errs = r.errors?.length ?? 0;
          const state: DotState = errs > 0 ? "down" : "dream";
          return (
            <div
              key={`${r.last_run ?? i}-${i}`}
              style={{
                padding: "10px 14px",
                borderBottom:
                  i === history.length - 1 ? "none" : "1px solid var(--border-soft)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                display: "grid",
                gridTemplateColumns:
                  "16px 160px minmax(0, 1fr) 110px 110px 90px",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span className={`ds-dot ds-dot--${state}`} aria-hidden />
              <span style={{ color: "var(--fg-2)" }}>
                {r.last_run ? formatTimestamp(r.last_run) : "—"}
              </span>
              <span style={{ color: "var(--fg-3)", fontSize: 11 }}>
                {errs > 0
                  ? `${errs} error${errs === 1 ? "" : "s"}: ${(r.errors ?? [])[0]}`
                  : "clean run"}
              </span>
              <span style={{ color: "var(--fg-4)", fontSize: 11 }}>
                {r.episodes_ingested ?? 0} ep · {r.impulses_stored ?? 0} imp
              </span>
              <span style={{ color: "var(--fg-4)", fontSize: 11 }}>
                {r.facts_pruned ?? 0} pruned
              </span>
              <span style={{ color: "var(--fg-4)", fontSize: 11, textAlign: "right" }}>
                {formatDuration(r.duration_seconds)}
              </span>
            </div>
          );
        })
      )}
    </Card>
  );
}
