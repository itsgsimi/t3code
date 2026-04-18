import type { CSSProperties } from "react";
import { Plus } from "lucide-react";

import { useSentinelAgentStatus, useSentinelDeployHosts } from "../../sentinel/hooks";
import { PageCrumb, PageHeader, type DotState } from "./shared";

/**
 * Deploy — hosts declared in config.yaml host_aliases. Reachability is
 * best-effort: the local host is always "healthy" if the API is up; remote
 * host status is derived from agent.mcp_servers when an MCP server has that
 * host as its transport target. Deploy actions will be wired in a followup
 * when /v1/deploy/up/* endpoints land.
 */
export function DeployView() {
  const hosts = useSentinelDeployHosts();
  const agent = useSentinelAgentStatus();
  const hostList = hosts.data?.hosts ?? [];

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
          subtitle="Hosts Sentinel is aware of (from host_aliases in config.yaml)."
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
            {hostList.map((h) => (
              <HostCard
                key={`${h.alias}-${h.host}`}
                alias={h.alias}
                host={h.host}
                services={deriveServicesForHost(h.host, agent.data?.mcp_servers)}
              />
            ))}
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

/**
 * Best-effort: for each declared host, list MCP servers whose transport
 * targets that IP. We don't have per-host deploy status yet, so this is
 * derived from agent status.
 */
function deriveServicesForHost(
  _hostIp: string,
  _mcpServers?: Record<string, boolean>,
): Array<{ name: string; state: DotState }> {
  // Server-side enrichment isn't available in the current endpoint shape.
  // Return empty until /v1/deploy/hosts exposes per-host service lists.
  return [];
}

function HostCard({
  alias,
  host,
  services,
}: {
  alias: string;
  host: string;
  services: Array<{ name: string; state: DotState }>;
}) {
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="ds-dot ds-dot--unknown" aria-hidden />
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
          declared in host_aliases
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border-soft)" }}>
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
            no per-host service reporting yet
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
                <span className={`ds-dot ds-dot--${svc.state}`} aria-hidden />
                {svc.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
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
