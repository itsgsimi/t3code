import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import {
  useSentinelAgentStatus,
  useSentinelAgentTools,
  useSentinelApplyModelMode,
  useSentinelDreamRuns,
  useSentinelEvalRuns,
  useSentinelHealth,
  useSentinelModelsModes,
  useSentinelSessions,
  useSentinelSystemStats,
  useSentinelToolCalls,
  useStackAction,
} from "../../sentinel/hooks";
import type {
  SentinelDreamRun,
  SentinelEvalRun,
  SentinelSession,
  SentinelSystemStats,
  StackAction,
  StackTier,
  ToolCallsResponse,
  ToolCallTurn,
} from "../../sentinel/api";
import { useConfirm } from "./primitives";

/**
 * Home — stack status + latest dream cycle + recent evals. All tiles wire
 * to real Sentinel endpoints; unreachable API degrades gracefully via the
 * OfflineBanner + empty-state labels on individual tiles.
 *
 * No mocked data. Fallback text appears only when the API is unreachable.
 */
export function HomeView() {
  const health = useSentinelHealth();
  const agent = useSentinelAgentStatus();
  const dream = useSentinelDreamRuns();
  const evals = useSentinelEvalRuns(5);
  const sessions = useSentinelSessions(8);
  const apiUnreachable = health.isError;

  const latestDream = dream.data?.runs?.[0] ?? null;
  const latestEvals = evals.data?.runs ?? [];
  const latestSessions = sessions.data ?? [];

  return (
    <div className="min-w-0 flex-1 overflow-auto">
      <div style={pageStyle}>
        {apiUnreachable ? <OfflineBanner /> : null}
        <Briefing
          dream={latestDream}
          healthStatus={health.data?.status}
          mcpStatus={agent.data?.mcp_servers ?? {}}
          latestEval={latestEvals[0]}
        />
        <HealthTiles
          health={health.data}
          agent={agent.data}
          dream={latestDream}
          offline={apiUnreachable}
        />
        <SystemRow offline={apiUnreachable} />
        <OrchestratorModeCard offline={apiUnreachable} />
        <div style={twoColStyle}>
          <StackOverview />
          <RightColumn
            dream={latestDream}
            evals={latestEvals}
            sessions={latestSessions}
          />
        </div>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: "20px 22px 60px",
  maxWidth: 1200,
  margin: "0 auto",
};

const twoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
  gap: 12,
  marginTop: 4,
};

function OfflineBanner() {
  return (
    <div
      className="flex items-start gap-2"
      style={{
        background: "var(--state-down-bg)",
        border: "1px solid var(--state-down-bg)",
        color: "var(--state-down-fg)",
        borderRadius: 6,
        padding: "10px 14px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        marginBottom: 12,
      }}
    >
      <span className="ds-dot ds-dot--down" style={{ marginTop: 5 }} aria-hidden />
      <div>
        <div style={{ color: "var(--state-down-fg)", fontWeight: 500 }}>
          Can't reach the Sentinel API.
        </div>
        <div style={{ color: "var(--fg-3)", marginTop: 2 }}>
          Run <span style={{ color: "var(--fg-1)" }}>sentinel up</span> (or{" "}
          <span style={{ color: "var(--fg-1)" }}>sentinel api up</span>) and reload. Tiles below
          show placeholder values until the stack is reachable.
        </div>
      </div>
    </div>
  );
}

function Briefing({
  dream,
  healthStatus,
  mcpStatus,
  latestEval,
}: {
  dream: SentinelDreamRun | null;
  healthStatus: string | undefined;
  mcpStatus: Record<string, boolean>;
  latestEval: SentinelEvalRun | undefined;
}) {
  const connected = Object.values(mcpStatus).filter(Boolean).length;
  const total = Object.values(mcpStatus).length;
  const mcpLine = total === 0 ? "loading…" : `${connected} / ${total} mcp servers connected`;
  const apiLine =
    healthStatus === "ok" ? (
      <>
        api <Strong>healthy</Strong>
      </>
    ) : (
      "api loading…"
    );
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.65,
        color: "var(--fg-2)",
        marginBottom: 28,
        border: "1px solid var(--border-soft)",
        borderRadius: 6,
        background: "var(--canvas-1)",
        padding: "12px 14px",
        maxWidth: 1200,
      }}
    >
      {dream ? (
        <LogLine time={formatClock(dream.last_run)} tag="dream">
          {dream.errors && dream.errors.length > 0 ? (
            <span style={{ color: "var(--state-down-fg)" }}>
              cycle had {dream.errors.length} error
              {dream.errors.length === 1 ? "" : "s"}
            </span>
          ) : (
            <>
              cycle complete · <Strong>{dream.episodes_ingested ?? 0}</Strong> episodes ·
              pruned {dream.facts_pruned ?? 0} facts
            </>
          )}
        </LogLine>
      ) : (
        <LogLine time="—" tag="dream">
          no dream runs yet
        </LogLine>
      )}
      <LogLine time="now" tag="stack">
        {apiLine} · {mcpLine}
      </LogLine>
      {latestEval ? (
        <LogLine time={formatRelative(latestEval.mtime)} tag="eval">
          {latestEval.suite ?? shortFile(latestEval.file)}
          {typeof latestEval.pass_rate === "number" ? (
            <>
              {" · "}
              <Strong>{Math.round(latestEval.pass_rate * 100)}%</Strong>
            </>
          ) : null}
        </LogLine>
      ) : null}
      <LogLine time="—" tag="ready" />
    </div>
  );
}

function shortFile(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/^\d{4}-\d{2}-\d{2}-\d+-/, "").replace(/\.json$/, "");
}

function formatClock(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function formatRelative(iso: string | undefined): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "—";
  const deltaMs = Date.now() - ts;
  const mins = Math.round(deltaMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 36) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function LogLine({
  time,
  tag,
  children,
}: {
  time: string;
  tag: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex gap-[10px]">
      <span style={{ color: "var(--fg-4)", flexShrink: 0, width: 48 }}>{time}</span>
      <span
        style={{
          color: "var(--fg-3)",
          flexShrink: 0,
          width: 64,
          letterSpacing: "0.04em",
        }}
      >
        {tag}
      </span>
      {children ? <span style={{ color: "var(--fg-2)" }}>{children}</span> : null}
    </div>
  );
}

function Strong({ children }: { children: ReactNode }) {
  return <span style={{ color: "var(--fg-1)" }}>{children}</span>;
}

// ---- Health tiles ---------------------------------------------------------

interface HealthTilesHealth {
  model_name?: string | undefined;
  context_length?: number | undefined;
}
interface HealthTilesAgent {
  mcp_servers: Record<string, boolean>;
  tool_count: number;
}
function HealthTiles({
  health,
  agent,
  dream,
  offline,
}: {
  health: HealthTilesHealth | undefined;
  agent: HealthTilesAgent | undefined;
  dream: SentinelDreamRun | null;
  offline: boolean;
}) {
  const modelName = health?.model_name ?? "—";
  const contextLength = health?.context_length
    ? `${Math.round(health.context_length / 1000)}k ctx`
    : offline
      ? "offline"
      : "loading";

  const servers = agent ? Object.values(agent.mcp_servers) : [];
  const connected = servers.filter(Boolean).length;
  const total = servers.length;
  const servicesValue = total === 0 ? (offline ? "—" : "…") : `${connected} / ${total}`;
  const servicesState: DotState =
    total === 0
      ? "unknown"
      : connected === total
        ? "healthy"
        : connected === 0
          ? "down"
          : "degraded";

  const toolCount = agent?.tool_count ?? 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 10,
      }}
    >
      <Tile
        label="Active model"
        value={modelName}
        sub={contextLength}
        state={offline ? "unknown" : "healthy"}
        mono
      />
      <Tile
        label="Services"
        value={servicesValue}
        sub={total === 0 ? "not reporting" : `${connected} connected`}
        state={servicesState}
      />
      <Tile
        label="Tools available"
        value={String(toolCount)}
        sub="via MCP"
        state={toolCount > 0 ? "healthy" : "unknown"}
      />
      <Tile
        label="Last dream"
        value={dream ? formatRelative(dream.last_run) : offline ? "—" : "never"}
        sub={
          dream
            ? dream.errors && dream.errors.length > 0
              ? `${dream.errors.length} errors · ${dream.facts_pruned ?? 0} pruned`
              : `${dream.episodes_ingested ?? 0} eps · ${dream.facts_pruned ?? 0} pruned`
            : "not triggered yet"
        }
        state={
          dream
            ? dream.errors && dream.errors.length > 0
              ? "down"
              : "dream"
            : "unknown"
        }
      />
    </div>
  );
}

type DotState = "healthy" | "busy" | "degraded" | "down" | "dream" | "unknown";

function Tile({
  label,
  value,
  sub,
  state,
  mono,
}: {
  label: string;
  value: string;
  sub: string;
  state?: DotState;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--fg-3)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? "var(--font-mono)" : "var(--font-display)",
          fontSize: mono ? 16 : 22,
          fontWeight: 600,
          color: "var(--fg-1)",
          letterSpacing: mono ? 0 : "-0.02em",
          lineHeight: 1.1,
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
      <div className="flex items-center gap-[6px]" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
        {state ? <span className={`ds-dot ds-dot--${state}`} aria-hidden /> : null}
        {sub}
      </div>
    </div>
  );
}

// ---- Stack overview ------------------------------------------------------

function SectionHead({ title, to, linkLabel }: { title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between" style={{ margin: "32px 0 12px" }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--fg-2)",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {to ? (
        <Link
          to={to}
          className="inline-flex cursor-pointer items-center gap-1"
          style={{
            fontSize: 12,
            color: "var(--fg-3)",
            textDecoration: "none",
          }}
        >
          {linkLabel ?? "open"} <ArrowRight size={12} />
        </Link>
      ) : null}
    </div>
  );
}

function StackOverview() {
  const agent = useSentinelAgentStatus();
  const tools = useSentinelAgentTools();
  const toolCalls = useSentinelToolCalls(10);

  const fallbackRows: Array<[string, string, DotState]> = [
    ["mcp · graphiti", "loading…", "unknown"],
    ["mcp · web-search", "loading…", "unknown"],
    ["mcp · host-monitor", "loading…", "unknown"],
  ];

  const serversMap = tools.data?.servers ?? {};
  const rows: Array<[string, string, DotState]> = agent.data
    ? Object.entries(agent.data.mcp_servers).map(([name, connected]) => {
        const toolList = serversMap[name];
        const count = Array.isArray(toolList) ? toolList.length : 0;
        return [
          `mcp · ${name}`,
          count > 0 ? `${count} tools` : connected ? "connected" : "no tools",
          connected ? "healthy" : "down",
        ];
      })
    : fallbackRows;

  return (
    <div>
      <SectionHead title="Stack" to="/stack" linkLabel="open stack" />
      <Card>
        {rows.map(([name, sub, state], i) => (
          <Row
            key={name}
            last={i === rows.length - 1}
            leading={<span className={`ds-dot ds-dot--${state}`} aria-hidden />}
            title={name}
            subtitle={sub}
          />
        ))}
      </Card>

      <SectionHead title="Tool activity" to="/agents" linkLabel="diagnostics" />
      <ToolActivityCard data={toolCalls.data} isError={toolCalls.isError} />
    </div>
  );
}

function ToolActivityCard({
  data,
  isError,
}: {
  data: ToolCallsResponse | undefined;
  isError: boolean;
}) {
  if (isError) {
    return (
      <Card>
        <div
          style={{
            padding: 18,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-3)",
          }}
        >
          No runtime trace available. Is the API up?
        </div>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card>
        <div
          style={{
            padding: 18,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-4)",
          }}
        >
          Loading tool activity…
        </div>
      </Card>
    );
  }
  const { turns, tool_calls_total, tool_calls_with_error, tools_histogram, last_turn_at, recent } =
    data;
  const topTools = Object.entries(tools_histogram)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);
  const errRate = tool_calls_total > 0 ? tool_calls_with_error / tool_calls_total : 0;
  const errState: DotState =
    tool_calls_total === 0
      ? "unknown"
      : errRate === 0
        ? "healthy"
        : errRate < 0.1
          ? "degraded"
          : "down";

  return (
    <Card>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 0,
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <StatCell label="turns" value={String(turns)} sub={last_turn_at ? `last ${formatRelative(last_turn_at)}` : "—"} />
        <StatCell label="tool calls" value={String(tool_calls_total)} sub={turns > 0 ? `${(tool_calls_total / turns).toFixed(1)} / turn` : "—"} />
        <StatCell
          label="errors"
          value={String(tool_calls_with_error)}
          sub={tool_calls_total > 0 ? `${Math.round(errRate * 100)}%` : "—"}
          state={errState}
        />
      </div>
      {topTools.length > 0 ? (
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {topTools.map(([name, count]) => (
            <span
              key={name}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                background: "var(--canvas-2)",
                color: "var(--fg-2)",
                border: "1px solid var(--border-soft)",
              }}
            >
              {name} <span style={{ color: "var(--fg-3)" }}>×{count}</span>
            </span>
          ))}
        </div>
      ) : null}
      {recent.length === 0 ? (
        <div
          style={{
            padding: 18,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-3)",
          }}
        >
          No tool invocations yet. Ask Beardy to do something.
        </div>
      ) : (
        recent.slice(0, 4).map((turn, i) => (
          <ToolTurnRow key={`${turn.trace_id ?? turn.session_id}-${i}`} turn={turn} last={i === Math.min(recent.length, 4) - 1} />
        ))
      )}
    </Card>
  );
}

function StatCell({
  label,
  value,
  sub,
  state,
}: {
  label: string;
  value: string;
  sub: string;
  state?: DotState;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRight: "1px solid var(--border-soft)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--fg-3)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 600,
          color: "var(--fg-1)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        className="flex items-center gap-[6px]"
        style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
      >
        {state ? <span className={`ds-dot ds-dot--${state}`} aria-hidden /> : null}
        {sub}
      </div>
    </div>
  );
}

function ToolTurnRow({ turn, last }: { turn: ToolCallTurn; last: boolean }) {
  const state: DotState = turn.error_count > 0 ? "down" : turn.tool_count > 0 ? "healthy" : "unknown";
  const preview = turn.query_preview || "(no query)";
  const toolsLabel = turn.tools.length === 0 ? "no tools" : turn.tools.slice(0, 3).join(", ") + (turn.tools.length > 3 ? ` +${turn.tools.length - 3}` : "");
  return (
    <div
      className="flex items-center gap-[10px]"
      style={{
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontSize: 12.5,
      }}
    >
      <span className={`ds-dot ds-dot--${state}`} aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--fg-1)",
            fontSize: 12,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {preview}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-3)",
            marginTop: 2,
            fontFamily: "var(--font-mono)",
          }}
        >
          {toolsLabel}
          {turn.error_count > 0 ? (
            <span style={{ color: "var(--state-down-fg)" }}> · {turn.error_count} err</span>
          ) : null}
        </div>
      </div>
      <div
        style={{
          color: "var(--fg-4)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        {turn.response_chars > 0 ? `${Math.round(turn.response_chars / 100) / 10}kc` : "—"}
      </div>
    </div>
  );
}

function RightColumn({
  dream,
  evals,
  sessions,
}: {
  dream: SentinelDreamRun | null;
  evals: readonly SentinelEvalRun[];
  sessions: readonly SentinelSession[];
}) {
  return (
    <div>
      <SectionHead title="Last dream cycle" to="/agents" linkLabel="history" />
      <Card>
        {dream ? (
          <DreamSummary dream={dream} />
        ) : (
          <div
            style={{
              padding: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-3)",
            }}
          >
            No dream runs yet. Trigger one with{" "}
            <span style={{ color: "var(--fg-1)" }}>sentinel dream run</span>.
          </div>
        )}
      </Card>

      <SectionHead title="Recent evals" to="/agents" linkLabel="all" />
      <Card>
        {evals.length === 0 ? (
          <div
            style={{
              padding: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-3)",
            }}
          >
            No eval runs yet.
          </div>
        ) : (
          evals.slice(0, 4).map((run, i) => {
            const title = run.suite ?? shortFile(run.file);
            const sub =
              typeof run.pass_rate === "number"
                ? `${formatRelative(run.mtime)} · ${Math.round(run.pass_rate * 100)}%`
                : formatRelative(run.mtime);
            const state: DotState =
              typeof run.pass_rate === "number"
                ? run.pass_rate >= 0.9
                  ? "healthy"
                  : run.pass_rate >= 0.7
                    ? "degraded"
                    : "down"
                : "unknown";
            return (
              <Row
                key={run.file}
                last={i === Math.min(evals.length, 4) - 1}
                leading={<span className={`ds-dot ds-dot--${state}`} aria-hidden />}
                title={title}
                subtitle={sub}
                {...(typeof run.cases_passed === "number" && typeof run.cases_total === "number"
                  ? { meta: `${run.cases_passed}/${run.cases_total}` }
                  : {})}
              />
            );
          })
        )}
      </Card>

      <SectionHead title="Recent sessions" to="/agents" linkLabel="all" />
      <Card>
        {sessions.length === 0 ? (
          <div
            style={{
              padding: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-3)",
            }}
          >
            No sessions yet.
          </div>
        ) : (
          sessions.slice(0, 5).map((s, i) => {
            const label = s.topic_preview ?? s.session_id;
            const sub = `${s.message_count} msg${s.message_count === 1 ? "" : "s"} · ${
              s.last_activity ? formatRelative(s.last_activity) : "—"
            }`;
            return (
              <Row
                key={s.session_id}
                last={i === Math.min(sessions.length, 5) - 1}
                leading={<span className="ds-dot ds-dot--healthy" aria-hidden />}
                title={label}
                subtitle={sub}
              />
            );
          })
        )}
      </Card>
    </div>
  );
}

function DreamSummary({ dream }: { dream: SentinelDreamRun }) {
  const hasErrors = (dream.errors?.length ?? 0) > 0;
  return (
    <div style={{ padding: 14 }}>
      <div
        className="flex items-start gap-3"
        style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: 10 }}
      >
        <span
          className={`ds-dot ds-dot--${hasErrors ? "down" : "dream"}`}
          style={{ marginTop: 7 }}
          aria-hidden
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--fg-1)",
            }}
          >
            {dream.last_run ? formatRelative(dream.last_run) : "—"}
            {dream.dry_run ? " · dry-run" : ""}
            {typeof dream.duration_seconds === "number"
              ? ` · took ${Math.round(dream.duration_seconds)}s`
              : ""}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--fg-3)",
              marginTop: 6,
              fontFamily: "var(--font-mono)",
            }}
          >
            sessions {dream.sessions_reviewed ?? 0} · episodes {dream.episodes_ingested ?? 0} ·
            impulses {dream.impulses_stored ?? 0} · pruned {dream.facts_pruned ?? 0}
          </div>
        </div>
      </div>
      {hasErrors ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--state-down-fg)",
            marginTop: 10,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {(dream.errors ?? []).slice(0, 3).join("\n")}
        </div>
      ) : null}
    </div>
  );
}

function SystemRow({ offline }: { offline: boolean }) {
  const stats = useSentinelSystemStats();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
        gap: 12,
        marginTop: 12,
      }}
    >
      <SystemStatsCard data={stats.data} offline={offline} error={stats.isError} />
      <StackControlsCard offline={offline} />
    </div>
  );
}

function SystemStatsCard({
  data,
  offline,
  error,
}: {
  data: SentinelSystemStats | undefined;
  offline: boolean;
  error: boolean;
}) {
  const gpuTemp = data?.gpu_temp_c;
  const gpuPower = data?.gpu_power_w;
  const gpuFan = data?.gpu_fan_pct;
  const memTotal = data?.memory_total_gb ?? 0;
  const memUsed = data?.memory_used_gb ?? 0;
  const memPct = memTotal > 0 ? (memUsed / memTotal) * 100 : null;
  const load1 = data?.cpu_load_1m;
  const cpuCount = data?.cpu_count ?? null;
  const cpuPct = cpuCount && load1 != null ? Math.min(100, (load1 / cpuCount) * 100) : null;

  const unreachable = offline || error;
  const hasAmd = data?.amdgpu_top_available ?? false;
  const computePct = data?.fdinfo_compute_pct ?? null;
  const gfxFdPct = data?.fdinfo_gfx_pct ?? null;
  // Strix Halo reality: fdinfo counters read 0 for llama-server workloads,
  // and rocm-smi's aggregate pins at 100% whenever VRAM is allocated. Both
  // are useless as "is the GPU actually busy" signals. Socket power tracks
  // real activity — idle ~45 W, full load ~150 W on this TDP class.
  const fdinfoUsable = (computePct ?? 0) > 0 || (gfxFdPct ?? 0) > 0;
  const powerW = data?.socket_power_w ?? data?.gpu_power_w ?? null;
  // Rough TDP ceiling for the widget's pct bar. Strix Halo tops out in the
  // 120-160 W range depending on the specific part; 160 W is a conservative
  // upper bound so real load reads near 100 % without capping mid-generation.
  const POWER_CEILING_W = 160;
  const powerPct = powerW != null
    ? Math.min(100, Math.max(0, (powerW / POWER_CEILING_W) * 100))
    : null;
  // Pick the pct shown on the big bar. Prefer fdinfo when it actually reports
  // (non-zero), else prefer derived-from-power, else fall back to rocm-smi.
  const gpuSource: "fdinfo" | "power" | "rocm-smi" | "none" = fdinfoUsable
    ? "fdinfo"
    : powerPct != null
      ? "power"
      : data?.gpu_use_pct != null
        ? "rocm-smi"
        : "none";
  const realGpuPct = gpuSource === "fdinfo"
    ? Math.max(computePct ?? 0, gfxFdPct ?? 0)
    : gpuSource === "power"
      ? powerPct
      : gpuSource === "rocm-smi"
        ? data?.gpu_use_pct ?? null
        : null;
  const aggregatePct = data?.gfx_activity_pct ?? data?.gpu_use_pct ?? null;

  const vramUsedMib = data?.gtt_used_mib ?? null;
  const vramTotalMib = data?.gtt_total_mib ?? null;
  const vramPct =
    vramUsedMib != null && vramTotalMib && vramTotalMib > 0
      ? (vramUsedMib / vramTotalMib) * 100
      : null;

  return (
    <div>
      <SectionHead title="System" />
      <Card>
        <div style={{ padding: "14px 16px" }}>
          <StatBar
            label={
              gpuSource === "fdinfo"
                ? "GPU compute (fdinfo)"
                : gpuSource === "power"
                  ? `GPU load (via power, ${powerW?.toFixed(0)} W / ${POWER_CEILING_W} W)`
                  : gpuSource === "rocm-smi"
                    ? "GPU use (rocm-smi)"
                    : "GPU"
            }
            value={
              realGpuPct != null
                ? `${realGpuPct.toFixed(0)}%`
                : unreachable
                  ? "—"
                  : "…"
            }
            pct={realGpuPct}
            dim={unreachable}
          />
          {hasAmd && gpuSource === "power" ? (
            <div
              style={{
                marginTop: -6,
                marginBottom: 10,
                fontSize: 11,
                color: "var(--fg-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              fdinfo reads 0 for llama-server on this APU; load inferred from socket power.
              aggregate GRBM {aggregatePct != null ? `${aggregatePct.toFixed(0)}% ` : ""}
              stays near 100% whenever VRAM is allocated.
            </div>
          ) : hasAmd && aggregatePct != null ? (
            <div
              style={{
                marginTop: -6,
                marginBottom: 10,
                fontSize: 11,
                color: "var(--fg-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              aggregate GFX activity (GRBM) {aggregatePct.toFixed(0)}% — can show high when
              memory controller busy without real compute
            </div>
          ) : null}
          {hasAmd ? (
            <StatBar
              label="Unified memory (GTT)"
              value={
                vramUsedMib != null && vramTotalMib
                  ? `${(vramUsedMib / 1024).toFixed(1)} / ${(vramTotalMib / 1024).toFixed(0)} GB`
                  : "—"
              }
              pct={vramPct}
              dim={unreachable}
            />
          ) : null}
          <StatBar
            label="System memory"
            value={
              memTotal > 0
                ? `${memUsed.toFixed(1)} / ${memTotal.toFixed(0)} GB`
                : unreachable
                  ? "—"
                  : "…"
            }
            pct={memPct}
            dim={unreachable}
          />
          <StatBar
            label="CPU load (1m)"
            value={
              load1 != null
                ? cpuCount
                  ? `${load1.toFixed(2)} / ${cpuCount}`
                  : load1.toFixed(2)
                : unreachable
                  ? "—"
                  : "…"
            }
            pct={cpuPct}
            dim={unreachable}
          />
          <div
            className="flex flex-wrap"
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid var(--border-soft)",
              gap: 18,
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--fg-3)",
            }}
          >
            <span>
              gpu temp · {gpuTemp != null ? `${gpuTemp.toFixed(0)}°C` : "—"}
            </span>
            <span>
              gpu power ·{" "}
              {data?.socket_power_w != null
                ? `${data.socket_power_w.toFixed(0)} W`
                : gpuPower != null
                  ? `${gpuPower.toFixed(0)} W`
                  : "—"}
            </span>
            <span>gpu fan · {gpuFan != null ? `${gpuFan.toFixed(0)}%` : "—"}</span>
            {hasAmd ? (
              <>
                <span>
                  sclk · {data?.sclk_mhz != null ? `${data.sclk_mhz.toFixed(0)} MHz` : "—"}
                </span>
                <span>
                  mclk · {data?.mclk_mhz != null ? `${data.mclk_mhz.toFixed(0)} MHz` : "—"}
                </span>
                <span>
                  fclk · {data?.fclk_mhz != null ? `${data.fclk_mhz.toFixed(0)} MHz` : "—"}
                </span>
              </>
            ) : null}
            <span>
              load 5/15 ·{" "}
              {data?.cpu_load_5m != null && data?.cpu_load_15m != null
                ? `${data.cpu_load_5m.toFixed(2)} / ${data.cpu_load_15m.toFixed(2)}`
                : "—"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatBar({
  label,
  value,
  pct,
  dim,
}: {
  label: string;
  value: string;
  pct: number | null;
  dim?: boolean;
}) {
  const clamped = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const color =
    pct == null
      ? "var(--border-soft)"
      : clamped > 85
        ? "var(--state-down-fg)"
        : clamped > 65
          ? "var(--state-degraded-fg, #d89a2a)"
          : "var(--state-healthy-fg, #4ea86b)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        className="flex items-baseline justify-between"
        style={{ fontSize: 11.5, marginBottom: 4 }}
      >
        <span style={{ color: "var(--fg-2)", letterSpacing: "0.02em", textTransform: "uppercase" }}>
          {label}
        </span>
        <span
          style={{
            color: dim ? "var(--fg-3)" : "var(--fg-1)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "var(--canvas-3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            background: color,
            transition: "width 0.6s ease",
            opacity: dim ? 0.35 : 1,
          }}
        />
      </div>
    </div>
  );
}

function StackControlsCard({ offline }: { offline: boolean }) {
  return (
    <div>
      <SectionHead title="Controls" to="/stack" linkLabel="open stack" />
      <Card>
        <div style={{ padding: "12px 14px" }}>
          <StackTierControls tier="all" label="full stack" subtitle="sentinel up / down" offline={offline} />
          <StackTierControls
            tier="llm"
            label="llm containers"
            subtitle="docker compose · models"
            offline={offline}
            divider
          />
          <StackTierControls
            tier="mcp"
            label="mcp servers"
            subtitle="tool servers · PID-managed"
            offline={offline}
            divider
          />
        </div>
      </Card>
    </div>
  );
}

function StackTierControls({
  tier,
  label,
  subtitle,
  offline,
  divider,
}: {
  tier: StackTier;
  label: string;
  subtitle: string;
  offline: boolean;
  divider?: boolean;
}) {
  const lifecycle = useStackAction(tier);
  const job = lifecycle.job;
  const busy = lifecycle.isRunning;
  const confirm = useConfirm();

  async function handle(action: StackAction) {
    if (action === "down" || action === "restart") {
      const ok = await confirm({
        title: `${action === "down" ? "Stop" : "Restart"} ${label}?`,
        body: (
          <span>
            This will {action === "down" ? "stop" : "restart"} <code>{tier}</code>
            {" "}— {subtitle}. Active workloads will be interrupted.
          </span>
        ),
        confirmLabel: action === "down" ? "Stop" : "Restart",
        destructive: action === "down",
      });
      if (!ok) return;
    }
    await lifecycle.trigger(action);
  }

  const statusLabel = busy
    ? `${job?.action ?? "…"} running`
    : job?.status === "ok"
      ? `${job.action} ok`
      : job?.status === "error"
        ? `${job.action} failed`
        : lifecycle.triggerError
          ? "trigger failed"
          : null;

  const statusColor =
    job?.status === "error" || lifecycle.triggerError
      ? "var(--state-down-fg)"
      : job?.status === "ok"
        ? "var(--state-healthy-fg, #4ea86b)"
        : "var(--fg-3)";

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: "10px 0",
        borderTop: divider ? "1px solid var(--border-soft)" : "none",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, color: "var(--fg-1)", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
          {statusLabel ? (
            <>
              <span style={{ color: statusColor, fontFamily: "var(--font-mono)" }}>
                {statusLabel}
              </span>
              {" · "}
              {subtitle}
            </>
          ) : (
            subtitle
          )}
        </div>
      </div>
      <TierButton label="up" onClick={() => handle("up")} disabled={busy || offline} />
      <TierButton label="down" onClick={() => handle("down")} disabled={busy || offline} danger />
      <TierButton label="restart" onClick={() => handle("restart")} disabled={busy || offline} />
    </div>
  );
}

function TierButton({
  label,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "5px 10px",
        borderRadius: 5,
        border: `1px solid ${danger ? "var(--state-down-bg)" : "var(--border-soft)"}`,
        background: "var(--canvas-2)",
        color: danger ? "var(--state-down-fg)" : "var(--fg-1)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        textTransform: "lowercase",
      }}
    >
      {label}
    </button>
  );
}

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

function Row({
  last,
  leading,
  title,
  subtitle,
  meta,
}: {
  last?: boolean;
  leading: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
}) {
  return (
    <div
      className="flex items-center gap-[10px]"
      style={{
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontSize: 12.5,
      }}
    >
      {leading}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)", fontSize: 12 }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{subtitle}</div>
        ) : null}
      </div>
      {meta ? (
        <div
          style={{
            color: "var(--fg-3)",
            fontSize: 11.5,
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
          }}
        >
          {meta}
        </div>
      ) : null}
    </div>
  );
}

function OrchestratorModeCard({ offline }: { offline: boolean }) {
  const modes = useSentinelModelsModes();
  const apply = useSentinelApplyModelMode();
  const [pending, setPending] = useState<string | null>(null);

  const orchestrator = modes.data?.orchestrator;
  const modeNames = orchestrator ? Object.keys(orchestrator.modes).sort() : [];

  if (offline || !orchestrator) {
    return null;
  }
  if (modeNames.length === 0) {
    return null;
  }

  const current = orchestrator.active_mode ?? orchestrator.default_mode ?? "";
  const overridden =
    !!orchestrator.active_mode &&
    orchestrator.active_mode !== orchestrator.default_mode;
  const modeCfg = current ? orchestrator.modes[current] : undefined;

  async function handleChange(next: string) {
    if (!next || next === current) return;
    setPending(next);
    try {
      await apply.mutateAsync({ role: "orchestrator", mode: next });
    } finally {
      setPending(null);
    }
  }

  async function handleReset() {
    if (!overridden) return;
    setPending(orchestrator?.default_mode ?? "default");
    try {
      await apply.mutateAsync({ role: "orchestrator", mode: "default" });
    } finally {
      setPending(null);
    }
  }

  const samplerBits: string[] = [];
  if (modeCfg?.temperature !== undefined) samplerBits.push(`temp ${modeCfg.temperature}`);
  if (modeCfg?.top_p !== undefined) samplerBits.push(`top_p ${modeCfg.top_p}`);
  if (modeCfg?.top_k !== undefined) samplerBits.push(`top_k ${modeCfg.top_k}`);
  if (modeCfg?.presence_penalty !== undefined)
    samplerBits.push(`presence ${modeCfg.presence_penalty}`);
  let thinkingLabel: string | null = null;
  if (modeCfg?.chat_template_kwargs) {
    try {
      const parsed = JSON.parse(modeCfg.chat_template_kwargs) as {
        enable_thinking?: boolean;
      };
      thinkingLabel =
        parsed.enable_thinking === true
          ? "thinking"
          : parsed.enable_thinking === false
            ? "instruct"
            : null;
    } catch {
      // ignore malformed JSON
    }
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: "12px 16px",
        background: "var(--canvas-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
      }}
    >
      <div
        className="flex items-center gap-3"
        style={{
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "var(--fg-3)",
          }}
        >
          Orchestrator mode
        </span>
        <select
          value={current}
          onChange={(e) => void handleChange(e.target.value)}
          disabled={apply.isPending}
          style={{
            padding: "5px 8px",
            borderRadius: 5,
            background: "var(--canvas-3)",
            border: `1px solid ${
              overridden ? "var(--state-healthy-fg)" : "var(--border-default)"
            }`,
            color: "var(--fg-1)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            minWidth: 240,
          }}
        >
          {modeNames.map((name) => (
            <option key={name} value={name}>
              {name}
              {name === orchestrator.default_mode ? " (default)" : ""}
            </option>
          ))}
        </select>
        {apply.isPending && pending ? (
          <span
            className="flex items-center gap-1"
            style={{ color: "var(--fg-3)", fontSize: 11.5 }}
          >
            <Loader2 size={12} className="animate-spin" />
            applying {pending}…
          </span>
        ) : null}
        {overridden && !apply.isPending ? (
          <button
            type="button"
            onClick={() => void handleReset()}
            title={`Reset to default (${orchestrator.default_mode})`}
            className="flex items-center gap-1"
            style={{
              padding: "4px 8px",
              borderRadius: 5,
              background: "var(--canvas-3)",
              border: "1px solid var(--border-soft)",
              color: "var(--fg-2)",
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={11} /> default
          </button>
        ) : null}
        {apply.isError ? (
          <span
            style={{ color: "var(--state-down-fg)", fontSize: 11.5 }}
            title={(apply.error as Error).message}
          >
            apply failed — hover
          </span>
        ) : null}
        <span
          style={{
            marginLeft: "auto",
            color: "var(--fg-3)",
            fontSize: 11.5,
          }}
        >
          {orchestrator.model_name ?? orchestrator.model_id ?? "—"}
        </span>
      </div>
      {modeCfg ? (
        <div
          style={{
            marginTop: 8,
            color: "var(--fg-3)",
            fontSize: 11.5,
            fontFamily: "var(--font-mono)",
          }}
        >
          {modeCfg.description ? (
            <div style={{ color: "var(--fg-2)" }}>{modeCfg.description}</div>
          ) : null}
          {thinkingLabel || samplerBits.length ? (
            <div style={{ marginTop: 4 }}>
              {thinkingLabel ? (
                <span
                  style={{
                    marginRight: 10,
                    color: "var(--fg-1)",
                  }}
                >
                  [{thinkingLabel}]
                </span>
              ) : null}
              {samplerBits.join(" · ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
