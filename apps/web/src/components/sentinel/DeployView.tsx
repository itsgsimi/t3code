import { useState, type CSSProperties, type ReactNode } from "react";
import { Plus } from "lucide-react";

import {
  useSentinelAgentStatus,
  useSentinelConfigSection,
  useSentinelDeployHosts,
} from "../../sentinel/hooks";
import { DetailSheet, useDetailSheetParam } from "./DetailSheet";
import { PageCrumb, PageHeader } from "./shared";

/**
 * Deploy — hosts declared in config.yaml host_aliases.
 * Selecting a card opens a right-side DetailSheet with per-service details
 * derived from mcp_servers whose transport targets the host's IP.
 */
export function DeployView() {
  const hosts = useSentinelDeployHosts();
  const agent = useSentinelAgentStatus();
  const mcpSection = useSentinelConfigSection("mcp_servers");
  const urlSelected = useDetailSheetParam("deploy");
  const [selectedId, setSelectedId] = useState<string | null>(urlSelected);

  const hostList = hosts.data?.hosts ?? [];
  const mcpServers = (mcpSection.data?.value ?? {}) as Record<string, Record<string, unknown>>;

  const decorated = hostList.map((h) => {
    const id = `${h.alias}-${h.host}`;
    const services = servicesForHost(h.host, mcpServers, agent.data?.mcp_servers);
    return { id, alias: h.alias, host: h.host, services };
  });
  const selected = decorated.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="flex min-w-0 flex-1">
      <div className="min-w-0 flex-1 overflow-auto">
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

          {decorated.length === 0 ? (
            <EmptyCard>
              {hosts.isError
                ? "Can't reach the Sentinel API — run `uv run sentinel api up` and refresh."
                : "No hosts declared. Add entries under `host_aliases:` in config.yaml (name → IP or hostname), then use `sentinel provision <host>` from the CLI."}
            </EmptyCard>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 12,
              }}
            >
              {decorated.map((d) => (
                <HostCard
                  key={d.id}
                  alias={d.alias}
                  host={d.host}
                  services={d.services}
                  selected={selectedId === d.id}
                  onSelect={() => setSelectedId(d.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DetailSheet
        open={!!selected}
        title={selected?.alias ?? ""}
        eyebrow="host"
        onClose={() => setSelectedId(null)}
        persist={{ key: "deploy", value: selected?.id ?? null }}
      >
        {selected ? <HostDetail host={selected.host} services={selected.services} /> : null}
      </DetailSheet>
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
  const normalized = configuredHost.toLowerCase();
  if (normalized === hostIp) return true;
  return false;
}

function HostCard({
  alias,
  host,
  services,
  selected,
  onSelect,
}: {
  alias: string;
  host: string;
  services: HostService[];
  selected: boolean;
  onSelect: () => void;
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
      onClick={onSelect}
      className="cursor-pointer border-0 text-left"
      style={{
        background: selected ? "var(--canvas-2)" : "var(--canvas-1)",
        border: `1px solid ${selected ? "var(--border-default)" : "var(--border-soft)"}`,
        borderRadius: 8,
        overflow: "hidden",
        width: "100%",
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
            className="ml-auto"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}
          >
            {host}
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
      </div>
    </button>
  );
}

function HostDetail({ host, services }: { host: string; services: HostService[] }) {
  return (
    <div>
      <div
        style={{
          padding: 12,
          background: "var(--canvas-2)",
          border: "1px solid var(--border-soft)",
          borderRadius: 6,
          marginBottom: 12,
        }}
      >
        <KV label="ip" value={host} />
        <KV label="service count" value={String(services.length)} />
      </div>
      {services.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-4)",
            padding: "8px 0",
          }}
        >
          No MCP servers point at this host.
        </div>
      ) : (
        services.map((svc) => (
          <div
            key={svc.name}
            style={{
              padding: 12,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              borderRadius: 6,
              marginBottom: 10,
            }}
          >
            <div
              className="mb-2 flex items-center gap-2"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                color: "var(--fg-1)",
              }}
            >
              <span
                className={`ds-dot ds-dot--${
                  svc.healthy === true ? "healthy" : svc.healthy === false ? "down" : "unknown"
                }`}
                aria-hidden
              />
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
        ))
      )}
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
