import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * Stack — every process Sentinel manages, grouped by kind.
 * Data is mocked for this pass. See docs/design/2026-04-18-frontend-design-brief.md §7.2.
 */
export function StackView() {
  const [tab, setTab] = useState<TabKey>("all");

  const cards = SERVICES.filter((s) => (tab === "all" ? true : s.kind === tab));

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 18 }}>Sentinel / Stack</div>
        <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--fg-1)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Stack
          </h1>
          <span className="ds-dot ds-dot--healthy" aria-hidden />
          <span
            style={{
              fontSize: 12,
              color: "var(--state-healthy-fg)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {countHealthy(SERVICES)} / {SERVICES.length} healthy
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--fg-3)", margin: "6px 0 18px" }}>
          Every process Sentinel manages. Click a card to drill into logs and config.
        </p>

        <div
          className="flex gap-1"
          style={{ marginBottom: 16, borderBottom: "1px solid var(--border-soft)" }}
        >
          {TABS.map((t) => (
            <Tab
              key={t}
              label={t}
              active={tab === t}
              count={t === "all" ? SERVICES.length : SERVICES.filter((s) => s.kind === t).length}
              onClick={() => setTab(t)}
            />
          ))}
        </div>

        <div style={gridStyle}>
          {cards.map((service) => (
            <StackCard key={service.name} {...service} />
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

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: 12,
};

type TabKey = "all" | "core" | "models" | "mcp" | "memory";

const TABS: readonly TabKey[] = ["all", "core", "models", "mcp", "memory"] as const;

type DotState = "healthy" | "busy" | "degraded" | "down" | "dream" | "unknown";

interface Service {
  name: string;
  descriptor: string;
  state: DotState;
  kind: Exclude<TabKey, "all">;
  latency: string;
  uptime: string;
  note?: string;
}

const SERVICES: readonly Service[] = [
  {
    name: "llama.cpp",
    descriptor: "Model runtime · :6969",
    state: "healthy",
    kind: "models",
    latency: "38ms",
    uptime: "14d 03h",
    note: "qwen3.5-122b-a10b loaded",
  },
  {
    name: "llama.cpp · worker",
    descriptor: "Model runtime · :6966",
    state: "healthy",
    kind: "models",
    latency: "18ms",
    uptime: "14d 03h",
  },
  {
    name: "orchestrator (API)",
    descriptor: "FastAPI · :6967",
    state: "healthy",
    kind: "core",
    latency: "12ms",
    uptime: "14d 03h",
  },
  {
    name: "discord-bridge",
    descriptor: "Two-way bridge",
    state: "healthy",
    kind: "core",
    latency: "110ms",
    uptime: "14d 03h",
  },
  {
    name: "host-monitor",
    descriptor: "Remote · 192.168.1.31 (bearden)",
    state: "healthy",
    kind: "core",
    latency: "4ms",
    uptime: "14d 03h",
  },
  {
    name: "mcp · web-search",
    descriptor: "Perplexica adapter · :8094",
    state: "healthy",
    kind: "mcp",
    latency: "7ms",
    uptime: "14d 03h",
  },
  {
    name: "mcp · graphiti",
    descriptor: "Memory · 14,203 nodes",
    state: "healthy",
    kind: "memory",
    latency: "22ms",
    uptime: "14d 03h",
    note: "last write · 03:24",
  },
  {
    name: "mcp · sentinel-vault",
    descriptor: "Remote · 192.168.1.153:8081",
    state: "healthy",
    kind: "mcp",
    latency: "9ms",
    uptime: "14d 03h",
  },
  {
    name: "mcp · home-iot",
    descriptor: "Govee + Home Assistant",
    state: "degraded",
    kind: "mcp",
    latency: "320ms",
    uptime: "4h 12m",
    note: "hub polling slow · retry in 45s",
  },
  {
    name: "neo4j",
    descriptor: "Graphiti backend · :7687",
    state: "healthy",
    kind: "memory",
    latency: "2ms",
    uptime: "31d",
  },
];

function countHealthy(services: readonly Service[]) {
  return services.filter((s) => s.state === "healthy").length;
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
