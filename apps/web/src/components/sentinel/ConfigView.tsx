import { useState, type CSSProperties, type ReactNode } from "react";

import { PageCrumb, PageHeader } from "./shared";

/**
 * Config — read-only view of config.yaml sections. Editing is deferred to v2
 * per the design brief (§7.6). The rail on the left groups sections; the
 * main area renders a summary of the selected section.
 */
export function ConfigView() {
  const [active, setActive] = useState<ConfigSection>(SECTIONS[0]!);

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Config</PageCrumb>
        <PageHeader
          title="Config"
          chip={{ state: "unknown", text: "read-only · v1" }}
          subtitle="What config/config.yaml contains. Editing lands in v2 — for now, use your editor."
        />

        <div className="grid gap-4" style={{ gridTemplateColumns: "220px minmax(0, 1fr)" }}>
          <Rail sections={SECTIONS} active={active} onSelect={setActive} />
          <SectionBody section={active} />
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

interface ConfigSection {
  key: string;
  title: string;
  summary: string;
  snippet: string;
}

const SECTIONS: readonly ConfigSection[] = [
  {
    key: "model_registry",
    title: "model_registry",
    summary: "Identity-keyed model definitions (file, port, context, profile).",
    snippet: `qwen3.5-122b-a10b:
  name: "Qwen 3.5 · 122B-A10B"
  file: "/models/qwen3.5-122b-a10b-Q4_K_M.gguf"
  port: 6969
  context_length: 128000
  provider: "llama.cpp"
  no_mmap: true
  gpu_layers: 99`,
  },
  {
    key: "models",
    title: "models (roles)",
    summary: "Role → registry key assignments (orchestrator, worker, …).",
    snippet: `orchestrator:
  use: qwen3.5-122b-a10b
worker:
  use: qwen3.5-35b-a3b
reflector:
  use: qwen3.5-27b
learner:
  use: qwen3.5-0.8b
deep_thinker:
  use: qwen3.5-27b`,
  },
  {
    key: "model_presets",
    title: "model_presets",
    summary: "Named presets for one-click swaps.",
    snippet: `qwen3.5-122b:
  orchestrator: qwen3.5-122b-a10b
qwen3.5-27b:
  orchestrator: qwen3.5-27b
gemma-4-26b:
  orchestrator: gemma-4-26b-a4b`,
  },
  {
    key: "mcp_servers",
    title: "mcp_servers",
    summary: "Tool-server transports, hosts, ports, exclude lists.",
    snippet: `graphiti-memory:
  transport: stdio
  port: 8000
  always_on: true
web-search:
  transport: http
  port: 8094
host-monitor:
  transport: http
  host: 192.168.1.31
  port: 8082`,
  },
  {
    key: "toolsets",
    title: "toolsets",
    summary: "Domain groupings with keywords, max_turns, tool allowlists.",
    snippet: `monitoring:
  description: "System health, logs, processes"
  keywords: [disk, cpu, memory, uptime, process]
  max_turns: 6
  servers: [host-monitor, graphiti-memory]
research:
  description: "External knowledge"
  servers: [web-search, graphiti-memory]
  max_turns: 10`,
  },
  {
    key: "agents",
    title: "agents",
    summary: "Agent definitions — prompt files, model role, toolsets, temp.",
    snippet: `orchestrator:
  prompt_file: agents/orchestrator/AGENT.md
  model: orchestrator
  temperature: 0.4
  skills:
    - morning-briefing
    - deep-think
    - home-iot`,
  },
  {
    key: "sessions",
    title: "sessions",
    summary: "Session store config — timeouts, history cap, vault persistence.",
    snippet: `idle_timeout: 1800
max_sessions: 50
max_history_messages: 40
persist_to_memory_server: true`,
  },
  {
    key: "morning_briefing",
    title: "morning_briefing",
    summary: "Discord briefing schedule + RSS feeds.",
    snippet: `enabled: true
channel_id: 1489833003201859614
time: "07:00"
timezone: America/Phoenix
feeds:
  - name: Hacker News
    url: https://hnrss.org/frontpage`,
  },
  {
    key: "deep_think",
    title: "deep_think",
    summary: "Deep-think tool — model role, max tokens, temperature.",
    snippet: `enabled: true
model: deep_thinker
max_tokens: 8000
temperature: 0.7`,
  },
  {
    key: "eval",
    title: "eval",
    summary: "Eval synthetic config, results dir, regression threshold.",
    snippet: `synthetic:
  llm_url: http://192.168.1.142:8383/v1
  llm_model: qwen3.5-9b
  default_count: 10
results_dir: benchmarks/results
regression_threshold: 0.05`,
  },
];

function Rail({
  sections,
  active,
  onSelect,
}: {
  sections: readonly ConfigSection[];
  active: ConfigSection;
  onSelect: (next: ConfigSection) => void;
}) {
  return (
    <nav
      aria-label="Config sections"
      className="flex flex-col gap-[2px]"
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 8,
      }}
    >
      {sections.map((section) => {
        const selected = section.key === active.key;
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => onSelect(section)}
            className="cursor-pointer border-0 text-left"
            style={{
              padding: "7px 10px",
              borderRadius: 5,
              background: selected ? "var(--canvas-3)" : "transparent",
              color: selected ? "var(--fg-1)" : "var(--fg-2)",
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
            }}
          >
            {section.title}
          </button>
        );
      })}
    </nav>
  );
}

function SectionBody({ section }: { section: ConfigSection }) {
  return (
    <div>
      <div
        style={{
          background: "var(--canvas-1)",
          border: "1px solid var(--border-soft)",
          borderRadius: 8,
          padding: 18,
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            fontWeight: 600,
            color: "var(--fg-1)",
            margin: 0,
          }}
        >
          {section.title}
        </h2>
        <p style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 6, marginBottom: 0 }}>
          {section.summary}
        </p>
      </div>
      <Yaml>{section.snippet}</Yaml>
    </div>
  );
}

function Yaml({ children }: { children: ReactNode }) {
  return (
    <pre
      style={{
        background: "var(--canvas-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 16,
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        color: "var(--fg-1)",
        lineHeight: 1.55,
        margin: 0,
        overflow: "auto",
      }}
    >
      {children}
    </pre>
  );
}
