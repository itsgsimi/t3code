import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import {
  useSentinelAgentStatus,
  useSentinelConfigSection,
  useSentinelDeployHosts,
} from "../../sentinel/hooks";
import { PageCrumb, PageHeader } from "./shared";

/**
 * Deploy — hosts declared in config.yaml host_aliases.
 * Click a card to expand service details for that host (derived from
 * mcp_servers whose transport targets the host's IP).
 */
export function DeployView() {
  const hosts = useSentinelDeployHosts();
  const agent = useSentinelAgentStatus();
  const mcpSection = useSentinelConfigSection("mcp_servers");
  const [expanded, setExpanded] = useState<string | null>(null);

  const hostList = hosts.data?.hosts ?? [];
  const mcpServers = (mcpSection.data?.value ?? {}) as Record<string, Record<string, unknown>>;

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Deploy</PageCrumb>
        <PageHeader
          title="Deploy"
          chip={{
            state: hostList.length === 0 ? "unknown" : "healthy",
            text:
              hostList.length === 0
                ? hosts.isError
                  ? "API offline"
                  : "loading…"
                : `${hostList.length} hosts declared`,
          }}
          subtitle="Hosts Sentinel is aware of (from host_aliases in config.yaml). Click a card for details."
        />

        <div className="flex items-center" style={{ marginBottom: 14 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--fg-2)",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            Hosts
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="flex cursor-default items-center gap-2 border-0"
            disabled
            style={{
              padding: "6px 12px",
              borderRadius: 5,
              background: "var(--canvas-3)",
              color: "var(--fg-4)",
              border: "1px solid var(--border-soft)",
              fontSize: 12.5,
              fontWeight: 500,
            }}
            title="Provisioning via web not wired yet — use `sentinel provision <host>`"
          >
            <Plus size={14} />
            Provision host (CLI only)
          </button>
        </div>

        {hostList.length === 0 ? (
          <EmptyCard>
            {hosts.isError ? "Can't reach the Sentinel API." : "No hosts declared in host_aliases."}
          </EmptyCard>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 12,
            }}
          >
            {hostList.map((h) => {
              const id = `${h.alias}-${h.host}`;
              const services = servicesForHost(h.host, mcpServers, agent.data?.mcp_servers);
              const isExpanded = expanded === id;
              return (
                <HostCard
                  key={id}
                  alias={h.alias}
                  host={h.host}
                  services={services}
                  expanded={isExpanded}
                  onToggle={() => setExpanded(isExpanded ? null : id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: "24px 28px 60px",
  maxWidth: 1200,
  margin: "0 auto",
};

interface HostService {
  name: string;
  healthy: boolean | null;
  transport: string;
  port: number | null;
  endpoint: string | null;
}

function servicesForHost(
  hostIp: string,
  mcpServers: Record<string, Record<string, unknown>>,
  mcpHealth?: Record<string, boolean>,
): HostService[] {
  const results: HostService[] = [];
  for (const [name, cfgValue] of Object.entries(mcpServers)) {
    if (typeof cfgValue !== "object" || cfgValue === null) continue;
    const cfg = cfgValue as Record<string, unknown>;
    const hostnameRaw = cfg["hostname"] ?? cfg["host"];
    const hostname = typeof hostnameRaw === "string" ? hostnameRaw : "localhost";
    if (!matchesHost(hostname, hostIp)) continue;
    results.push({
      name,
      healthy: mcpHealth ? (mcpHealth[name] ?? null) : null,
      transport: typeof cfg["transport"] === "string" ? (cfg["transport"] as string) : "stdio",
      port: typeof cfg["port"] === "number" ? (cfg["port"] as number) : null,
      endpoint: typeof cfg["endpoint"] === "string" ? (cfg["endpoint"] as string) : null,
    });
  }
  return results;
}

function matchesHost(configuredHost: string, hostIp: string): boolean {
  // "localhost" + "127.0.0.1" both live on the local box — treat the
  // primary workstation entry (often the LAN IP) as a local host when the
  // configured_host is "localhost".
  const normalized = configuredHost.toLowerCase();
  if (normalized === hostIp) return true;
  return false;
}

function HostCard({
  alias,
  host,
  services,
  expanded,
  onToggle,
}: {
  alias: string;
  host: string;
  services: HostService[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const state =
    services.length === 0
      ? "unknown"
      : services.every((s) => s.healthy === true)
        ? "healthy"
        : services.some((s) => s.healthy === false)
          ? "degraded"
          : "unknown";
  return (
    <button
      type="button"
      onClick={onToggle}
      className="cursor-pointer border-0 text-left"
      style={{
        background: "var(--canvas-1)",
        border: `1px solid ${expanded ? "var(--border-default)" : "var(--border-soft)"}`,
        borderRadius: 8,
        overflow: "hidden",
        width: "100%",
        gridColumn: expanded ? "1 / -1" : undefined,
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className={`ds-dot ds-dot--${state}`} aria-hidden />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-1)" }}>
            {alias}
          </span>
          <span
            className="ml-auto flex items-center gap-2"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}
          >
            {host}
            <span style={{ color: "var(--fg-3)", display: "flex" }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4 }}>
          declared in host_aliases · {services.length} service
          {services.length === 1 ? "" : "s"}
        </div>
      </div>
      <div>
        <div
          style={{
            padding: "8px 14px 4px",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--fg-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          services
        </div>
        {services.length === 0 ? (
          <div
            style={{
              padding: "0 14px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--fg-4)",
            }}
          >
            no MCP servers point at this host
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: "0 14px 12px" }}>
            {services.map((svc) => (
              <li
                key={svc.name}
                className="flex items-center gap-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--fg-2)",
                  padding: "3px 0",
                }}
              >
                <span
                  className={`ds-dot ds-dot--${
                    svc.healthy === true ? "healthy" : svc.healthy === false ? "down" : "unknown"
                  }`}
                  aria-hidden
                />
                {svc.name}
              </li>
            ))}
          </ul>
        )}
        {expanded ? <HostDetail host={host} services={services} /> : null}
      </div>
    </button>
  );
}

function HostDetail({ host, services }: { host: string; services: HostService[] }) {
  return (
    <div
      style={{
        margin: "0 14px 14px",
        padding: 12,
        background: "var(--canvas-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: 6,
      }}
    >
      <KV label="ip" value={host} />
      <KV label="service count" value={String(services.length)} />
      {services.map((svc) => (
        <div key={svc.name} style={{ marginTop: 10 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--fg-1)",
              marginBottom: 6,
            }}
          >
            {svc.name}
          </div>
          <KV label="transport" value={svc.transport} />
          {svc.port ? <KV label="port" value={`:${svc.port}`} /> : null}
          {svc.endpoint ? <KV label="endpoint" value={svc.endpoint} /> : null}
          <KV
            label="health"
            value={
              svc.healthy === true ? "healthy" : svc.healthy === false ? "not connected" : "unknown"
            }
          />
        </div>
      ))}
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
          width: 120,
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
