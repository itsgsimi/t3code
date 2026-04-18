import { useState, type CSSProperties, type ReactNode } from "react";

import { PageCrumb, PageHeader, Tabs, type DotState, type TabOption } from "./shared";

/**
 * Agents — evals, dream, sessions browser, fine-tune, langfuse.
 * Data is mocked for this pass; the domain is sourced from the CLI reference
 * and docs/design/2026-04-18-frontend-design-brief.md §7.4.
 */
export function AgentsView() {
  const [tab, setTab] = useState<TabKey>("evals");

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Agents</PageCrumb>
        <PageHeader
          title="Agents"
          chip={{ state: "healthy", text: "3 tracks · healthy" }}
          subtitle="Evals, nightly dream, session history, fine-tuning, and the Langfuse bridge."
        />

        <Tabs value={tab} onChange={(v) => setTab(v as TabKey)} options={TABS} />

        {tab === "evals" ? <EvalsTab /> : null}
        {tab === "dream" ? <DreamTab /> : null}
        {tab === "sessions" ? <SessionsTab /> : null}
        {tab === "finetune" ? <FineTuneTab /> : null}
        {tab === "langfuse" ? <LangfuseTab /> : null}
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: "24px 28px 60px",
  maxWidth: 1200,
  margin: "0 auto",
};

type TabKey = "evals" | "dream" | "sessions" | "finetune" | "langfuse";

const TABS: readonly TabOption[] = [
  { key: "evals", label: "Evals", count: 16 },
  { key: "dream", label: "Dream" },
  { key: "sessions", label: "Sessions" },
  { key: "finetune", label: "Fine-tune", count: 3 },
  { key: "langfuse", label: "Langfuse" },
];

// ---- Evals ----------------------------------------------------------------

interface EvalRun {
  suite: string;
  track: "grounding" | "dataset" | "online";
  when: string;
  duration: string;
  passRate: string;
  delta: string;
  state: DotState;
}

const EVAL_RUNS: readonly EvalRun[] = [
  {
    suite: "beardy-tool-routing",
    track: "dataset",
    when: "2026-04-09",
    duration: "11m",
    passRate: "89.4%",
    delta: "stale · 9d",
    state: "degraded",
  },
  {
    suite: "grounding-faithfulness",
    track: "grounding",
    when: "2026-04-17 22:01",
    duration: "12m",
    passRate: "100%",
    delta: "+0.0%",
    state: "healthy",
  },
  {
    suite: "grounding-contradiction",
    track: "grounding",
    when: "2026-04-17 22:14",
    duration: "9m",
    passRate: "95%",
    delta: "+5%",
    state: "healthy",
  },
  {
    suite: "grounding-scope",
    track: "grounding",
    when: "2026-04-17 22:23",
    duration: "7m",
    passRate: "100%",
    delta: "+0.0%",
    state: "healthy",
  },
  {
    suite: "grounding-personality",
    track: "grounding",
    when: "2026-04-17 22:30",
    duration: "6m",
    passRate: "100%",
    delta: "+2%",
    state: "healthy",
  },
  {
    suite: "beardy-safety",
    track: "dataset",
    when: "2026-04-15 14:02",
    duration: "4m",
    passRate: "100%",
    delta: "+0.0%",
    state: "healthy",
  },
  {
    suite: "beardy-general-qa",
    track: "dataset",
    when: "2026-04-14 09:11",
    duration: "8m",
    passRate: "94.1%",
    delta: "-0.6%",
    state: "degraded",
  },
  {
    suite: "response-quality (online)",
    track: "online",
    when: "continuous",
    duration: "—",
    passRate: "87/90",
    delta: "—",
    state: "healthy",
  },
];

function EvalsTab() {
  return (
    <Card>
      <TableHead
        columns={["suite", "track", "when", "duration", "pass rate", "Δ"]}
        widths={["1.4fr", "100px", "160px", "80px", "100px", "100px"]}
      />
      {EVAL_RUNS.map((run, i) => (
        <div
          key={run.suite}
          className="grid items-center gap-3"
          style={{
            gridTemplateColumns: "1.4fr 100px 160px 80px 100px 100px",
            padding: "10px 14px",
            borderBottom: i === EVAL_RUNS.length - 1 ? "none" : "1px solid var(--border-soft)",
            fontSize: 12.5,
          }}
        >
          <span
            className="flex items-center gap-[6px]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}
          >
            <span className={`ds-dot ds-dot--${run.state}`} aria-hidden />
            {run.suite}
          </span>
          <TagPill>{run.track}</TagPill>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11.5 }}>
            {run.when}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>
            {run.duration}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>
            {run.passRate}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              color: run.delta.includes("-") ? "var(--state-degraded-fg)" : "var(--fg-3)",
            }}
          >
            {run.delta}
          </span>
        </div>
      ))}
    </Card>
  );
}

// ---- Dream ----------------------------------------------------------------

function DreamTab() {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)" }}>
      <Card>
        <CardHead>Next run</CardHead>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--fg-2)",
          }}
        >
          <KV label="scheduled" value="01:00 phoenix · in 16h 42m" />
          <KV label="orchestrator" value="gemma-4-26b-a4b" />
          <KV label="expected duration" value="8–12 min" />
          <KV label="sessions in queue" value="14" />
        </div>
        <div style={{ borderTop: "1px solid var(--border-soft)", padding: "10px 14px" }}>
          <button
            type="button"
            className="cursor-pointer border-0"
            style={{
              padding: "7px 14px",
              borderRadius: 5,
              background: "var(--ember-400)",
              color: "var(--fg-on-accent)",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            Run dream now
          </button>
        </div>
      </Card>
      <Card>
        <CardHead>Last run · 2026-04-18 08:00 UTC</CardHead>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: "var(--fg-2)",
            lineHeight: 1.7,
          }}
        >
          <div>
            <span style={{ color: "var(--fg-3)" }}>03:12</span> swap · qwen3.5-122b → gemma-4-26b
          </div>
          <div>
            <span style={{ color: "var(--fg-3)" }}>03:13</span> reviewed · 14 sessions
          </div>
          <div>
            <span style={{ color: "var(--fg-3)" }}>03:19</span> extracted · 27 insights
          </div>
          <div>
            <span style={{ color: "var(--fg-3)" }}>03:22</span> pruned · 312 stale facts
          </div>
          <div>
            <span style={{ color: "var(--fg-3)" }}>03:24</span> posted · #dreamstate-report
          </div>
          <div>
            <span style={{ color: "var(--fg-3)" }}>03:26</span> restore · gemma → qwen3.5-122b
          </div>
        </div>
      </Card>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-baseline gap-3"
      style={{ padding: "4px 0", borderBottom: "1px dashed var(--border-soft)" }}
    >
      <span style={{ color: "var(--fg-3)", fontSize: 11, width: 140 }}>{label}</span>
      <span style={{ color: "var(--fg-1)", fontSize: 13 }}>{value}</span>
    </div>
  );
}

// ---- Sessions (browser hint) ---------------------------------------------

function SessionsTab() {
  return (
    <Card>
      <div style={{ padding: 18, fontSize: 13, color: "var(--fg-2)" }}>
        The live Sessions surface lives at{" "}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--fg-1)",
            background: "var(--canvas-3)",
            padding: "2px 6px",
            borderRadius: 3,
          }}
        >
          / (Sessions)
        </span>
        . This tab is for <em>browsing historical</em> sessions from the vault — search, filter by
        model, by tool calls, by contains-error. Planned for a later pass; the data endpoint is{" "}
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>
          GET /v1/sessions
        </span>
        .
      </div>
    </Card>
  );
}

// ---- Fine-tune ------------------------------------------------------------

const FT_DATASETS = [
  { name: "beardy-sft-v3", examples: 2481, updated: "2 days ago", kind: "SFT" },
  { name: "tool-routing-classifier", examples: 841, updated: "5 days ago", kind: "classifier" },
  { name: "skill-selection-classifier", examples: 512, updated: "1w ago", kind: "classifier" },
] as const;

const FT_RECIPES = [
  { name: "beardy-sft-lora-r16", base: "qwen3.5-0.8b", epochs: 3, lr: "1e-4", status: "ready" },
  { name: "tool-routing-probe", base: "qwen3.5-0.8b", epochs: 2, lr: "5e-4", status: "ready" },
] as const;

function FineTuneTab() {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
      <div>
        <div style={sectionHeadStyle}>Datasets</div>
        <Card>
          {FT_DATASETS.map((d, i) => (
            <div
              key={d.name}
              className="flex items-center gap-3"
              style={{
                padding: "10px 14px",
                borderBottom:
                  i === FT_DATASETS.length - 1 ? "none" : "1px solid var(--border-soft)",
                fontSize: 12.5,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)", flex: 1 }}>
                {d.name}
              </span>
              <TagPill>{d.kind}</TagPill>
              <span
                style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11.5 }}
              >
                {d.examples.toLocaleString()} rows
              </span>
              <span style={{ color: "var(--fg-3)", fontSize: 11, minWidth: 80 }}>{d.updated}</span>
            </div>
          ))}
        </Card>
      </div>
      <div>
        <div style={sectionHeadStyle}>Recipes</div>
        <Card>
          {FT_RECIPES.map((r, i) => (
            <div
              key={r.name}
              className="flex items-center gap-3"
              style={{
                padding: "10px 14px",
                borderBottom: i === FT_RECIPES.length - 1 ? "none" : "1px solid var(--border-soft)",
                fontSize: 12.5,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)", flex: 1 }}>
                {r.name}
              </span>
              <span
                style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11.5 }}
              >
                {r.base} · {r.epochs}ep · lr {r.lr}
              </span>
              <TagPill>{r.status}</TagPill>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ---- Langfuse -------------------------------------------------------------

function LangfuseTab() {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
      <Card>
        <CardHead>Connection</CardHead>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: "var(--fg-2)",
          }}
        >
          <KV label="endpoint" value="http://192.168.1.142:3100" />
          <KV label="auth" value="connected as beardai" />
          <KV label="traces (24h)" value="1,204" />
          <KV label="online evaluators" value="response-quality · instruction-following" />
        </div>
      </Card>
      <Card>
        <CardHead>Prompt sync</CardHead>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: "var(--fg-2)",
            lineHeight: 1.7,
          }}
        >
          <div>✓ agents/orchestrator/AGENT.md</div>
          <div>✓ agents/orchestrator/SOUL.md</div>
          <div>✓ agents/orchestrator/skills/ (12 skills)</div>
          <div style={{ color: "var(--fg-3)", marginTop: 10 }}>last sync · 3h ago</div>
        </div>
        <div style={{ borderTop: "1px solid var(--border-soft)", padding: "10px 14px" }}>
          <button
            type="button"
            className="cursor-pointer border-0"
            style={{
              padding: "6px 12px",
              borderRadius: 5,
              background: "var(--canvas-3)",
              color: "var(--fg-1)",
              fontSize: 12,
              border: "1px solid var(--border-default)",
            }}
          >
            Sync now
          </button>
        </div>
      </Card>
    </div>
  );
}

// ---- Local shared bits ----------------------------------------------------

const sectionHeadStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--fg-2)",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  margin: "4px 0 12px",
};

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

function CardHead({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-soft)",
        fontSize: 12.5,
        fontWeight: 500,
        color: "var(--fg-1)",
      }}
    >
      {children}
    </div>
  );
}

function TableHead({ columns, widths }: { columns: readonly string[]; widths: readonly string[] }) {
  return (
    <div
      className="grid items-center gap-3"
      style={{
        gridTemplateColumns: widths.join(" "),
        padding: "8px 14px",
        borderBottom: "1px solid var(--border-default)",
        background: "var(--canvas-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--fg-3)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {columns.map((col) => (
        <span key={col}>{col}</span>
      ))}
    </div>
  );
}

function TagPill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        padding: "2px 7px",
        borderRadius: 3,
        background: "var(--canvas-3)",
        color: "var(--fg-3)",
      }}
    >
      {children}
    </span>
  );
}
