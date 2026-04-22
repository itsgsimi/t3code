import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRightLeft,
  Copy,
  Download,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  TerminalSquare,
  Trash2,
  X,
} from "lucide-react";

import {
  useApplyPreset,
  useDeleteRegistryEntry,
  useSentinelApplyModelMode,
  useSentinelBenchRuns,
  useSentinelCancelModelDownload,
  useSentinelLocalModels,
  useSentinelModelDownloadJobs,
  useSentinelModelSwap,
  useSentinelModelsLoaded,
  useSentinelModelsModes,
  useSentinelModelsPresets,
  useSentinelModelsRegistry,
  useSentinelModelsRoles,
  useSentinelRunBench,
  useSentinelStartModelDownload,
} from "../../sentinel/hooks";
import type {
  LocalModelEntry,
  ModelDownloadInput,
  ModelDownloadJobsResponse,
  SentinelLoadedRole,
  SentinelModesByRole,
  SentinelRole,
} from "../../sentinel/api";
import { ModelEditor } from "./ModelEditor";
import { PageCrumb, PageHeader, Tabs, type TabOption } from "./shared";
import { useConfirm } from "./primitives";

/**
 * Models — registry, roles, presets, benchmarks. All live from the backend:
 *  /v1/models/registry, /v1/models/roles, /v1/models/presets, /v1/bench/runs.
 * Actions POST to /v1/admin/model-swap, /v1/models/presets/apply, /v1/bench/run.
 */
export function ModelsView() {
  const [tab, setTab] = useState<TabKey>("roles");
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const roles = useSentinelModelsRoles();
  const registry = useSentinelModelsRegistry();
  const presets = useSentinelModelsPresets();
  const loaded = useSentinelModelsLoaded();
  const modes = useSentinelModelsModes();
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
    <div className="flex min-w-0 flex-1">
      <div className="min-w-0 flex-1 overflow-auto">
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
                { key: "downloads", label: "Downloads" },
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
                modesByRole={modes.data ?? {}}
              />
            </>
          ) : null}
          {tab === "registry" ? (
            <RegistryTab
              entries={registryEntries}
              onAdd={() => setEditor({ mode: "add" })}
              onEdit={(key, entry) => setEditor({ mode: "edit", key, entry })}
              onDuplicate={(key, entry) =>
                setEditor({
                  mode: "add",
                  seedKey: suggestDuplicateKey(key, registryEntries.map(([k]) => k)),
                  seedEntry: cloneRegistryEntry(entry),
                })
              }
            />
          ) : null}
          {tab === "presets" ? <PresetsTab entries={presetEntries} /> : null}
          {tab === "bench" ? (
            <BenchTab runs={benchRuns} loadedByRole={loadedByRole} />
          ) : null}
          {tab === "downloads" ? <DownloadsTab /> : null}
        </div>
      </div>

      {editor.mode !== "closed" ? (
        <ModelEditor
          key={
            editor.mode === "edit"
              ? `edit:${editor.key}`
              : editor.seedKey
                ? `add:${editor.seedKey}`
                : "add"
          }
          open
          mode={editor.mode}
          {...(editor.mode === "edit"
            ? { initialKey: editor.key, initialEntry: editor.entry }
            : {
                ...(editor.seedKey ? { initialKey: editor.seedKey } : {}),
                ...(editor.seedEntry ? { initialEntry: editor.seedEntry } : {}),
              })}
          onClose={() => setEditor({ mode: "closed" })}
        />
      ) : null}
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: "24px 28px 60px",
  maxWidth: 1200,
  margin: "0 auto",
};

type TabKey = "roles" | "registry" | "presets" | "bench" | "downloads";

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
  modesByRole,
}: {
  roles: readonly SentinelRole[];
  registry: Record<string, { name?: string; port?: number; context_length?: number }>;
  loadedByRole: Map<string, SentinelLoadedRole>;
  modesByRole: SentinelModesByRole;
}) {
  if (roles.length === 0) {
    return <EmptyCard>Loading role assignments from /v1/models/roles…</EmptyCard>;
  }
  return (
    <Card>
      <TableHead
        columns={["role", "configured model", "port", "ctx", "loaded (live)", "mode", "action"]}
        widths={["130px", "1.2fr", "60px", "55px", "1fr", "220px", "150px"]}
      />
      {roles.map((r, i) => (
        <RoleRow
          key={r.role}
          role={r}
          last={i === roles.length - 1}
          registry={registry}
          loaded={loadedByRole.get(r.role)}
          roleModes={modesByRole[r.role]}
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
  roleModes,
}: {
  role: SentinelRole;
  registry: Record<string, { name?: string; port?: number; context_length?: number }>;
  loaded: SentinelLoadedRole | undefined;
  last: boolean;
  roleModes: SentinelModesByRole[string] | undefined;
}) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(role.registry_key ?? "");
  const swap = useSentinelModelSwap();
  const applyMode = useSentinelApplyModelMode();
  const ctx = role.context_length ? `${Math.round(role.context_length / 1000)}k` : "—";
  const port = role.port ? `:${role.port}` : "—";

  const modeOptions = roleModes ? Object.keys(roleModes.modes).sort() : [];
  const currentMode = roleModes?.active_mode ?? roleModes?.default_mode ?? "";
  const modeOverridden =
    !!roleModes?.active_mode &&
    roleModes.active_mode !== roleModes.default_mode;
  const [modePending, setModePending] = useState<string | null>(null);
  const modeSelection = modePending ?? currentMode;

  async function applyModeChange(next: string) {
    if (!roleModes || !next || next === currentMode) return;
    setModePending(next);
    try {
      await applyMode.mutateAsync({ role: role.role, mode: next });
    } finally {
      setModePending(null);
    }
  }

  async function resetMode() {
    if (!roleModes?.active_mode) return;
    setModePending(roleModes.default_mode ?? "default");
    try {
      await applyMode.mutateAsync({ role: role.role, mode: "default" });
    } finally {
      setModePending(null);
    }
  }

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
        gridTemplateColumns: "130px 1.2fr 60px 55px 1fr 220px 150px",
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontSize: 12.5,
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span style={{ color: "var(--fg-1)" }}>{role.role}</span>
        {role.overridden ? (
          <span
            title="Registry key was swapped at runtime via `sentinel model swap`. Survives until you clear with `sentinel model reset` or change config.yaml."
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
      <div className="flex items-center gap-1" style={{ minWidth: 0 }}>
        {modeOptions.length === 0 ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-4)",
            }}
            title="This model has no declared modes in config.yaml"
          >
            —
          </span>
        ) : (
          <>
            <select
              value={modeSelection}
              onChange={(e) => void applyModeChange(e.target.value)}
              disabled={applyMode.isPending}
              title={
                modeOverridden
                  ? `Override active. Default: ${roleModes?.default_mode ?? "(none)"}`
                  : "Default mode active"
              }
              style={{
                flex: 1,
                padding: "4px 6px",
                borderRadius: 4,
                background: "var(--canvas-2)",
                border: `1px solid ${
                  modeOverridden
                    ? "var(--state-healthy-fg)"
                    : "var(--border-default)"
                }`,
                color: "var(--fg-1)",
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                minWidth: 0,
              }}
            >
              {modeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                  {name === roleModes?.default_mode ? " (default)" : ""}
                </option>
              ))}
            </select>
            {applyMode.isPending && modePending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : null}
            {modeOverridden && !applyMode.isPending ? (
              <ActionButton
                onClick={() => void resetMode()}
                title="Restore default mode"
              >
                ↺
              </ActionButton>
            ) : null}
          </>
        )}
      </div>
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
  | { mode: "add"; seedKey?: string; seedEntry?: Record<string, unknown> }
  | { mode: "edit"; key: string; entry: Record<string, unknown> };

function cloneRegistryEntry(entry: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entry)) {
    // Drop port so the dupe doesn't collide with the source entry.
    if (k === "port") continue;
    out[k] = v;
  }
  return out;
}

function suggestDuplicateKey(source: string, existing: readonly string[]): string {
  const existingSet = new Set(existing);
  const base = `${source}-copy`;
  if (!existingSet.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${source}-copy${i}`;
    if (!existingSet.has(candidate)) return candidate;
  }
  return base;
}

function RegistryTab({
  entries,
  onAdd,
  onEdit,
  onDuplicate,
}: {
  entries: ReadonlyArray<[string, Record<string, unknown>]>;
  onAdd: () => void;
  onEdit: (key: string, entry: Record<string, unknown>) => void;
  onDuplicate: (key: string, entry: Record<string, unknown>) => void;
}) {
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
          onClick={onAdd}
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
              onEdit={() => onEdit(key, entry)}
              onDuplicate={() => onDuplicate(key, entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RegistryCard({
  registryKey,
  entry,
  onEdit,
  onDuplicate,
}: {
  registryKey: string;
  entry: Record<string, unknown>;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  const name = typeof entry.name === "string" ? entry.name : registryKey;
  const file = typeof entry.file === "string" ? entry.file : "—";
  const port = typeof entry.port === "number" ? `:${entry.port}` : "—";
  const ctx =
    typeof entry.context_length === "number" ? `${Math.round(entry.context_length / 1000)}k` : "—";
  const provider = typeof entry.provider === "string" ? entry.provider : "—";
  const isBase = entry.kind === "base";
  const baseFamily = typeof entry.base_family === "string" ? entry.base_family : "";
  const del = useDeleteRegistryEntry();
  const confirm = useConfirm();
  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete ${registryKey}?`,
      body: (
        <span>
          Remove <code>{registryKey}</code> from <code>model_registry</code>. Any role
          assigned to it must be reassigned before the next stack restart.
        </span>
      ),
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) del.mutate(registryKey);
  };
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
        {isBase ? (
          <span
            title={baseFamily ? `Base model · ${baseFamily}` : "Base model"}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              padding: "1px 6px",
              borderRadius: 3,
              background: "var(--ember-400)",
              color: "var(--fg-on-accent)",
              letterSpacing: "0.04em",
            }}
          >
            BASE{baseFamily ? ` · ${baseFamily}` : ""}
          </span>
        ) : baseFamily ? (
          <span
            title={`family: ${baseFamily}`}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              padding: "1px 6px",
              borderRadius: 3,
              background: "var(--canvas-3)",
              color: "var(--fg-3)",
              letterSpacing: "0.04em",
            }}
          >
            {baseFamily}
          </span>
        ) : null}
        <IconAction label="Edit" onClick={onEdit}>
          <Pencil size={12} />
        </IconAction>
        <IconAction label="Duplicate" onClick={onDuplicate}>
          <Copy size={12} />
        </IconAction>
        <IconAction
          label="Delete"
          variant="danger"
          onClick={handleDelete}
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
        <span title="HTTP port llama-server listens on (host network)">{port}</span>
        <span title="Max context window in thousands of tokens (-c / --ctx-size)">{ctx}</span>
        <span title="Runtime backend: local = llama.cpp in Docker, openai = remote API">{provider}</span>
      </div>
      {del.isError ? (
        <div
          style={{
            marginTop: 10,
            padding: 8,
            background: "var(--state-down-bg)",
            border: "1px solid var(--state-down-bg)",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--state-down-fg)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {(del.error as Error).message}
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
  loadedByRole,
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
  loadedByRole: Map<string, SentinelLoadedRole>;
}) {
  return (
    <div>
      <BenchRunForm loadedByRole={loadedByRole} />
      {runs.length === 0 ? (
        <EmptyCard>
          No benchmark runs yet. Use the form above to measure token/s on any loaded
          model. Results land in{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>benchmarks/results/inference/</span>.
        </EmptyCard>
      ) : (
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
      )}
    </div>
  );
}

function BenchRunForm({
  loadedByRole,
}: {
  loadedByRole: Map<string, SentinelLoadedRole>;
}) {
  const run = useSentinelRunBench();
  const [label, setLabel] = useState("");
  const [port, setPort] = useState("");
  const [passes, setPasses] = useState("5");
  const portOptions = Array.from(loadedByRole.values())
    .filter((r) => typeof r.port === "number")
    .map((r) => ({ role: r.role, port: r.port as number }));

  const submit = () => {
    const payload: { passes?: number; label?: string; port?: number } = {};
    const passNum = Number(passes);
    if (Number.isFinite(passNum) && passNum > 0) payload.passes = passNum;
    if (label.trim()) payload.label = label.trim();
    const portNum = Number(port);
    if (Number.isFinite(portNum) && portNum > 0) payload.port = portNum;
    run.mutate(payload);
  };

  return (
    <div
      className="mb-3"
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div
        className="mb-2 flex items-center gap-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--fg-2)",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        Run a bench
        <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          sentinel bench run
        </span>
      </div>
      <div
        className="grid gap-2 items-end"
        style={{ gridTemplateColumns: "1.2fr 1fr 90px auto" }}
      >
        <div>
          <div
            style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
            title="Human-readable tag recorded with the result. Use something you can grep on later (e.g. the ROCm image tag or a config change name)."
          >
            label
          </div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. rocm-nightly-2026-04-21"
            title="Human-readable tag recorded with the result."
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              borderRadius: 4,
              color: "var(--fg-1)",
              fontSize: 12.5,
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>
        <div>
          <div
            style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
            title="Which llama-server to bench. Defaults to 6969 (orchestrator). Benches hit /completion on this port."
          >
            port
          </div>
          <select
            value={port}
            onChange={(e) => setPort(e.target.value)}
            title="Which llama-server to bench — pick a loaded role or keep the default."
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              borderRadius: 4,
              color: "var(--fg-1)",
              fontSize: 12.5,
              fontFamily: "var(--font-mono)",
            }}
          >
            <option value="">default (6969)</option>
            {portOptions.map((opt) => (
              <option key={`${opt.role}:${opt.port}`} value={String(opt.port)}>
                {opt.port} · {opt.role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div
            style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}
            title="Number of repeated prompts per category. More passes = more stable tok/s averages, but slower. 5 is usually enough."
          >
            passes
          </div>
          <input
            type="number"
            min={1}
            max={50}
            value={passes}
            onChange={(e) => setPasses(e.target.value)}
            title="Repeats per prompt category. 3 = quick sanity, 5 = default, 10+ = stable averages."
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              borderRadius: 4,
              color: "var(--fg-1)",
              fontSize: 12.5,
              fontFamily: "var(--font-mono)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={run.isPending}
          className="flex cursor-pointer items-center gap-2 border-0"
          style={{
            padding: "7px 14px",
            borderRadius: 5,
            background: run.isPending ? "var(--canvas-3)" : "var(--ember-400)",
            color: run.isPending ? "var(--fg-3)" : "var(--fg-on-accent)",
            fontSize: 12.5,
            fontWeight: 500,
            height: 32,
          }}
        >
          {run.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
          {run.isPending ? "Running…" : "Run bench"}
        </button>
      </div>
      {run.isError ? (
        <div
          className="mt-2"
          style={{
            fontSize: 11.5,
            color: "var(--state-down-fg)",
            fontFamily: "var(--font-mono)",
          }}
        >
          failed — {(run.error as Error).message}
        </div>
      ) : null}
      {run.isSuccess && !run.isPending ? (
        <div
          className="mt-2"
          style={{
            fontSize: 11.5,
            color: "var(--state-healthy-fg)",
            fontFamily: "var(--font-mono)",
          }}
        >
          bench run finished — refresh to see the new entry
        </div>
      ) : null}
    </div>
  );
}

// ---- Downloads tab --------------------------------------------------------

function DownloadsTab() {
  const local = useSentinelLocalModels();
  const jobsQ = useSentinelModelDownloadJobs();
  return (
    <div className="flex flex-col gap-4">
      <DownloadForm />
      <DownloadJobsList jobs={jobsQ.data ?? null} />
      <LocalFilesList
        root={local.data?.root ?? "models"}
        entries={local.data?.entries ?? []}
        loading={local.isLoading}
      />
    </div>
  );
}

function DownloadForm() {
  const start = useSentinelStartModelDownload();
  const [mode, setMode] = useState<"url" | "hf">("url");
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState("");
  const [filename, setFilename] = useState("");
  const [destName, setDestName] = useState("");

  const submit = () => {
    const payload: ModelDownloadInput = { mode };
    if (mode === "url") {
      if (!url.trim()) return;
      payload.url = url.trim();
      if (destName.trim()) payload.dest_name = destName.trim();
    } else {
      if (!repo.trim()) return;
      payload.repo = repo.trim();
      if (filename.trim()) payload.filename = filename.trim();
    }
    start.mutate(payload, {
      onSuccess: () => {
        if (mode === "url") setUrl("");
        else {
          setRepo("");
          setFilename("");
        }
        setDestName("");
      },
    });
  };

  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 14,
      }}
    >
      <div
        className="mb-2 flex items-center gap-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--fg-2)",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        Download a model
        <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          lands under ./models/
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
          marginBottom: 8,
          lineHeight: 1.5,
        }}
      >
        Strix Halo tip: 128 GB unified memory fits 27B-35B A3B MoE comfortably.
        Prefer Q4_K_XL / Q5_K_XL GGUFs from unsloth. Bigger than 70B dense gets
        tight even with offload.
      </div>
      <div className="mb-2 flex items-center gap-2">
        <ModeTab
          active={mode === "url"}
          onClick={() => setMode("url")}
          title="Download a single GGUF file via curl. Paste the HuggingFace resolve link."
        >
          Direct URL
        </ModeTab>
        <ModeTab
          active={mode === "hf"}
          onClick={() => setMode("hf")}
          title="Use the hf CLI to pull a single file from a repo, or the whole repo (useful for HF-format base models for fine-tuning)."
        >
          Hugging Face
        </ModeTab>
      </div>
      {mode === "url" ? (
        <div className="flex flex-col gap-2">
          <Labeled label="url (.gguf)">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://huggingface.co/…/model.gguf?download=true"
              style={inputStyle}
            />
          </Labeled>
          <Labeled label="dest filename (optional)">
            <input
              type="text"
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
              placeholder="Qwen3.6-35B-A3B-UD-Q5_K_XL.gguf"
              style={inputStyle}
            />
          </Labeled>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Labeled label="repo (org/name)">
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="unsloth/Qwen3.6-35B-A3B-GGUF"
              style={inputStyle}
            />
          </Labeled>
          <Labeled label="filename (optional — whole repo if blank)">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Qwen3.6-35B-A3B-UD-Q5_K_XL.gguf"
              style={inputStyle}
            />
          </Labeled>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={start.isPending}
          className="flex cursor-pointer items-center gap-2 border-0"
          style={{
            padding: "7px 14px",
            borderRadius: 5,
            background: start.isPending ? "var(--canvas-3)" : "var(--ember-400)",
            color: start.isPending ? "var(--fg-3)" : "var(--fg-on-accent)",
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          {start.isPending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Start download
        </button>
        {start.isError ? (
          <span
            style={{
              fontSize: 11.5,
              color: "var(--state-down-fg)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {(start.error as Error).message}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="cursor-pointer border-0"
      style={{
        padding: "4px 12px",
        borderRadius: 4,
        background: active ? "var(--canvas-3)" : "transparent",
        color: active ? "var(--fg-1)" : "var(--fg-3)",
        border: active ? "1px solid var(--border-default)" : "1px solid var(--border-soft)",
        fontSize: 11.5,
      }}
    >
      {children}
    </button>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  background: "var(--canvas-2)",
  border: "1px solid var(--border-soft)",
  borderRadius: 4,
  color: "var(--fg-1)",
  fontSize: 12.5,
  fontFamily: "var(--font-mono)",
};

function DownloadJobsList({ jobs }: { jobs: ModelDownloadJobsResponse | null }) {
  const cancel = useSentinelCancelModelDownload();
  const entries = jobs?.jobs ?? [];
  if (entries.length === 0) {
    return (
      <EmptyCard>No download jobs yet. Start one above.</EmptyCard>
    );
  }
  return (
    <Card>
      <TableHead
        columns={["status", "mode", "source", "dest", "size", ""]}
        widths={["90px", "70px", "1.5fr", "1.4fr", "110px", "40px"]}
      />
      {entries.map((j, i) => (
        <div
          key={j.job_id}
          className="grid items-center gap-3"
          style={{
            gridTemplateColumns: "90px 70px 1.5fr 1.4fr 110px 40px",
            padding: "10px 14px",
            borderBottom: i === entries.length - 1 ? "none" : "1px solid var(--border-soft)",
            fontSize: 12,
          }}
        >
          <span
            className="flex items-center gap-[6px]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)", fontSize: 11 }}
          >
            <span
              className={`ds-dot ds-dot--${
                j.status === "running"
                  ? "busy"
                  : j.status === "ok"
                    ? "healthy"
                    : "down"
              }`}
              aria-hidden
            />
            {j.status === "running"
              ? "running"
              : j.status === "ok"
                ? "done"
                : "failed"}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
            {j.mode}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--fg-2)",
              fontSize: 11,
              wordBreak: "break-all",
            }}
            title={j.source}
          >
            {j.source}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--fg-2)",
              fontSize: 11,
              wordBreak: "break-all",
            }}
            title={j.dest}
          >
            {j.dest}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)", fontSize: 11 }}>
            {formatBytes(j.bytes_downloaded)}
          </span>
          <span>
            {j.status === "running" ? (
              <button
                type="button"
                title="Cancel"
                onClick={() => cancel.mutate(j.job_id)}
                disabled={cancel.isPending}
                className="cursor-pointer border-0"
                style={{
                  padding: 4,
                  background: "transparent",
                  color: "var(--state-down-fg)",
                  borderRadius: 3,
                }}
              >
                <X size={12} />
              </button>
            ) : null}
          </span>
        </div>
      ))}
    </Card>
  );
}

function LocalFilesList({
  root,
  entries,
  loading,
}: {
  root: string;
  entries: readonly LocalModelEntry[];
  loading: boolean;
}) {
  return (
    <div>
      <div
        className="mb-2 flex items-center gap-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--fg-2)",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        <FolderOpen size={13} />
        Local files
        <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          {root}/
        </span>
      </div>
      {loading ? (
        <EmptyCard>Scanning {root}/…</EmptyCard>
      ) : entries.length === 0 ? (
        <EmptyCard>
          Nothing in {root}/ yet. Use the form above to download a GGUF or a
          whole HF repo (for fine-tune base models).
        </EmptyCard>
      ) : (
        <Card>
          <TableHead
            columns={["kind", "name", "size", "modified"]}
            widths={["80px", "2fr", "110px", "170px"]}
          />
          {entries.map((e, i) => (
            <div
              key={e.path}
              className="grid items-center gap-3"
              style={{
                gridTemplateColumns: "80px 2fr 110px 170px",
                padding: "8px 14px",
                borderBottom: i === entries.length - 1 ? "none" : "1px solid var(--border-soft)",
                fontSize: 12,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
                {e.kind}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--fg-1)",
                  fontSize: 11,
                  wordBreak: "break-all",
                }}
              >
                {e.name}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-2)", fontSize: 11 }}>
                {formatBytes(e.size)}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
                {formatMtime(e.mtime)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
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
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
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
