import { useState, type ReactNode } from "react";
import { Check, Lock, Pencil, X } from "lucide-react";

import {
  Accordion,
  KV,
  NumberInput,
  RestartNote,
  SecondaryButton,
  SectionCard,
  SelectField,
  TextInput,
  TriBool,
} from "./configPrimitives";
import type { SectionState } from "./configState";

export interface MemoryValues {
  backend: string;
  reranker: string;
  neo4j: { uri: string; user: string; password: string };
  llm: { base_url: string; model: string };
  embedder: { base_url: string; model: string; dim: number | null };
  shim: { enabled: boolean | null; port: number | null; timeout_seconds: number | null };
  auto_recall: {
    enabled: boolean | null;
    max_results: number | null;
    max_tokens: number | null;
    search_config: string;
  };
  dream: {
    trigger: string;
    session_gap_minutes: number | null;
    cron_schedule: string;
    cron_timezone: string;
    model: string;
    merge_redundant: boolean | null;
    resolve_contradictions: boolean | null;
    build_communities: boolean | null;
    prune_noise: boolean | null;
    restore_model: boolean | null;
    prune: {
      min_age_days: number | null;
      decay_threshold: number | null;
      max_candidates: number | null;
    };
    discord: {
      enabled: boolean | null;
      report_channel_id: number | null;
      webhook_url?: string | null;
    };
  };
  impulse: {
    enabled: boolean | null;
    max_per_query: number | null;
    cooldown_hours: number | null;
    score_threshold: number | null;
    dream_nudges: boolean | null;
  };
}

export type MemorySheetKind =
  | { kind: "memory.dream.prune"; node: MemoryValues["dream"]["prune"] }
  | { kind: "memory.dream.discord"; node: MemoryValues["dream"]["discord"] };

export function ConfigSectionMemory({
  state,
  setState,
  openSheet,
}: {
  state: SectionState<MemoryValues>;
  setState: (updater: (s: SectionState<MemoryValues>) => SectionState<MemoryValues>) => void;
  openSheet: (s: MemorySheetKind) => void;
}) {
  const v = state.values;
  const d = (key: string) => !!state.dirty[key];

  const set = (path: readonly (string | number)[], val: unknown) => {
    setState((s) => {
      const vals = structuredClone(s.values) as unknown as Record<string, unknown>;
      let node: Record<string, unknown> = vals;
      for (let i = 0; i < path.length - 1; i++) {
        node = node[path[i] as string] as Record<string, unknown>;
      }
      node[path[path.length - 1] as string] = val;
      return {
        ...s,
        values: vals as unknown as MemoryValues,
        dirty: { ...s.dirty, [path.join(".")]: true },
      };
    });
  };

  const [open, setOpen] = useState({
    neo4j: true,
    llm: false,
    embedder: false,
    shim: false,
    auto_recall: false,
    dream: true,
    impulse: false,
  });
  const toggle = (k: keyof typeof open) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  return (
    <div>
      <SectionCard title="Backend" subtitle="memory.backend · memory.reranker">
        <KV label="backend" hint="Only 'graphiti' is supported today." changed={d("backend")}>
          <SelectField
            value={v.backend}
            onChange={(x) => set(["backend"], x)}
            options={[{ value: "graphiti", label: "graphiti" }]}
          />
        </KV>
        <KV
          label="reranker"
          hint={`"none" keeps Graphiti's default scoring; enable to layer bge re-ranking.`}
          changed={d("reranker")}
        >
          <SelectField
            value={v.reranker}
            onChange={(x) => set(["reranker"], x)}
            options={[
              { value: "none", label: "none" },
              { value: "bge", label: "bge" },
            ]}
          />
        </KV>
      </SectionCard>

      <Accordion
        title="neo4j"
        subtitle="Graph database"
        open={open.neo4j}
        onToggle={() => toggle("neo4j")}
        count={3}
      >
        <KV label="uri" changed={d("neo4j.uri")}>
          <TextInput mono value={v.neo4j.uri} onChange={(x) => set(["neo4j", "uri"], x)} />
        </KV>
        <KV label="user" changed={d("neo4j.user")}>
          <TextInput mono value={v.neo4j.user} onChange={(x) => set(["neo4j", "user"], x)} />
        </KV>
        <KV
          label="password"
          hint="Stored in plaintext today. Move to an env var — click to bind."
          changed={d("neo4j.password")}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <TextInput
              mono
              value={v.neo4j.password}
              onChange={(x) => set(["neo4j", "password"], x)}
            />
            <SecondaryButton onClick={() => undefined} Icon={Lock}>
              Bind env
            </SecondaryButton>
          </div>
        </KV>
      </Accordion>

      <Accordion
        title="llm"
        subtitle="Graphiti entity-extraction model"
        open={open.llm}
        onToggle={() => toggle("llm")}
        count={2}
      >
        <KV label="base_url" changed={d("llm.base_url")}>
          <TextInput mono value={v.llm.base_url} onChange={(x) => set(["llm", "base_url"], x)} />
        </KV>
        <KV label="model" changed={d("llm.model")}>
          <TextInput mono value={v.llm.model} onChange={(x) => set(["llm", "model"], x)} />
        </KV>
      </Accordion>

      <Accordion
        title="embedder"
        subtitle="Vector-search backend"
        open={open.embedder}
        onToggle={() => toggle("embedder")}
        count={3}
      >
        <KV label="base_url" changed={d("embedder.base_url")}>
          <TextInput
            mono
            value={v.embedder.base_url}
            onChange={(x) => set(["embedder", "base_url"], x)}
          />
        </KV>
        <KV label="model" changed={d("embedder.model")}>
          <TextInput
            mono
            value={v.embedder.model}
            onChange={(x) => set(["embedder", "model"], x)}
          />
        </KV>
        <KV label="dim" changed={d("embedder.dim")}>
          <NumberInput value={v.embedder.dim} onChange={(x) => set(["embedder", "dim"], x)} />
        </KV>
      </Accordion>

      <Accordion
        title="shim"
        subtitle="Local HTTP proxy that wraps llama-server replies so Graphiti gets valid JSON even when models ignore schema"
        open={open.shim}
        onToggle={() => toggle("shim")}
        count={3}
        disabled={v.shim.enabled === false}
        onToggleEnable={() => set(["shim", "enabled"], !v.shim.enabled)}
      >
        <KV label="enabled" changed={d("shim.enabled")}>
          <TriBool value={v.shim.enabled} onChange={(x) => set(["shim", "enabled"], x)} />
        </KV>
        <KV label="port" changed={d("shim.port")}>
          <NumberInput
            value={v.shim.port}
            onChange={(x) => set(["shim", "port"], x)}
            disabled={v.shim.enabled === false}
          />
        </KV>
        <KV label="timeout_seconds" changed={d("shim.timeout_seconds")}>
          <NumberInput
            value={v.shim.timeout_seconds}
            step={0.1}
            onChange={(x) => set(["shim", "timeout_seconds"], x)}
            disabled={v.shim.enabled === false}
          />
        </KV>
      </Accordion>

      <Accordion
        title="auto_recall"
        subtitle="Before each query, search Graphiti and paste the top-k relevant memories into the agent's context"
        open={open.auto_recall}
        onToggle={() => toggle("auto_recall")}
        count={4}
        disabled={v.auto_recall.enabled === false}
        onToggleEnable={() => set(["auto_recall", "enabled"], !v.auto_recall.enabled)}
      >
        <KV label="enabled" changed={d("auto_recall.enabled")}>
          <TriBool
            value={v.auto_recall.enabled}
            onChange={(x) => set(["auto_recall", "enabled"], x)}
          />
        </KV>
        <KV label="max_results" changed={d("auto_recall.max_results")}>
          <NumberInput
            value={v.auto_recall.max_results}
            onChange={(x) => set(["auto_recall", "max_results"], x)}
          />
        </KV>
        <KV label="max_tokens" changed={d("auto_recall.max_tokens")}>
          <NumberInput
            value={v.auto_recall.max_tokens}
            onChange={(x) => set(["auto_recall", "max_tokens"], x)}
          />
        </KV>
        <KV label="search_config" changed={d("auto_recall.search_config")}>
          <SelectField
            value={v.auto_recall.search_config}
            onChange={(x) => set(["auto_recall", "search_config"], x)}
            options={["hybrid_rrf", "bm25", "vector"]}
          />
        </KV>
      </Accordion>

      <Accordion
        title="dream"
        subtitle={`Nightly consolidation · dream role: ${v.dream.model}`}
        open={open.dream}
        onToggle={() => toggle("dream")}
        count={10}
        accent
      >
        <KV label="trigger" changed={d("dream.trigger")}>
          <SelectField
            value={v.dream.trigger}
            onChange={(x) => set(["dream", "trigger"], x)}
            options={["session_gap", "cron", "manual"]}
          />
        </KV>
        <KV
          label="session_gap_minutes"
          hint="Minutes of idle before a dream kicks off."
          changed={d("dream.session_gap_minutes")}
        >
          <NumberInput
            value={v.dream.session_gap_minutes}
            onChange={(x) => set(["dream", "session_gap_minutes"], x)}
          />
        </KV>
        <KV label="cron_schedule" changed={d("dream.cron_schedule")}>
          <TextInput
            mono
            value={v.dream.cron_schedule}
            onChange={(x) => set(["dream", "cron_schedule"], x)}
          />
        </KV>
        <KV label="cron_timezone" changed={d("dream.cron_timezone")}>
          <TextInput
            mono
            value={v.dream.cron_timezone}
            onChange={(x) => set(["dream", "cron_timezone"], x)}
          />
        </KV>
        <KV label="model" changed={d("dream.model")}>
          <TextInput
            mono
            value={v.dream.model}
            onChange={(x) => set(["dream", "model"], x)}
          />
        </KV>
        <KV label="phases" hint="Toggle which phases run during consolidation.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PHASES.map(([k, l]) => (
              <PhaseToggle
                key={k}
                label={l}
                active={!!v.dream[k]}
                dirty={d(`dream.${k}`)}
                onToggle={() => set(["dream", k], !v.dream[k])}
              />
            ))}
          </div>
        </KV>

        <div
          style={{
            marginTop: 10,
            borderTop: "1px dashed var(--border-soft)",
            paddingTop: 10,
          }}
        >
          <NestedRow
            title="dream.prune"
            subtitle={`${v.dream.prune.min_age_days}d age · decay > ${v.dream.prune.decay_threshold} · ≤ ${v.dream.prune.max_candidates} candidates / run`}
            onEdit={() =>
              openSheet({ kind: "memory.dream.prune", node: v.dream.prune })
            }
          />
          <NestedRow
            title="dream.discord"
            subtitle={
              v.dream.discord.enabled
                ? `channel ${v.dream.discord.report_channel_id ?? "—"}`
                : "disabled"
            }
            state={v.dream.discord.enabled ? "healthy" : "unknown"}
            onEdit={() =>
              openSheet({ kind: "memory.dream.discord", node: v.dream.discord })
            }
          />
        </div>
      </Accordion>

      <Accordion
        title="impulse"
        subtitle="When dream discovers a relevant insight, surface it as a one-line nudge inside the next chat"
        open={open.impulse}
        onToggle={() => toggle("impulse")}
        count={5}
        disabled={v.impulse.enabled === false}
        onToggleEnable={() => set(["impulse", "enabled"], !v.impulse.enabled)}
        enableLabel="impulse"
      >
        <KV label="enabled" changed={d("impulse.enabled")}>
          <TriBool
            value={v.impulse.enabled}
            onChange={(x) => set(["impulse", "enabled"], x)}
          />
        </KV>
        <KV label="max_per_query" changed={d("impulse.max_per_query")}>
          <NumberInput
            value={v.impulse.max_per_query}
            onChange={(x) => set(["impulse", "max_per_query"], x)}
            disabled={v.impulse.enabled === false}
          />
        </KV>
        <KV label="cooldown_hours" changed={d("impulse.cooldown_hours")}>
          <NumberInput
            value={v.impulse.cooldown_hours}
            onChange={(x) => set(["impulse", "cooldown_hours"], x)}
            disabled={v.impulse.enabled === false}
          />
        </KV>
        <KV label="score_threshold" changed={d("impulse.score_threshold")}>
          <NumberInput
            value={v.impulse.score_threshold}
            step={0.05}
            onChange={(x) => set(["impulse", "score_threshold"], x)}
            disabled={v.impulse.enabled === false}
          />
        </KV>
        <KV label="dream_nudges" changed={d("impulse.dream_nudges")}>
          <TriBool
            value={v.impulse.dream_nudges}
            onChange={(x) => set(["impulse", "dream_nudges"], x)}
            disabled={v.impulse.enabled === false}
          />
        </KV>
      </Accordion>

      <RestartNote services={["api", "graphiti-mcp"]} />
    </div>
  );
}

const PHASES: readonly [keyof MemoryValues["dream"] & string, string][] = [
  ["merge_redundant", "merge redundant"],
  ["resolve_contradictions", "resolve contradictions"],
  ["build_communities", "build communities"],
  ["prune_noise", "prune noise"],
  ["restore_model", "restore model"],
];

function PhaseToggle({
  label,
  active,
  onToggle,
  dirty,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  dirty: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 3,
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        background: active ? "var(--state-healthy-bg)" : "var(--canvas-3)",
        color: active ? "var(--state-healthy-fg)" : "var(--fg-4)",
        border: `1px solid ${active ? "var(--state-healthy)" : "var(--border-soft)"}`,
        cursor: "pointer",
      }}
    >
      {active ? <Check size={10} /> : <X size={10} />}
      {label}
      {dirty ? (
        <span
          style={{ width: 4, height: 4, borderRadius: 999, background: "var(--ember-400)" }}
        />
      ) : null}
    </button>
  );
}

function NestedRow({
  title,
  subtitle,
  state,
  onEdit,
}: {
  title: string;
  subtitle: ReactNode;
  state?: "healthy" | "unknown" | undefined;
  onEdit: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 10px",
        background: "var(--canvas-2)",
        borderRadius: 5,
        marginBottom: 6,
      }}
    >
      {state ? (
        <span className={`ds-dot ds-dot--${state}`} aria-hidden />
      ) : null}
      <div style={{ minWidth: 0 }}>
        <div
          style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-1)" }}
        >
          {title}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1 }} />
      <SecondaryButton onClick={onEdit} Icon={Pencil}>
        Edit
      </SecondaryButton>
    </div>
  );
}
