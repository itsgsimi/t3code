import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import {
  useSentinelAgentStatus,
  useSentinelAgentTools,
  useSentinelHealth,
} from "../../sentinel/hooks";
import { PageCrumb, PageHeader, type DotState } from "./shared";

/**
 * Stack — every process Sentinel manages, grouped by kind.
 * Live data comes from /v1/health, /v1/agent/status, /v1/agent/tools. When
 * the API is unreachable we fall back to a small synthetic list so operators
 * can still see the page shape.
 */
export function StackView() {
  const [tab, setTab] = useState<TabKey>("all");
  const health = useSentinelHealth();
  const agent = useSentinelAgentStatus();
  const tools = useSentinelAgentTools();
  const services = useServices(health.data, agent.data, tools.data);

  const filtered = services.filter((s) => (tab === "all" ? true : s.kind === tab));
  const healthyCount = services.filter((s) => s.state === "healthy").length;
  const offline = health.isError;

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Stack</PageCrumb>
        <PageHeader
          title="Stack"
          chip={{
            state: offline ? "down" : healthyCount === services.length ? "healthy" : "degraded",
            text: offline ? "API offline" : `${healthyCount} / ${services.length} healthy`,
          }}
          subtitle="Every process Sentinel manages. State and tool counts come from the live API."
        />

        <div
          className="flex gap-1"
          style={{ marginBottom: 16, borderBottom: "1px solid var(--border-soft)" }}
        >
          {TABS.map((t) => (
            <Tab
              key={t}
              label={t}
              active={tab === t}
              count={t === "all" ? services.length : services.filter((s) => s.kind === t).length}
              onClick={() => setTab(t)}
            />
          ))}
        </div>

        <div style={gridStyle}>
          {filtered.map((service) => (
            <StackCard key={service.name} {...service} />
          ))}
          {filtered.length === 0 ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-3)",
                padding: "16px 0",
              }}
            >
              No services matching {tab}.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: "24px 28px 60px",
  maxWidth: 1200,
  margin: "0 auto",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: 12,
};

type TabKey = "all" | "core" | "models" | "mcp" | "memory";

const TABS: readonly TabKey[] = ["all", "core", "models", "mcp", "memory"] as const;

interface Service {
  name: string;
  descriptor: string;
  state: DotState;
  kind: Exclude<TabKey, "all">;
  latency: string;
  uptime: string;
  note?: string;
}

function useServices(
  health?: { status: string; model_name?: string; context_length?: number },
  agent?: { mcp_servers: Record<string, boolean> },
  tools?: Array<{ server: string; tools: { name: string }[] }>,
): readonly Service[] {
  return useMemo(() => {
    const apiReachable = Boolean(health);

    if (!apiReachable) {
      return FALLBACK_SERVICES;
    }

    const apiCard: Service = {
      name: "orchestrator (API)",
      descriptor: "FastAPI · :6967",
      state: health?.status === "ok" ? "healthy" : "degraded",
      kind: "core",
      latency: "—",
      uptime: "—",
    };

    const modelCard: Service | null = health?.model_name
      ? {
          name: "llama.cpp",
          descriptor: `${health.model_name}${
            health.context_length ? ` · ${Math.round(health.context_length / 1000)}k ctx` : ""
          }`,
          state: "healthy",
          kind: "models",
          latency: "—",
          uptime: "—",
        }
      : null;

    const mcpCards: Service[] = agent
      ? Object.entries(agent.mcp_servers).map(([name, connected]) => {
          const toolCount = tools?.find((g) => g.server === name)?.tools.length ?? 0;
          return {
            name: `mcp · ${name}`,
            descriptor:
              toolCount > 0 ? `${toolCount} tools` : connected ? "connected" : "disconnected",
            state: connected ? "healthy" : "down",
            kind: classifyMcp(name),
            latency: "—",
            uptime: "—",
          };
        })
      : [];

    return [apiCard, ...(modelCard ? [modelCard] : []), ...mcpCards];
  }, [health, agent, tools]);
}

function classifyMcp(name: string): Exclude<TabKey, "all"> {
  if (name.includes("graphiti") || name.includes("vault") || name.includes("memory")) {
    return "memory";
  }
  return "mcp";
}

/** Shown when /v1/health is unreachable — lets the page render with shape. */
const FALLBACK_SERVICES: readonly Service[] = [
  {
    name: "orchestrator (API)",
    descriptor: "FastAPI · :6967",
    state: "unknown",
    kind: "core",
    latency: "—",
    uptime: "—",
    note: "API unreachable — run `sentinel up`",
  },
];

function Tab({
  label,
  active,
  count,
  onClick,
}: {
  label: TabKey;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-[6px] border-0 bg-transparent"
      style={{
        padding: "8px 12px",
        fontSize: 12.5,
        color: active ? "var(--fg-1)" : "var(--fg-3)",
        borderBottom: `2px solid ${active ? "var(--ember-400)" : "transparent"}`,
        marginBottom: -1,
      }}
    >
      {label}
      <span
        style={{
          fontSize: 10,
          color: "var(--fg-4)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function StackCard({ name, descriptor, state, kind, latency, uptime, note }: Service) {
  return (
    <button
      type="button"
      className="cursor-pointer border-0 text-left"
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 14,
        width: "100%",
      }}
    >
      <div className="mb-[10px] flex items-center gap-[9px]">
        <span className={`ds-dot ds-dot--${state}`} aria-hidden />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-1)" }}>
          {name}
        </div>
        <Badge>{kind}</Badge>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>{descriptor}</div>
      <div className="mt-[6px] grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Metric label="latency" value={latency} />
        <Metric label="uptime" value={uptime} />
      </div>
      {note ? (
        <div
          style={{
            marginTop: 10,
            padding: "6px 8px",
            fontSize: 11.5,
            color: "var(--fg-2)",
            background: "var(--canvas-2)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
          }}
        >
          {note}
        </div>
      ) : null}
    </button>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className="ml-auto"
      style={{
        fontSize: 10.5,
        padding: "2px 7px",
        borderRadius: 3,
        fontFamily: "var(--font-mono)",
        background: "var(--canvas-3)",
        color: "var(--fg-3)",
      }}
    >
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: "var(--fg-1)",
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}
