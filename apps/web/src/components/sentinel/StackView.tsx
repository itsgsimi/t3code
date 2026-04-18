import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  useSentinelAgentStatus,
  useSentinelAgentTools,
  useSentinelHealth,
  useSentinelModelsLoaded,
} from "../../sentinel/hooks";
import type { SentinelLoadedRole } from "../../sentinel/api";
import { PageCrumb, PageHeader, type DotState } from "./shared";

/**
 * Stack — every process Sentinel manages, grouped by kind.
 * Live data comes from /v1/health, /v1/agent/status, /v1/agent/tools,
 * and /v1/models/loaded. Cards expand in place to reveal per-service
 * details (tool names for MCP, configured vs loaded for LLMs).
 */
export function StackView() {
  const [tab, setTab] = useState<TabKey>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const health = useSentinelHealth();
  const agent = useSentinelAgentStatus();
  const tools = useSentinelAgentTools();
  const loaded = useSentinelModelsLoaded();
  const services = useServices(health.data, agent.data, tools.data, loaded.data);

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
          subtitle="Every process Sentinel manages. Click a card for details."
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
            <StackCard
              key={service.id}
              service={service}
              expanded={expanded === service.id}
              onToggle={() => setExpanded(expanded === service.id ? null : service.id)}
              mcpTools={tools.data?.servers ?? {}}
            />
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
  id: string;
  name: string;
  descriptor: string;
  state: DotState;
  kind: Exclude<TabKey, "all">;
  // Rich optional payloads used by expanded card bodies.
  tools?: string[];
  role?: SentinelLoadedRole;
  note?: string;
  mcpName?: string;
}

function useServices(
  health?: { status: string; model_name?: string; context_length?: number },
  agent?: { mcp_servers: Record<string, boolean> },
  tools?: { servers: Record<string, string[]>; toolsets: Record<string, string[]> },
  loaded?: { roles: SentinelLoadedRole[] },
): readonly Service[] {
  return useMemo(() => {
    const services: Service[] = [];
    if (!health) {
      services.push({
        id: "api",
        name: "orchestrator (API)",
        descriptor: "FastAPI · :6967",
        state: "unknown",
        kind: "core",
        note: "API unreachable — run `sentinel up`",
      });
      return services;
    }
    services.push({
      id: "api",
      name: "orchestrator (API)",
      descriptor: "FastAPI · :6967",
      state: health.status === "ok" ? "healthy" : "degraded",
      kind: "core",
    });
    // One LLM card per role-with-port from /v1/models/loaded.
    for (const r of loaded?.roles ?? []) {
      if (!r.port) continue;
      const state: DotState = !r.healthy
        ? "down"
        : r.loaded_model && r.configured_model_file
          ? normalize(r.configured_model_file) !== normalize(r.loaded_model)
            ? "degraded"
            : "healthy"
          : "busy";
      services.push({
        id: `llm-${r.role}`,
        name: `llama.cpp · ${r.role}`,
        descriptor: r.loaded_model
          ? `${r.loaded_model} · :${r.port}`
          : r.healthy
            ? `up · unknown model · :${r.port}`
            : `:${r.port} unreachable`,
        state,
        kind: "models",
        role: r,
      });
    }
    const serversMap = tools?.servers ?? {};
    for (const [name, connected] of Object.entries(agent?.mcp_servers ?? {})) {
      const list = serversMap[name];
      const toolNames = Array.isArray(list) ? list : [];
      services.push({
        id: `mcp-${name}`,
        name: `mcp · ${name}`,
        descriptor:
          toolNames.length > 0
            ? `${toolNames.length} tools`
            : connected
              ? "connected"
              : "disconnected",
        state: connected ? "healthy" : "down",
        kind: classifyMcp(name),
        tools: toolNames,
        mcpName: name,
      });
    }
    return services;
  }, [health, agent, tools, loaded]);
}

function normalize(s: string): string {
  return (s.split("/").pop() ?? s).toLowerCase();
}

function classifyMcp(name: string): Exclude<TabKey, "all"> {
  if (name.includes("graphiti") || name.includes("vault") || name.includes("memory")) {
    return "memory";
  }
  return "mcp";
}

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
      <span style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
        {count}
      </span>
    </button>
  );
}

function StackCard({
  service,
  expanded,
  onToggle,
  mcpTools,
}: {
  service: Service;
  expanded: boolean;
  onToggle: () => void;
  mcpTools: Record<string, string[]>;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="cursor-pointer border-0 text-left"
      style={{
        background: "var(--canvas-1)",
        border: `1px solid ${expanded ? "var(--border-default)" : "var(--border-soft)"}`,
        borderRadius: 8,
        padding: 14,
        width: "100%",
        gridColumn: expanded ? "1 / -1" : undefined,
      }}
    >
      <div className="flex items-center gap-[9px]">
        <span className={`ds-dot ds-dot--${service.state}`} aria-hidden />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-1)" }}>
          {service.name}
        </div>
        <Badge>{service.kind}</Badge>
        <span style={{ color: "var(--fg-3)", display: "flex", marginLeft: 4 }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 6 }}>{service.descriptor}</div>
      {service.note ? (
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
          {service.note}
        </div>
      ) : null}
      {expanded ? <CardDetail service={service} mcpTools={mcpTools} /> : null}
    </button>
  );
}

function CardDetail({
  service,
  mcpTools,
}: {
  service: Service;
  mcpTools: Record<string, string[]>;
}) {
  if (service.id === "api") {
    return (
      <Detail>
        <KV label="endpoint" value="http://localhost:6967" />
        <KV label="source" value="src/sentinel/api/server.py" />
        <KV
          label="routes"
          value="/v1/health, /v1/query, /v1/agent/*, /v1/models/*, /v1/config/*, /v1/admin/*"
        />
      </Detail>
    );
  }
  if (service.id.startsWith("llm-")) {
    const r = service.role;
    if (!r) return null;
    return (
      <Detail>
        <KV label="role" value={r.role} />
        <KV label="port" value={r.port ? `:${r.port}` : "—"} />
        <KV label="configured model" value={r.configured_model_name ?? "—"} />
        <KV label="configured file" value={r.configured_model_file ?? "—"} />
        <KV
          label="loaded (live)"
          value={r.loaded_model ?? (r.healthy ? "up · unknown" : "port down")}
        />
        {r.detail ? <KV label="detail" value={r.detail} /> : null}
      </Detail>
    );
  }
  if (service.id.startsWith("mcp-")) {
    const list = service.tools ?? (service.mcpName ? (mcpTools[service.mcpName] ?? []) : []);
    return (
      <Detail>
        <KV label="tool count" value={String(list.length)} />
        {list.length > 0 ? (
          <div style={{ marginTop: 6 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--fg-3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              tools
            </div>
            <div className="flex flex-wrap gap-[6px]">
              {list.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    padding: "2px 7px",
                    borderRadius: 3,
                    background: "var(--canvas-2)",
                    border: "1px solid var(--border-soft)",
                    color: "var(--fg-2)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Detail>
    );
  }
  return null;
}

function Detail({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: "var(--canvas-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: 6,
      }}
    >
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-baseline gap-3"
      style={{ padding: "4px 0", borderBottom: "1px dashed var(--border-soft)" }}
    >
      <span
        style={{
          color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          width: 140,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--fg-1)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
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
