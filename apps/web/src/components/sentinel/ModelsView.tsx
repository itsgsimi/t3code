import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRightLeft, TerminalSquare } from "lucide-react";

import { PageCrumb, PageHeader, Tabs, type TabOption } from "./shared";

/**
 * Models — registry, roles, presets, benchmarks.
 * Data is mocked from config.yaml's model_registry + project memory.
 * Real swap / bench actions are deferred to the API-wiring phase.
 */
export function ModelsView() {
  const [tab, setTab] = useState<TabKey>("roles");

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Models</PageCrumb>
        <PageHeader
          title="Models"
          chip={{
            state: "healthy",
            text: `${ROLES.filter((r) => r.state === "healthy").length} / ${ROLES.length} roles healthy`,
          }}
          subtitle="Swappable model assignments, the registry, and how they've been benching."
        />

        <Tabs value={tab} onChange={(v) => setTab(v as TabKey)} options={TABS} />

        {tab === "roles" ? <RolesTab /> : null}
        {tab === "registry" ? <RegistryTab /> : null}
        {tab === "presets" ? <PresetsTab /> : null}
        {tab === "bench" ? <BenchTab /> : null}
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: "24px 28px 60px",
  maxWidth: 1200,
  margin: "0 auto",
};

type TabKey = "roles" | "registry" | "presets" | "bench";

const TABS: readonly TabOption[] = [
  { key: "roles", label: "Roles", count: 8 },
  { key: "registry", label: "Registry", count: 9 },
  { key: "presets", label: "Presets", count: 5 },
  { key: "bench", label: "Bench", count: 12 },
];

type DotState = "healthy" | "busy" | "degraded" | "down" | "dream" | "unknown";

// ---- Roles tab ------------------------------------------------------------

interface Role {
  role: string;
  registryKey: string;
  port: string;
  context: string;
  state: DotState;
  override: boolean;
}

const ROLES: readonly Role[] = [
  {
    role: "orchestrator",
    registryKey: "qwen3.5-122b-a10b",
    port: ":6969",
    context: "128k",
    state: "healthy",
    override: false,
  },
  {
    role: "worker",
    registryKey: "qwen3.5-35b-a3b",
    port: ":6966",
    context: "64k",
    state: "healthy",
    override: true,
  },
  {
    role: "reflector",
    registryKey: "qwen3.5-27b",
    port: ":6970",
    context: "40k",
    state: "healthy",
    override: false,
  },
  {
    role: "learner",
    registryKey: "qwen3.5-0.8b",
    port: ":6968",
    context: "8k",
    state: "healthy",
    override: false,
  },
  {
    role: "metacognition",
    registryKey: "qwen3.5-0.8b",
    port: ":6968",
    context: "8k",
    state: "healthy",
    override: false,
  },
  {
    role: "deep_thinker",
    registryKey: "qwen3.5-27b",
    port: ":6970",
    context: "40k",
    state: "busy",
    override: false,
  },
  {
    role: "embedder",
    registryKey: "bge-m3",
    port: ":6973",
    context: "8k",
    state: "healthy",
    override: false,
  },
  {
    role: "reranker",
    registryKey: "bge-reranker-v2-m3",
    port: ":6974",
    context: "8k",
    state: "healthy",
    override: false,
  },
];

function RolesTab() {
  return (
    <Card>
      <TableHead columns={["role", "model", "port", "ctx", "override", "action"]} />
      {ROLES.map((r, i) => (
        <div
          key={r.role}
          className="grid items-center gap-3"
          style={{
            gridTemplateColumns: "140px 1fr 80px 60px 100px 120px",
            padding: "10px 14px",
            borderBottom: i === ROLES.length - 1 ? "none" : "1px solid var(--border-soft)",
            fontSize: 12.5,
          }}
        >
          <span style={{ color: "var(--fg-1)" }}>{r.role}</span>
          <span
            className="flex items-center gap-[6px]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}
          >
            <span className={`ds-dot ds-dot--${r.state}`} aria-hidden />
            {r.registryKey}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{r.port}</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{r.context}</span>
          {r.override ? (
            <Pill>override</Pill>
          ) : (
            <span style={{ color: "var(--fg-4)", fontSize: 11 }}>default</span>
          )}
          <SwapButton />
        </div>
      ))}
    </Card>
  );
}

// ---- Registry tab ---------------------------------------------------------

interface RegistryEntry {
  key: string;
  name: string;
  file: string;
  port: string;
  context: string;
  provider: string;
  loaded: boolean;
}

const REGISTRY: readonly RegistryEntry[] = [
  {
    key: "qwen3.5-122b-a10b",
    name: "Qwen 3.5 · 122B-A10B",
    file: "qwen3.5-122b-a10b-Q4_K_M.gguf",
    port: ":6969",
    context: "128k",
    provider: "llama.cpp",
    loaded: true,
  },
  {
    key: "qwen3.5-35b-a3b",
    name: "Qwen 3.5 · 35B-A3B",
    file: "qwen3.5-35b-a3b-Q4_K_M.gguf",
    port: ":6966",
    context: "64k",
    provider: "llama.cpp",
    loaded: true,
  },
  {
    key: "qwen3.5-27b",
    name: "Qwen 3.5 · 27B",
    file: "qwen3.5-27b-Q5_K_M.gguf",
    port: ":6970",
    context: "40k",
    provider: "llama.cpp",
    loaded: true,
  },
  {
    key: "qwen3.5-0.8b",
    name: "Qwen 3.5 · 0.8B",
    file: "qwen3.5-0.8b-Q8_0.gguf",
    port: ":6968",
    context: "8k",
    provider: "llama.cpp",
    loaded: true,
  },
  {
    key: "gemma-4-26b-a4b",
    name: "Gemma 4 · 26B-A4B",
    file: "gemma-4-26b-a4b-Q5_K_M.gguf",
    port: ":6969",
    context: "128k",
    provider: "llama.cpp",
    loaded: false,
  },
  {
    key: "gemma-4-31b",
    name: "Gemma 4 · 31B",
    file: "gemma-4-31b-Q4_K_M.gguf",
    port: ":6969",
    context: "64k",
    provider: "llama.cpp",
    loaded: false,
  },
  {
    key: "beardy",
    name: "Beardy (fine-tune)",
    file: "beardy-sft-v3.gguf",
    port: ":6969",
    context: "64k",
    provider: "llama.cpp",
    loaded: false,
  },
  {
    key: "bge-m3",
    name: "BGE M3 (embedder)",
    file: "bge-m3-Q8_0.gguf",
    port: ":6973",
    context: "8k",
    provider: "llama.cpp",
    loaded: true,
  },
  {
    key: "bge-reranker-v2-m3",
    name: "BGE Reranker v2-M3",
    file: "bge-reranker-v2-m3-Q8_0.gguf",
    port: ":6974",
    context: "512",
    provider: "llama.cpp",
    loaded: true,
  },
];

function RegistryTab() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 12,
      }}
    >
      {REGISTRY.map((m) => (
        <div
          key={m.key}
          style={{
            background: "var(--canvas-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className={`ds-dot ds-dot--${m.loaded ? "healthy" : "unknown"}`} aria-hidden />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-1)" }}>
              {m.key}
            </span>
            {m.loaded ? <Pill>loaded</Pill> : null}
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 4 }}>{m.name}</div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              marginBottom: 10,
              wordBreak: "break-all",
            }}
          >
            {m.file}
          </div>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr",
              fontSize: 11,
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>{m.port}</span>
            <span>{m.context}</span>
            <span>{m.provider}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Presets tab ----------------------------------------------------------

const PRESETS = [
  { key: "qwen3.5-122b", role: "orchestrator", target: "qwen3.5-122b-a10b" },
  { key: "qwen3.5-35b", role: "orchestrator", target: "qwen3.5-35b-a3b" },
  { key: "qwen3.5-27b", role: "orchestrator", target: "qwen3.5-27b" },
  { key: "gemma-4-26b", role: "orchestrator", target: "gemma-4-26b-a4b" },
  { key: "gemma-4-31b", role: "orchestrator", target: "gemma-4-31b" },
] as const;

function PresetsTab() {
  return (
    <Card>
      {PRESETS.map((p, i) => (
        <div
          key={p.key}
          className="flex items-center gap-4"
          style={{
            padding: "12px 14px",
            borderBottom: i === PRESETS.length - 1 ? "none" : "1px solid var(--border-soft)",
          }}
        >
          <span
            className="flex items-center gap-2"
            style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)", fontSize: 13 }}
          >
            <TerminalSquare size={14} style={{ color: "var(--fg-3)" }} />
            sentinel swap {p.key}
          </span>
          <span style={{ flex: 1, fontSize: 12, color: "var(--fg-3)" }}>
            {p.role} → <span style={{ color: "var(--fg-2)" }}>{p.target}</span>
          </span>
          <button
            type="button"
            className="cursor-pointer border-0"
            style={{
              padding: "5px 12px",
              borderRadius: 5,
              background: "var(--canvas-3)",
              color: "var(--fg-1)",
              fontSize: 12,
              border: "1px solid var(--border-default)",
            }}
          >
            Apply
          </button>
        </div>
      ))}
    </Card>
  );
}

// ---- Bench tab ------------------------------------------------------------

interface BenchRun {
  run: string;
  model: string;
  passes: number;
  tg: string;
  pp: string;
  delta: string;
  deltaState: "healthy" | "degraded" | "unknown";
  label: string;
}

const BENCH_RUNS: readonly BenchRun[] = [
  {
    run: "2026-04-17 18:14",
    model: "qwen3.5-122b-a10b",
    passes: 5,
    tg: "38.2",
    pp: "612",
    delta: "+4.5%",
    deltaState: "healthy",
    label: "rocm-nightlies",
  },
  {
    run: "2026-04-17 18:02",
    model: "qwen3.5-35b-a3b",
    passes: 5,
    tg: "74.1",
    pp: "1312",
    delta: "+0.4%",
    deltaState: "healthy",
    label: "rocm-nightlies",
  },
  {
    run: "2026-04-16 11:40",
    model: "qwen3.5-122b-a10b",
    passes: 5,
    tg: "36.4",
    pp: "530",
    delta: "baseline",
    deltaState: "unknown",
    label: "rocm-7.2",
  },
  {
    run: "2026-04-15 09:12",
    model: "gemma-4-26b-a4b",
    passes: 3,
    tg: "48.7",
    pp: "811",
    delta: "+0.0%",
    deltaState: "healthy",
    label: "smoke",
  },
  {
    run: "2026-04-14 20:07",
    model: "qwen3.5-122b-a10b",
    passes: 5,
    tg: "34.1",
    pp: "498",
    delta: "-6.1%",
    deltaState: "degraded",
    label: "uma-enabled (reverted)",
  },
];

function BenchTab() {
  return (
    <Card>
      <TableHead
        columns={["run", "model", "passes", "TG tok/s", "PP tok/s", "Δ vs prev", "label"]}
      />
      {BENCH_RUNS.map((b, i) => (
        <div
          key={b.run}
          className="grid items-center gap-3"
          style={{
            gridTemplateColumns: "140px 1.2fr 70px 90px 90px 110px 1fr",
            padding: "10px 14px",
            borderBottom: i === BENCH_RUNS.length - 1 ? "none" : "1px solid var(--border-soft)",
            fontSize: 12.5,
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
            {b.run}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{b.model}</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{b.passes}</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{b.tg}</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{b.pp}</span>
          <span className="flex items-center gap-[6px]">
            <span className={`ds-dot ds-dot--${b.deltaState}`} aria-hidden />
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{b.delta}</span>
          </span>
          <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{b.label}</span>
        </div>
      ))}
    </Card>
  );
}

// ---- Shared local bits ----------------------------------------------------

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

function TableHead({ columns }: { columns: readonly string[] }) {
  return (
    <div
      className="grid items-center gap-3"
      style={{
        gridTemplateColumns: columns.map(() => "1fr").join(" "),
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

function Pill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        padding: "2px 7px",
        borderRadius: 3,
        background: "var(--state-healthy-bg)",
        color: "var(--state-healthy-fg)",
      }}
    >
      {children}
    </span>
  );
}

function SwapButton() {
  return (
    <button
      type="button"
      className="flex cursor-pointer items-center gap-[6px] border-0"
      style={{
        padding: "5px 10px",
        borderRadius: 5,
        background: "var(--canvas-3)",
        color: "var(--fg-2)",
        border: "1px solid var(--border-soft)",
        fontSize: 12,
      }}
    >
      <ArrowRightLeft size={12} />
      Swap
    </button>
  );
}
