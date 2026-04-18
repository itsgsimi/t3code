import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { useSentinelConfigSection, useSentinelConfigSections } from "../../sentinel/hooks";
import { PageCrumb, PageHeader } from "./shared";

/**
 * Config — read-only browser for config.yaml sections, served live from
 * /v1/config/sections + /v1/config/{section}. Editor is deferred to v2.
 */
export function ConfigView() {
  const sectionsQuery = useSentinelConfigSections();
  const sectionList = useMemo(() => sectionsQuery.data?.sections ?? [], [sectionsQuery.data]);

  const [active, setActive] = useState<string | null>(null);
  const selected = active ?? sectionList[0] ?? null;
  const body = useSentinelConfigSection(selected);

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Config</PageCrumb>
        <PageHeader
          title="Config"
          chip={{
            state:
              sectionList.length === 0 && !sectionsQuery.isError
                ? "unknown"
                : sectionsQuery.isError
                  ? "down"
                  : "unknown",
            text: sectionsQuery.isError
              ? "API offline"
              : sectionList.length === 0
                ? "loading…"
                : `${sectionList.length} sections · read-only v1`,
          }}
          subtitle="Live read of config.yaml. Editing lands in v2 — for now, use your editor and reload."
        />

        <div className="grid gap-4" style={{ gridTemplateColumns: "220px minmax(0, 1fr)" }}>
          <Rail sections={sectionList} active={selected} onSelect={(s) => setActive(s)} />
          {selected ? (
            <SectionBody
              section={selected}
              value={body.data?.value}
              loading={body.isLoading}
              error={body.isError ? (body.error as Error).message : null}
            />
          ) : (
            <EmptyCard>
              {sectionsQuery.isError
                ? "Can't reach the Sentinel API. Run `sentinel up` and reload."
                : "No config sections available."}
            </EmptyCard>
          )}
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

function Rail({
  sections,
  active,
  onSelect,
}: {
  sections: readonly string[];
  active: string | null;
  onSelect: (next: string) => void;
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
      {sections.length === 0 ? (
        <span
          style={{
            padding: "8px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--fg-4)",
          }}
        >
          loading sections…
        </span>
      ) : (
        sections.map((name) => {
          const selected = name === active;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onSelect(name)}
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
              {name}
            </button>
          );
        })
      )}
    </nav>
  );
}

function SectionBody({
  section,
  value,
  loading,
  error,
}: {
  section: string;
  value: unknown;
  loading: boolean;
  error: string | null;
}) {
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
          {section}
        </h2>
        <p style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 6, marginBottom: 0 }}>
          {SECTION_DESCRIPTIONS[section] ?? "Config section from config.yaml."}
        </p>
      </div>
      {error ? (
        <EmptyCard>
          <span style={{ color: "var(--state-down-fg)" }}>Failed to load:</span> {error}
        </EmptyCard>
      ) : loading || value === undefined ? (
        <EmptyCard>loading…</EmptyCard>
      ) : (
        <Yaml>{renderYaml(value)}</Yaml>
      )}
    </div>
  );
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  model_registry: "Identity-keyed model definitions (file, port, context, profile).",
  models: "Role → registry key assignments (orchestrator, worker, …).",
  model_presets: "Named model-swap recipes.",
  mcp_servers: "Tool-server transports, hosts, ports, exclude lists.",
  toolsets: "Domain groupings with keywords, max_turns, tool allowlists.",
  agents: "Agent definitions — prompt files, model role, toolsets, temperature.",
  sessions: "Session store config — timeouts, history cap, vault persistence.",
  skill_injection: "Skill injection config — enabled, selector model, per-agent gating.",
  tool_classification: "Tool-router classifier model.",
  observational_memory: "Observational memory (temporal-decay, reflect threshold).",
  learner_memory: "Learner subsystem toggle.",
  web_search: "Web-search backend (Perplexica / SearXNG).",
  morning_briefing: "Discord briefing schedule + RSS feeds.",
  langfuse: "Langfuse observability backend.",
  memory: "Knowledge-graph backend (Graphiti + Neo4j).",
  deep_think: "Deep-think tool — model role, max tokens, temperature.",
  eval: "Eval synthetic config, results dir, regression threshold.",
  finetune: "Fine-tune workspace paths.",
  host_aliases: "IP → hostname mapping for host-monitor and deploy.",
  api_server: "FastAPI server host + port.",
  logging: "Log level + file destinations.",
};

/**
 * Minimal YAML renderer — good enough for config snippets. For complex
 * nested types we fall back to JSON.stringify with 2-space indent, which is
 * still readable in the mono surface.
 */
function renderYaml(value: unknown, depth = 0): string {
  const indent = "  ".repeat(depth);
  if (value === null || value === undefined) {
    return `${indent}null`;
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return `${indent}-\n${renderYaml(item, depth + 1)}`;
        }
        return `${indent}- ${renderYaml(item, 0)}`;
      })
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([k, v]) => {
        if (typeof v === "object" && v !== null) {
          return `${indent}${k}:\n${renderYaml(v, depth + 1)}`;
        }
        return `${indent}${k}: ${renderYaml(v, 0)}`;
      })
      .join("\n");
  }
  return String(value);
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
        maxHeight: "70vh",
      }}
    >
      {children}
    </pre>
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
