import type { CSSProperties } from "react";
import { Plus } from "lucide-react";

import { PageCrumb, PageHeader, type DotState } from "./shared";

/**
 * Deploy — remote hosts + provisioning.
 * Hosts sourced conceptually from config.yaml host_aliases.
 * Real deploy actions are deferred to the API-wiring phase.
 */
export function DeployView() {
  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Deploy</PageCrumb>
        <PageHeader
          title="Deploy"
          chip={{
            state: "healthy",
            text: `${HOSTS.filter((h) => h.state === "healthy").length} / ${HOSTS.length} hosts reachable`,
          }}
          subtitle="Remote hosts Sentinel can deploy services to."
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
            className="flex cursor-pointer items-center gap-2 border-0"
            style={{
              padding: "6px 12px",
              borderRadius: 5,
              background: "var(--ember-400)",
              color: "var(--fg-on-accent)",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <Plus size={14} />
            Provision host
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {HOSTS.map((h) => (
            <HostCard key={h.host} host={h} />
          ))}
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

interface Host {
  alias: string;
  host: string;
  role: string;
  state: DotState;
  runtime: "docker" | "systemd";
  uptime: string;
  services: readonly { name: string; state: DotState }[];
  lastDeploy: string;
}

const HOSTS: readonly Host[] = [
  {
    alias: "sentinel",
    host: "localhost",
    role: "primary · strix halo",
    state: "healthy",
    runtime: "docker",
    uptime: "14d 03h",
    lastDeploy: "self-managed",
    services: [
      { name: "llama-orchestrator", state: "healthy" },
      { name: "graphiti-memory", state: "healthy" },
      { name: "web-search", state: "healthy" },
      { name: "api-server", state: "healthy" },
    ],
  },
  {
    alias: "bearden",
    host: "192.168.1.31",
    role: "monitored workstation",
    state: "healthy",
    runtime: "systemd",
    uptime: "42d 11h",
    lastDeploy: "2026-04-12 09:03",
    services: [{ name: "host-monitor", state: "healthy" }],
  },
  {
    alias: "nornic",
    host: "192.168.1.142",
    role: "langfuse · classifier",
    state: "healthy",
    runtime: "docker",
    uptime: "31d 07h",
    lastDeploy: "2026-04-04 14:11",
    services: [
      { name: "langfuse", state: "healthy" },
      { name: "llama-classifier", state: "healthy" },
    ],
  },
  {
    alias: "vault",
    host: "192.168.1.153",
    role: "sentinel-vault",
    state: "healthy",
    runtime: "docker",
    uptime: "61d",
    lastDeploy: "2026-02-17 22:41",
    services: [{ name: "sentinel-vault", state: "healthy" }],
  },
];

function HostCard({ host }: { host: Host }) {
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
          <span className={`ds-dot ds-dot--${host.state}`} aria-hidden />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-1)" }}>
            {host.alias}
          </span>
          <span
            className="ml-auto"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}
          >
            {host.host}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4 }}>{host.role}</div>
      </div>
      <div
        style={{
          padding: "10px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--fg-3)",
        }}
      >
        <div className="flex justify-between" style={{ marginBottom: 4 }}>
          <span>runtime</span>
          <span style={{ color: "var(--fg-2)" }}>{host.runtime}</span>
        </div>
        <div className="flex justify-between" style={{ marginBottom: 4 }}>
          <span>uptime</span>
          <span style={{ color: "var(--fg-2)" }}>{host.uptime}</span>
        </div>
        <div className="flex justify-between">
          <span>last deploy</span>
          <span style={{ color: "var(--fg-2)" }}>{host.lastDeploy}</span>
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
        <ul style={{ listStyle: "none", margin: 0, padding: "0 14px 12px" }}>
          {host.services.map((svc) => (
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
      </div>
    </div>
  );
}
