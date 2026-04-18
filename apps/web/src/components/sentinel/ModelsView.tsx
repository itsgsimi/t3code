import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRightLeft, Loader2, Pencil, Plus, TerminalSquare, Trash2 } from "lucide-react";

import {
  useApplyPreset,
  useDeleteRegistryEntry,
  useSentinelBenchRuns,
  useSentinelModelSwap,
  useSentinelModelsLoaded,
  useSentinelModelsPresets,
  useSentinelModelsRegistry,
  useSentinelModelsRoles,
} from "../../sentinel/hooks";
import type { SentinelLoadedRole, SentinelRole } from "../../sentinel/api";
import { ModelEditor } from "./ModelEditor";
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
  const loaded = useSentinelModelsLoaded();
  const bench = useSentinelBenchRuns(30);

  const roleList = roles.data?.roles ?? [];
  const registryEntries = registry.data?.models ? Object.entries(registry.data.models) : [];
  const presetEntries = presets.data?.presets ? Object.entries(presets.data.presets) : [];
  const benchRuns = bench.data?.runs ?? [];
  const loadedByRole = new Map<string, SentinelLoadedRole>(
    (loaded.data?.roles ?? []).map((r) => [r.role, r]),
  );

  const healthyRoles = roleList.filter((r) => r.registry_key).length;
  const drift = (loaded.data?.roles ?? []).filter((r) => r.port && (!r.healthy || isDrifted(r)));

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
          <>
            {drift.length > 0 ? <DriftBanner drift={drift} /> : null}
            <RolesTab
              roles={roleList}
              registry={registry.data?.models ?? {}}
              loadedByRole={loadedByRole}
            />
          </>
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

function isDrifted(r: SentinelLoadedRole): boolean {
  if (!r.configured_model_file || !r.loaded_model) return false;
  const cfgFile = r.configured_model_file.split("/").pop()?.toLowerCase() ?? "";
  const loaded = r.loaded_model.toLowerCase();
  return cfgFile !== loaded;
}

function DriftBanner({ drift }: { drift: readonly SentinelLoadedRole[] }) {
  return (
    <div
      className="mb-3 flex items-start gap-2"
      style={{
        background: "var(--state-degraded-bg)",
        border: "1px solid var(--state-degraded-bg)",
        color: "var(--state-degraded-fg)",
        borderRadius: 6,
        padding: "10px 14px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      <span className="ds-dot ds-dot--degraded" style={{ marginTop: 5 }} aria-hidden />
      <div>
        <div style={{ color: "var(--state-degraded-fg)", fontWeight: 500 }}>
          {drift.length} role{drift.length === 1 ? "" : "s"} {drift.length === 1 ? "shows" : "show"}{" "}
          runtime drift.
        </div>
        <div style={{ color: "var(--fg-3)", marginTop: 2 }}>
          The llama-server on that port is either down, or running a different model than{" "}
          <span style={{ color: "var(--fg-1)" }}>config.yaml</span> declares.
        </div>
      </div>
    </div>
  );
}

function RolesTab({
  roles,
  registry,
  loadedByRole,
}: {
  roles: readonly SentinelRole[];
  registry: Record<string, { name?: string; port?: number; context_length?: number }>;
  loadedByRole: Map<string, SentinelLoadedRole>;
}) {
  if (roles.length === 0) {
    return <EmptyCard>Loading role assignments from /v1/models/roles…</EmptyCard>;
  }
  return (
    <Card>
      <TableHead
        columns={["role", "configured model", "port", "ctx", "loaded (live)", "action"]}
        widths={["130px", "1.3fr", "70px", "60px", "1.1fr", "170px"]}
      />
      {roles.map((r, i) => (
        <RoleRow
          key={r.role}
          role={r}
          last={i === roles.length - 1}
          registry={registry}
          loaded={loadedByRole.get(r.role)}
        />
      ))}
    </Card>
  );
}

function RoleRow({
  role,
  registry,
  loaded,
  last,
}: {
  role: SentinelRole;
  registry: Record<string, { name?: string; port?: number; context_length?: number }>;
  loaded: SentinelLoadedRole | undefined;
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

  const loadedCell = (() => {
    if (!loaded) return { state: "unknown" as const, label: "—" };
    if (!loaded.port) return { state: "unknown" as const, label: "no port" };
    if (!loaded.healthy) return { state: "down" as const, label: "port down" };
    if (loaded.loaded_model) {
      const drift = isDrifted(loaded);
      return {
        state: drift ? ("degraded" as const) : ("healthy" as const),
        label: loaded.loaded_model,
      };
    }
    return { state: "busy" as const, label: "up · unknown model" };
  })();

  return (
    <div
      className="grid items-center gap-3"
      style={{
        gridTemplateColumns: "130px 1.3fr 70px 60px 1.1fr 170px",
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontSize: 12.5,
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span style={{ color: "var(--fg-1)" }}>{role.role}</span>
        {role.overridden ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--state-healthy-fg)",
            }}
          >
            override
          </span>
        ) : null}
      </div>
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
      <span
        className="flex items-center gap-[6px]"
        style={{
          fontFamily: "var(--font-mono)",
          color:
            loadedCell.state === "down"
              ? "var(--state-down-fg)"
              : loadedCell.state === "degraded"
                ? "var(--state-degraded-fg)"
                : loadedCell.state === "healthy"
                  ? "var(--fg-1)"
                  : "var(--fg-4)",
          wordBreak: "break-all",
        }}
        title={
          loaded?.detail
            ? `${loaded.detail}`
            : isDrifted(loaded ?? ({} as SentinelLoadedRole))
              ? `drift: configured ${loaded?.configured_model_file}`
              : undefined
        }
      >
        <span className={`ds-dot ds-dot--${loadedCell.state}`} aria-hidden />
        {loadedCell.label}
      </span>
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

type EditorState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; key: string; entry: Record<string, unknown> };

function RegistryTab({ entries }: { entries: ReadonlyArray<[string, Record<string, unknown>]> }) {
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
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
          Registry
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          config.yaml · model_registry
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setEditor({ mode: "add" })}
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
          Add model
        </button>
      </div>

      {entries.length === 0 ? (
        <EmptyCard>Loading model registry…</EmptyCard>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {entries.map(([key, entry]) => (
            <RegistryCard
              key={key}
              registryKey={key}
              entry={entry}
              onEdit={() => setEditor({ mode: "edit", key, entry })}
            />
          ))}
        </div>
      )}

      {editor.mode === "add" ? (
        <ModelEditor mode="add" onClose={() => setEditor({ mode: "closed" })} />
      ) : null}
      {editor.mode === "edit" ? (
        <ModelEditor
          mode="edit"
          initialKey={editor.key}
          initialEntry={editor.entry}
          onClose={() => setEditor({ mode: "closed" })}
        />
      ) : null}
    </div>
  );
}

function RegistryCard({
  registryKey,
  entry,
  onEdit,
}: {
  registryKey: string;
  entry: Record<string, unknown>;
  onEdit: () => void;
}) {
  const name = typeof entry.name === "string" ? entry.name : registryKey;
  const file = typeof entry.file === "string" ? entry.file : "—";
  const port = typeof entry.port === "number" ? `:${entry.port}` : "—";
  const ctx =
    typeof entry.context_length === "number" ? `${Math.round(entry.context_length / 1000)}k` : "—";
  const provider = typeof entry.provider === "string" ? entry.provider : "—";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = useDeleteRegistryEntry();
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
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-1)", flex: 1 }}
        >
          {registryKey}
        </span>
        <IconAction label="Edit" onClick={onEdit}>
          <Pencil size={12} />
        </IconAction>
        <IconAction
          label="Delete"
          variant="danger"
          onClick={() => setConfirmDelete(true)}
          disabled={del.isPending}
        >
          <Trash2 size={12} />
        </IconAction>
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
      {confirmDelete ? (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            background: "var(--state-down-bg)",
            border: "1px solid var(--state-down-bg)",
            borderRadius: 6,
            fontSize: 11.5,
            color: "var(--state-down-fg)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            Delete <span style={{ color: "var(--fg-1)" }}>{registryKey}</span> from model_registry?
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="cursor-pointer border-0"
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                background: "var(--canvas-3)",
                color: "var(--fg-1)",
                border: "1px solid var(--border-soft)",
                fontSize: 11.5,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                del.mutate(registryKey, {
                  onSuccess: () => setConfirmDelete(false),
                });
              }}
              disabled={del.isPending}
              className="flex cursor-pointer items-center gap-1 border-0"
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                background: "var(--state-down)",
                color: "oklch(98% 0 0)",
                fontSize: 11.5,
              }}
            >
              {del.isPending ? <Loader2 size={10} className="animate-spin" /> : null}
              Delete
            </button>
            {del.isError ? (
              <span style={{ fontSize: 10.5 }}>{(del.error as Error).message}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
  variant,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  variant?: "danger" | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer border-0"
      style={{
        padding: 4,
        background: "transparent",
        color: variant === "danger" ? "var(--state-down-fg)" : "var(--fg-3)",
        borderRadius: 3,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
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

function _Pill({
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
