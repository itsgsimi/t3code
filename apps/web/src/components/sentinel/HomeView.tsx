import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import {
  useSentinelAgentStatus,
  useSentinelHealth,
  useSentinelAgentTools,
} from "../../sentinel/hooks";

/**
 * Home — healthy-morning briefing + stack health strip + insights feed.
 * The briefing copy and insights feed are hand-written (not API data). The
 * health tiles and stack overview wire up to real Sentinel API endpoints
 * where available, with clear fallback labels when the API isn't reachable.
 * See docs/design/2026-04-18-frontend-design-brief.md §7.1.
 */
export function HomeView() {
  const health = useSentinelHealth();
  const agent = useSentinelAgentStatus();
  const apiUnreachable = health.isError;

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        {apiUnreachable ? <OfflineBanner /> : null}
        <Briefing />
        <HealthTiles health={health.data} agent={agent.data} offline={apiUnreachable} />
        <div style={twoColStyle}>
          <StackOverview />
          <RightColumn />
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

function Briefing() {
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
        maxWidth: 720,
      }}
    >
      <LogLine time="03:12" tag="dream">
        cycle complete · 14 insights · pruned 312 facts
      </LogLine>
      <LogLine time="06:01" tag="stack">
        all services <Strong>healthy</Strong> · 4/4
      </LogLine>
      <LogLine time="07:42" tag="eval">
        <span style={{ color: "var(--state-degraded-fg)" }}>beardy-tool-routing</span> stale · last
        run 9d ago
      </LogLine>
      <LogLine time="08:14" tag="now">
        sentinel.local · fri · ready
      </LogLine>
    </div>
  );
}

function LogLine({ time, tag, children }: { time: string; tag: string; children: ReactNode }) {
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
      <span style={{ color: "var(--fg-2)" }}>{children}</span>
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
  offline,
}: {
  health: HealthTilesHealth | undefined;
  agent: HealthTilesAgent | undefined;
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
      <Tile label="Last dream" value="5h ago" sub="14 insights · mocked" state="dream" />
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

  const fallbackRows: Array<[string, string, DotState]> = [
    ["mcp · graphiti", "loading…", "unknown"],
    ["mcp · web-search", "loading…", "unknown"],
    ["mcp · host-monitor", "loading…", "unknown"],
  ];

  const rows: Array<[string, string, DotState]> = agent.data
    ? Object.entries(agent.data.mcp_servers).map(([name, connected]) => {
        const group = tools.data?.find((g) => g.server === name);
        const count = group?.tools.length ?? 0;
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
    </div>
  );
}

function RightColumn() {
  return (
    <div>
      <SectionHead title="Insights from last dream" linkLabel="all 14" />
      <Card>
        <div
          className="flex items-start gap-3"
          style={{ padding: 14, borderBottom: "1px solid var(--border-soft)" }}
        >
          <span className="ds-dot ds-dot--dream" style={{ marginTop: 7 }} aria-hidden />
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--fg-1)",
              }}
            >
              you lean on <span style={{ color: "var(--ember-400)" }}>llama.cpp</span> so hard — we
              should stop calling anything else the default.
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-3)",
                marginTop: 6,
                fontFamily: "var(--font-mono)",
              }}
            >
              dream · 03:18 · filed under infra
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3" style={{ padding: 14 }}>
          <span className="ds-dot ds-dot--degraded" style={{ marginTop: 7 }} aria-hidden />
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--fg-1)",
              }}
            >
              disk at <span style={{ color: "var(--state-degraded-fg)" }}>87%</span> — three days
              until it bites. prune{" "}
              <span style={{ color: "var(--ember-400)" }}>~/models/quarantine</span>?
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-3)",
                marginTop: 6,
                fontFamily: "var(--font-mono)",
              }}
            >
              dream · 03:24 · filed under ops
            </div>
          </div>
        </div>
      </Card>

      <SectionHead title="Agents" to="/agents" linkLabel="runs" />
      <Card>
        <Row
          leading={<span className="ds-dot ds-dot--degraded" aria-hidden />}
          title="beardy-tool-routing"
          subtitle="last run · 9 days ago"
          meta="stale"
        />
        <Row
          last
          leading={<span className="ds-dot ds-dot--healthy" aria-hidden />}
          title="beardy-memory-recall"
          subtitle="last run · 6h · 92.1%"
          meta="+0.4%"
        />
      </Card>
    </div>
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
