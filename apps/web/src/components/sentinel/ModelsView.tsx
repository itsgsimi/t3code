import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRightLeft, Loader2, TerminalSquare } from "lucide-react";

import {
  useApplyPreset,
  useSentinelBenchRuns,
  useSentinelModelSwap,
  useSentinelModelsPresets,
  useSentinelModelsRegistry,
  useSentinelModelsRoles,
} from "../../sentinel/hooks";
import type { SentinelRole } from "../../sentinel/api";
import { PageCrumb, PageHeader, Tabs, type TabOption } from "./shared";

/**
 * Models — registry, roles, presets, benchmarks. All live from the backend:
 *  /v1/models/registry, /v1/models/roles, /v1/models/presets, /v1/bench/runs.
 * Actions POST to /v1/admin/model-swap, /v1/models/presets/apply, /v1/bench/run.
 */
export function ModelsView() {
  const [tab, setTab] = useState<TabKey>("roles");
  const roles = useSentinelModelsRoles();
  const registry = useSentinelModelsRegistry();
  const presets = useSentinelModelsPresets();
  const bench = useSentinelBenchRuns(30);

  const roleList = roles.data?.roles ?? [];
  const registryEntries = registry.data?.models ? Object.entries(registry.data.models) : [];
  const presetEntries = presets.data?.presets ? Object.entries(presets.data.presets) : [];
  const benchRuns = bench.data?.runs ?? [];

  const healthyRoles = roleList.filter((r) => r.registry_key).length;

  return (
    <div className="overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Models</PageCrumb>
        <PageHeader
          title="Models"
          chip={{
            state:
              roleList.length === 0
                ? "unknown"
                : healthyRoles === roleList.length
                  ? "healthy"
                  : "degraded",
            text:
              roleList.length === 0
                ? roles.isError
                  ? "API offline"
                  : "loading…"
                : `${healthyRoles} / ${roleList.length} roles assigned`,
          }}
          subtitle="Swappable model assignments, the registry, and how they've been benching."
        />

        <Tabs
          value={tab}
          onChange={(v) => setTab(v as TabKey)}
          options={
            [
              { key: "roles", label: "Roles", count: roleList.length },
              { key: "registry", label: "Registry", count: registryEntries.length },
              { key: "presets", label: "Presets", count: presetEntries.length },
              { key: "bench", label: "Bench", count: benchRuns.length },
            ] satisfies TabOption[]
          }
        />

        {tab === "roles" ? (
          <RolesTab roles={roleList} registry={registry.data?.models ?? {}} />
        ) : null}
        {tab === "registry" ? <RegistryTab entries={registryEntries} /> : null}
        {tab === "presets" ? <PresetsTab entries={presetEntries} /> : null}
        {tab === "bench" ? <BenchTab runs={benchRuns} /> : null}
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

// ---- Roles tab ------------------------------------------------------------

function RolesTab({
  roles,
  registry,
}: {
  roles: readonly SentinelRole[];
  registry: Record<string, { name?: string; port?: number; context_length?: number }>;
}) {
  if (roles.length === 0) {
    return <EmptyCard>Loading role assignments from /v1/models/roles…</EmptyCard>;
  }
  return (
    <Card>
      <TableHead columns={["role", "model", "port", "ctx", "override", "action"]} />
      {roles.map((r, i) => (
        <RoleRow key={r.role} role={r} last={i === roles.length - 1} registry={registry} />
      ))}
    </Card>
  );
}

function RoleRow({
  role,
  registry,
  last,
}: {
  role: SentinelRole;
  registry: Record<string, { name?: string; port?: number; context_length?: number }>;
  last: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(role.registry_key ?? "");
  const swap = useSentinelModelSwap();
  const ctx = role.context_length ? `${Math.round(role.context_length / 1000)}k` : "—";
  const port = role.port ? `:${role.port}` : "—";

  async function apply() {
    if (!target || target === role.registry_key) {
      setEditing(false);
      return;
    }
    try {
      await swap.mutateAsync({ role: role.role, registryKey: target });
      setEditing(false);
    } catch {
      // error shown inline via mutation state
    }
  }

  return (
    <div
      className="grid items-center gap-3"
      style={{
        gridTemplateColumns: "140px 1fr 80px 60px 100px 220px",
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontSize: 12.5,
      }}
    >
      <span style={{ color: "var(--fg-1)" }}>{role.role}</span>
      <span
        className="flex items-center gap-[6px]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}
      >
        <span
          className={`ds-dot ds-dot--${role.registry_key ? "healthy" : "unknown"}`}
          aria-hidden
        />
        {role.registry_key ?? <em style={{ color: "var(--fg-4)" }}>unassigned</em>}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{port}</span>
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{ctx}</span>
      {role.overridden ? (
        <Pill state="healthy">override</Pill>
      ) : (
        <span style={{ color: "var(--fg-4)", fontSize: 11 }}>default</span>
      )}
      {editing ? (
        <div className="flex items-center gap-1">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={swap.isPending}
            style={{
              flex: 1,
              padding: "4px 6px",
              borderRadius: 4,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-default)",
              color: "var(--fg-1)",
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              minWidth: 0,
            }}
          >
            <option value="">— pick model —</option>
            {Object.keys(registry).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <ActionButton onClick={() => void apply()} disabled={swap.isPending || !target} primary>
            {swap.isPending ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
          </ActionButton>
          <ActionButton onClick={() => setEditing(false)} disabled={swap.isPending}>
            ×
          </ActionButton>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <ActionButton onClick={() => setEditing(true)}>
            <ArrowRightLeft size={12} /> Swap
          </ActionButton>
          {swap.isError ? (
            <span
              style={{
                fontSize: 10.5,
                color: "var(--state-down-fg)",
                fontFamily: "var(--font-mono)",
              }}
              title={(swap.error as Error).message}
            >
              failed — hover
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ---- Registry tab ---------------------------------------------------------

function RegistryTab({ entries }: { entries: ReadonlyArray<[string, Record<string, unknown>]> }) {
  if (entries.length === 0) {
    return <EmptyCard>Loading model registry…</EmptyCard>;
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 12,
      }}
    >
      {entries.map(([key, entry]) => (
        <RegistryCard key={key} registryKey={key} entry={entry} />
      ))}
    </div>
  );
}

function RegistryCard({
  registryKey,
  entry,
}: {
  registryKey: string;
  entry: Record<string, unknown>;
}) {
  const name = typeof entry.name === "string" ? entry.name : registryKey;
  const file = typeof entry.file === "string" ? entry.file : "—";
  const port = typeof entry.port === "number" ? `:${entry.port}` : "—";
  const ctx =
    typeof entry.context_length === "number" ? `${Math.round(entry.context_length / 1000)}k` : "—";
  const provider = typeof entry.provider === "string" ? entry.provider : "—";
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-1)" }}>
          {registryKey}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 4 }}>{name}</div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-3)",
          marginBottom: 10,
          wordBreak: "break-all",
        }}
      >
        {file}
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
        <span>{port}</span>
        <span>{ctx}</span>
        <span>{provider}</span>
      </div>
    </div>
  );
}

// ---- Presets tab ----------------------------------------------------------

function PresetsTab({ entries }: { entries: ReadonlyArray<[string, Record<string, string>]> }) {
  if (entries.length === 0) {
    return <EmptyCard>Loading presets…</EmptyCard>;
  }
  return (
    <Card>
      {entries.map(([presetName, assignments], i) => (
        <PresetRow
          key={presetName}
          presetName={presetName}
          assignments={assignments}
          last={i === entries.length - 1}
        />
      ))}
    </Card>
  );
}

function PresetRow({
  presetName,
  assignments,
  last,
}: {
  presetName: string;
  assignments: Record<string, string>;
  last: boolean;
}) {
  const apply = useApplyPreset();
  const label = Object.entries(assignments)
    .map(([role, model]) => `${role} → ${model}`)
    .join(" · ");
  return (
    <div
      className="flex items-center gap-4"
      style={{
        padding: "12px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
      }}
    >
      <span
        className="flex items-center gap-2"
        style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)", fontSize: 13 }}
      >
        <TerminalSquare size={14} style={{ color: "var(--fg-3)" }} />
        sentinel swap {presetName}
      </span>
      <span style={{ flex: 1, fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
        {label || "—"}
      </span>
      {apply.isError ? (
        <span
          style={{ fontSize: 10.5, color: "var(--state-down-fg)", fontFamily: "var(--font-mono)" }}
          title={(apply.error as Error).message}
        >
          failed — hover
        </span>
      ) : null}
      <ActionButton onClick={() => apply.mutate(presetName)} disabled={apply.isPending} primary>
        {apply.isPending ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
      </ActionButton>
    </div>
  );
}

// ---- Bench tab ------------------------------------------------------------

function BenchTab({
  runs,
}: {
  runs: ReadonlyArray<{
    run_id?: string;
    label?: string;
    model_file?: string;
    port?: number;
    passes: number;
    tg_tok_s_mean?: number;
    pp_tok_s_mean?: number;
    mtime: string;
    file: string;
  }>;
}) {
  if (runs.length === 0) {
    return (
      <EmptyCard>
        No benchmark runs found in{" "}
        <span style={{ fontFamily: "var(--font-mono)" }}>benchmarks/results/inference/</span>.
      </EmptyCard>
    );
  }
  return (
    <Card>
      <TableHead
        columns={["when", "label", "model file", "passes", "TG mean", "PP mean"]}
        widths={["170px", "1.1fr", "1.4fr", "70px", "100px", "100px"]}
      />
      {runs.map((b, i) => (
        <div
          key={b.file}
          className="grid items-center gap-3"
          style={{
            gridTemplateColumns: "170px 1.1fr 1.4fr 70px 100px 100px",
            padding: "10px 14px",
            borderBottom: i === runs.length - 1 ? "none" : "1px solid var(--border-soft)",
            fontSize: 12.5,
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
            {formatMtime(b.mtime)}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>
            {b.label ?? "—"}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--fg-2)",
              fontSize: 11,
              wordBreak: "break-all",
            }}
          >
            {b.model_file ?? "—"}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{b.passes}</span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>
            {b.tg_tok_s_mean ?? "—"}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>
            {b.pp_tok_s_mean ?? "—"}
          </span>
        </div>
      ))}
    </Card>
  );
}

function formatMtime(iso: string): string {
  try {
    const d = new Date(iso);
    return d
      .toISOString()
      .replace("T", " ")
      .replace(/:\d{2}\.\d+Z/, "Z");
  } catch {
    return iso;
  }
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

function TableHead({
  columns,
  widths,
}: {
  columns: readonly string[];
  widths?: readonly string[];
}) {
  return (
    <div
      className="grid items-center gap-3"
      style={{
        gridTemplateColumns: widths ? widths.join(" ") : columns.map(() => "1fr").join(" "),
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

function Pill({
  children,
  state = "healthy",
}: {
  children: ReactNode;
  state?: "healthy" | "busy" | "degraded" | "down";
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        padding: "2px 7px",
        borderRadius: 3,
        background: `var(--state-${state}-bg)`,
        color: `var(--state-${state}-fg)`,
      }}
    >
      {children}
    </span>
  );
}

function ActionButton({
  onClick,
  disabled,
  primary,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex cursor-pointer items-center gap-[6px] border-0"
      style={{
        padding: "5px 10px",
        borderRadius: 5,
        background: primary
          ? disabled
            ? "var(--canvas-3)"
            : "var(--ember-400)"
          : "var(--canvas-3)",
        color: primary ? (disabled ? "var(--fg-4)" : "var(--fg-on-accent)") : "var(--fg-2)",
        border: primary ? "0" : "1px solid var(--border-soft)",
        fontSize: 12,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
