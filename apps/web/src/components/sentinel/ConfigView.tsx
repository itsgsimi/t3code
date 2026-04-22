import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  Brain,
  ChevronDown,
  ChevronRight,
  Cpu,
  ExternalLink,
  Plug,
  RefreshCw,
  Save,
  Search,
  Settings,
  Undo2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  useSentinelConfigSection,
  useSentinelConfigSections,
  useUpdateConfigSection,
} from "../../sentinel/hooks";
import { DetailSheet } from "./DetailSheet";
import {
  CONFIG_GROUPS,
  CONFIG_REDIRECTS,
  CONFIG_SECTION_DESC,
  CONFIG_SECTION_RESTART,
  type ConfigGroupIcon,
} from "./configSchema";
import {
  PrimaryButton,
  ReadOnlyYaml,
  RedirectCard,
  SecondaryButton,
  SectionCard,
} from "./configPrimitives";
import { countDirty, freshSection, type SectionState } from "./configState";
import {
  ConfigSectionApiServer,
  type ApiServerValues,
} from "./ConfigSectionApiServer";
import {
  ConfigSectionMemory,
  type MemorySheetKind,
  type MemoryValues,
} from "./ConfigSectionMemory";
import {
  ConfigSectionMcp,
  type McpSheetKind,
  type McpValues,
} from "./ConfigSectionMcp";
import { ConfigSectionScalar } from "./ConfigSectionScalar";
import { DiscordForm, McpItemForm, PruneForm } from "./ConfigSheets";

const GROUP_ICON: Record<ConfigGroupIcon, LucideIcon> = {
  settings: Settings,
  cpu: Cpu,
  bot: Bot,
  brain: Brain,
  plug: Plug,
  activity: Activity,
  wrench: Wrench,
};

type SheetState = MemorySheetKind | McpSheetKind | null;

/**
 * Config — a real settings surface. Grouped rail on the left, section body in
 * the middle, DetailSheet on the right (shared with Beardy drawer). Three
 * archetype editors (api_server, memory, mcp_servers) cover the shapes;
 * other sections render a read-only placeholder until their schema lands.
 */
type ScalarValues = Record<string, unknown>;

export function ConfigView() {
  const [active, setActive] = useState<string>("memory");
  const [apiState, setApiState] = useState<SectionState<ApiServerValues> | null>(null);
  const [memState, setMemState] = useState<SectionState<MemoryValues> | null>(null);
  const [mcpState, setMcpState] = useState<SectionState<McpValues> | null>(null);
  const [scalarStates, setScalarStates] = useState<
    Record<string, SectionState<ScalarValues>>
  >({});
  const [sheet, setSheet] = useState<SheetState>(null);
  const [pendingRestart, setPendingRestart] = useState<readonly string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveMutation = useUpdateConfigSection();

  const sectionsQuery = useSentinelConfigSections();
  const activeQuery = useSentinelConfigSection(active);
  const apiQuery = useSentinelConfigSection(active === "api_server" ? "api_server" : null);
  const memQuery = useSentinelConfigSection(active === "memory" ? "memory" : null);
  const mcpQuery = useSentinelConfigSection(active === "mcp_servers" ? "mcp_servers" : null);

  const isArchetype =
    active === "api_server" || active === "memory" || active === "mcp_servers";
  const isRedirectActive = !!CONFIG_REDIRECTS[active];
  const activeScalar = scalarStates[active] ?? null;

  // Seed local state from backend once data arrives for the archetype
  // sections. Discarded or unsaved state survives switching away & back
  // (we only seed when local state is still null).
  useEffect(() => {
    if (apiState === null && apiQuery.data?.value) {
      setApiState(freshSection(apiQuery.data.value as ApiServerValues));
    }
  }, [apiState, apiQuery.data]);
  useEffect(() => {
    if (memState === null && memQuery.data?.value) {
      setMemState(freshSection(memQuery.data.value as MemoryValues));
    }
  }, [memState, memQuery.data]);
  useEffect(() => {
    if (mcpState === null && mcpQuery.data?.value) {
      setMcpState(freshSection(mcpQuery.data.value as McpValues));
    }
  }, [mcpState, mcpQuery.data]);
  // Seed scalar state for any non-archetype, non-redirect section whose
  // backend value is a dict.
  useEffect(() => {
    if (isArchetype || isRedirectActive) return;
    if (activeScalar !== null) return;
    const v = activeQuery.data?.value;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      setScalarStates((s) => ({
        ...s,
        [active]: freshSection({ ...(v as ScalarValues) }),
      }));
    }
  }, [active, activeQuery.data, activeScalar, isArchetype, isRedirectActive]);

  const dirtyBySection: Record<string, boolean> = {
    api_server: !!apiState && countDirty(apiState) > 0,
    memory: !!memState && countDirty(memState) > 0,
    mcp_servers: !!mcpState && countDirty(mcpState) > 0,
  };
  for (const [name, st] of Object.entries(scalarStates)) {
    dirtyBySection[name] = countDirty(st) > 0;
  }
  const activeDirtyCount = (() => {
    if (active === "api_server") return apiState ? countDirty(apiState) : 0;
    if (active === "memory") return memState ? countDirty(memState) : 0;
    if (active === "mcp_servers") return mcpState ? countDirty(mcpState) : 0;
    return activeScalar ? countDirty(activeScalar) : 0;
  })();

  const sections = sectionsQuery.data?.sections ?? [];
  const knownSections = new Set(sections);

  async function saveAll() {
    setSaveError(null);
    let value: unknown = null;
    if (active === "api_server" && apiState) value = apiState.values;
    else if (active === "memory" && memState) value = memState.values;
    else if (active === "mcp_servers" && mcpState) value = mcpState.values;
    else if (activeScalar) value = activeScalar.values;
    else return;

    let saved: unknown;
    try {
      const res = await saveMutation.mutateAsync({ section: active, value });
      saved = res.value;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      return;
    }

    const services = CONFIG_SECTION_RESTART[active] ?? [];
    if (services.length > 0) {
      setPendingRestart((p) => Array.from(new Set([...p, ...services])));
    }
    // Reseed from the PATCH response so we don't race the background
    // refetch. The values are whatever ruamel round-tripped to disk — the
    // authoritative view.
    if (active === "api_server")
      setApiState(freshSection(saved as ApiServerValues));
    else if (active === "memory") setMemState(freshSection(saved as MemoryValues));
    else if (active === "mcp_servers") setMcpState(freshSection(saved as McpValues));
    else
      setScalarStates((s) => ({
        ...s,
        [active]: freshSection({ ...(saved as ScalarValues) }),
      }));
  }
  function discardAll() {
    if (active === "api_server" && apiQuery.data)
      setApiState(freshSection(apiQuery.data.value as ApiServerValues));
    else if (active === "memory" && memQuery.data)
      setMemState(freshSection(memQuery.data.value as MemoryValues));
    else if (active === "mcp_servers" && mcpQuery.data)
      setMcpState(freshSection(mcpQuery.data.value as McpValues));
    else if (activeQuery.data?.value)
      setScalarStates((s) => ({
        ...s,
        [active]: freshSection({ ...(activeQuery.data.value as ScalarValues) }),
      }));
  }

  return (
    <div className="flex min-w-0 flex-1">
      <ConfigRail
        active={active}
        onSelect={setActive}
        dirtyBySection={dirtyBySection}
        knownSections={knownSections}
      />
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        style={{ background: "var(--canvas-0)" }}
      >
        <div className="flex-1 overflow-auto">
          <ConfigPageHeader
            section={active}
            dirtyCount={activeDirtyCount}
            saving={saveMutation.isPending}
            saveError={saveError}
            onDiscardAll={() => {
              setSaveError(null);
              discardAll();
            }}
            onSaveAll={() => void saveAll()}
          />
          <div style={{ padding: "20px 28px 80px", maxWidth: 960 }}>
            <ActiveSection
              active={active}
              apiState={apiState}
              setApiState={(updater) =>
                setApiState((s) => (s ? updater(s) : s))
              }
              memState={memState}
              setMemState={(updater) =>
                setMemState((s) => (s ? updater(s) : s))
              }
              mcpState={mcpState}
              setMcpState={(updater) =>
                setMcpState((s) => (s ? updater(s) : s))
              }
              scalarState={activeScalar}
              setScalarState={(updater) =>
                setScalarStates((prev) => {
                  const current = prev[active];
                  if (!current) return prev;
                  return { ...prev, [active]: updater(current) };
                })
              }
              openSheet={(s) => setSheet(s)}
              knownSections={knownSections}
              activeQueryError={activeQuery.isError}
              activeQueryValue={activeQuery.data?.value}
            />
          </div>
        </div>
        <PendingRestartStrip
          services={pendingRestart}
          onDismiss={() => setPendingRestart([])}
        />
      </div>

      <DetailSheet
        open={!!sheet}
        title={sheetTitle(sheet)}
        eyebrow={sheetEyebrow(sheet)}
        onClose={() => setSheet(null)}
        width={480}
      >
        <SheetBody
          sheet={sheet}
          setMemState={(updater) => setMemState((s) => (s ? updater(s) : s))}
          setMcpState={(updater) => setMcpState((s) => (s ? updater(s) : s))}
          onClose={() => setSheet(null)}
        />
      </DetailSheet>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rail
// ---------------------------------------------------------------------------

function ConfigRail({
  active,
  onSelect,
  dirtyBySection,
  knownSections,
}: {
  active: string;
  onSelect: (next: string) => void;
  dirtyBySection: Record<string, boolean>;
  knownSections: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CONFIG_GROUPS.map((g) => [g.key, true])),
  );

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) return CONFIG_GROUPS;
    return CONFIG_GROUPS.map((g) => ({
      ...g,
      sections: g.sections.filter((s) => s.toLowerCase().includes(q)),
    })).filter((g) => g.sections.length > 0);
  }, [q]);

  const totalDirty = Object.values(dirtyBySection).filter(Boolean).length;

  return (
    <aside
      style={{
        width: 260,
        background: "var(--canvas-1)",
        borderRight: "1px solid var(--border-soft)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--border-soft)" }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--fg-1)",
            }}
          >
            Config
          </span>
          <span
            style={{ fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}
          >
            22 sections
          </span>
          {totalDirty > 0 ? (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                padding: "2px 7px",
                borderRadius: 3,
                background: "var(--ember-tint)",
                color: "var(--ember-300)",
              }}
            >
              {totalDirty} unsaved
            </span>
          ) : null}
        </div>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--fg-4)",
            }}
          >
            <Search size={12} />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter sections…"
            style={{
              width: "100%",
              padding: "6px 9px 6px 26px",
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              borderRadius: 4,
              color: "var(--fg-1)",
              fontFamily: "var(--font-sans)",
              fontSize: 11.5,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div style={{ overflow: "auto", padding: "8px 6px", flex: 1 }}>
        {filteredGroups.map((g) => {
          const isOpen = !!q ? true : expanded[g.key] !== false;
          const groupDirty = g.sections.some((s) => dirtyBySection[s]);
          const Icon = GROUP_ICON[g.icon];
          return (
            <div key={g.key} style={{ marginBottom: 4 }}>
              <button
                type="button"
                onClick={() =>
                  setExpanded((e) => ({ ...e, [g.key]: e[g.key] === false }))
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  background: "transparent",
                  border: 0,
                  color: "var(--fg-2)",
                  cursor: "pointer",
                  borderRadius: 4,
                }}
              >
                {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <Icon size={12} />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--fg-3)",
                  }}
                >
                  {g.label}
                </span>
                {groupDirty ? (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      background: "var(--ember-400)",
                    }}
                  />
                ) : null}
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    color: "var(--fg-4)",
                  }}
                >
                  {g.sections.length}
                </span>
              </button>
              {isOpen ? (
                <div
                  style={{
                    marginLeft: 8,
                    borderLeft: "1px solid var(--border-soft)",
                    paddingLeft: 6,
                  }}
                >
                  {g.sections.map((s) => (
                    <RailRow
                      key={s}
                      name={s}
                      active={active === s}
                      dirty={!!dirtyBySection[s]}
                      redirect={!!CONFIG_REDIRECTS[s]}
                      unknown={!knownSections.has(s) && knownSections.size > 0}
                      onClick={() => onSelect(s)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function RailRow({
  name,
  active,
  dirty,
  redirect,
  unknown,
  onClick,
}: {
  name: string;
  active: boolean;
  dirty: boolean;
  redirect: boolean;
  unknown: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 28,
        padding: "0 8px",
        borderRadius: 4,
        border: 0,
        cursor: "pointer",
        background: active ? "var(--canvas-3)" : "transparent",
        color: active ? "var(--fg-1)" : unknown ? "var(--fg-4)" : "var(--fg-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      <span>{name}</span>
      {dirty ? (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: "var(--ember-400)",
          }}
        />
      ) : null}
      {redirect ? <ExternalLink size={10} /> : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ConfigPageHeader({
  section,
  dirtyCount,
  saving,
  saveError,
  onDiscardAll,
  onSaveAll,
}: {
  section: string;
  dirtyCount: number;
  saving?: boolean | undefined;
  saveError?: string | null | undefined;
  onDiscardAll: () => void;
  onSaveAll: () => void;
}) {
  const isRedirect = !!CONFIG_REDIRECTS[section];
  return (
    <div
      style={{
        padding: "22px 28px 14px",
        borderBottom: "1px solid var(--border-soft)",
        background: "var(--canvas-0)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 10 }}>
        Sentinel / Config / <span style={{ color: "var(--fg-2)" }}>{section}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 600,
                color: "var(--fg-1)",
                letterSpacing: "-0.02em",
                margin: 0,
                fontVariantLigatures: "none",
              }}
            >
              {section}
            </h1>
            {isRedirect ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: 3,
                  background: "var(--canvas-2)",
                  border: "1px solid var(--border-soft)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--fg-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <ExternalLink size={10} /> managed elsewhere
              </span>
            ) : dirtyCount > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 9px",
                  borderRadius: 3,
                  background: "var(--ember-tint)",
                  color: "var(--ember-300)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: "var(--ember-400)",
                  }}
                />
                {dirtyCount} unsaved field{dirtyCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 9px",
                  borderRadius: 3,
                  background: "var(--state-healthy-bg)",
                  color: "var(--state-healthy-fg)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span className="ds-dot ds-dot--healthy" aria-hidden />
                saved
              </span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--fg-3)", margin: "8px 0 0" }}>
            {CONFIG_SECTION_DESC[section] ?? "Config section from config.yaml."}
          </p>
        </div>
        {!isRedirect ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SecondaryButton
              onClick={onDiscardAll}
              disabled={dirtyCount === 0 || !!saving}
              Icon={Undo2}
            >
              Discard
            </SecondaryButton>
            <PrimaryButton
              onClick={onSaveAll}
              disabled={dirtyCount === 0 || !!saving}
              Icon={Save}
            >
              {saving
                ? "Saving…"
                : dirtyCount > 0
                  ? `Save changes · ${dirtyCount}`
                  : "Save changes"}
            </PrimaryButton>
          </div>
        ) : null}
      </div>
      {saveError ? (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            background: "var(--state-down-bg)",
            border: "1px solid var(--state-down-bg)",
            borderRadius: 5,
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--state-down-fg)",
          }}
        >
          {saveError}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active section router
// ---------------------------------------------------------------------------

function ActiveSection({
  active,
  apiState,
  setApiState,
  memState,
  setMemState,
  mcpState,
  setMcpState,
  scalarState,
  setScalarState,
  openSheet,
  knownSections,
  activeQueryError,
  activeQueryValue,
}: {
  active: string;
  apiState: SectionState<ApiServerValues> | null;
  setApiState: (
    updater: (s: SectionState<ApiServerValues>) => SectionState<ApiServerValues>,
  ) => void;
  memState: SectionState<MemoryValues> | null;
  setMemState: (
    updater: (s: SectionState<MemoryValues>) => SectionState<MemoryValues>,
  ) => void;
  mcpState: SectionState<McpValues> | null;
  setMcpState: (updater: (s: SectionState<McpValues>) => SectionState<McpValues>) => void;
  scalarState: SectionState<Record<string, unknown>> | null;
  setScalarState: (
    updater: (
      s: SectionState<Record<string, unknown>>,
    ) => SectionState<Record<string, unknown>>,
  ) => void;
  openSheet: (s: SheetState) => void;
  knownSections: Set<string>;
  activeQueryError: boolean;
  activeQueryValue: unknown;
}) {
  const navigate = useNavigate();

  if (CONFIG_REDIRECTS[active]) {
    return (
      <RedirectCard
        section={active}
        onOpen={(route) => void navigate({ to: route })}
      />
    );
  }
  if (active === "api_server") {
    if (!apiState) return <Loading />;
    return (
      <ConfigSectionApiServer
        state={apiState}
        setState={(updater) => setApiState((s) => updater(s))}
      />
    );
  }
  if (active === "memory") {
    if (!memState) return <Loading />;
    return (
      <ConfigSectionMemory
        state={memState}
        setState={(updater) => setMemState((s) => updater(s))}
        openSheet={(s) => openSheet(s)}
      />
    );
  }
  if (active === "mcp_servers") {
    if (!mcpState) return <Loading />;
    return (
      <ConfigSectionMcp
        state={mcpState}
        setState={(updater) => setMcpState((s) => updater(s))}
        openSheet={(s) => openSheet(s)}
      />
    );
  }
  if (activeQueryError) {
    return (
      <PlaceholderSection
        section={active}
        known={knownSections.has(active)}
        error
        value={undefined}
      />
    );
  }
  if (!knownSections.has(active) && knownSections.size > 0) {
    return (
      <PlaceholderSection
        section={active}
        known={false}
        error={false}
        value={undefined}
      />
    );
  }
  if (!scalarState) return <Loading />;
  return (
    <ConfigSectionScalar
      section={active}
      state={scalarState}
      setState={(updater) => setScalarState((s) => updater(s))}
      restartServices={CONFIG_SECTION_RESTART[active] ?? []}
    />
  );
}

function Loading() {
  return (
    <SectionCard>
      <div
        style={{
          padding: "8px 0",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-3)",
        }}
      >
        loading…
      </div>
    </SectionCard>
  );
}

function PlaceholderSection({
  section,
  known,
  error,
  value,
}: {
  section: string;
  known: boolean;
  error: boolean;
  value: unknown;
}) {
  return (
    <div>
      <SectionCard>
        <div
          style={{
            padding: "8px 0 4px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-3)",
          }}
        >
          {error
            ? "Can't reach the Sentinel API. Run `sentinel up` and reload."
            : !known
              ? "Not present in config.yaml — nothing to render."
              : "This section uses the same primitives (TextInput, NumberInput, TriBool, SmartText for env vars). The three archetype editors — api_server, memory, mcp_servers — demonstrate the patterns. Schema-driven form follows."}
        </div>
      </SectionCard>
      {!error && value !== undefined ? (
        <ReadOnlyYaml section={section} values={value} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailSheet body router
// ---------------------------------------------------------------------------

function sheetTitle(sheet: SheetState): string {
  if (!sheet) return "";
  if (sheet.kind === "mcp.new") return "Add MCP server";
  if (sheet.kind === "mcp.item") return sheet.name;
  if (sheet.kind === "memory.dream.prune") return "dream.prune";
  if (sheet.kind === "memory.dream.discord") return "dream.discord";
  return "";
}

function sheetEyebrow(sheet: SheetState): string | undefined {
  if (!sheet) return undefined;
  if (sheet.kind === "mcp.new") return "new mcp_servers entry";
  if (sheet.kind === "mcp.item") return "mcp_servers";
  if (sheet.kind === "memory.dream.prune" || sheet.kind === "memory.dream.discord")
    return "memory → dream";
  return undefined;
}

function SheetBody({
  sheet,
  setMemState,
  setMcpState,
  onClose,
}: {
  sheet: SheetState;
  setMemState: (
    updater: (s: SectionState<MemoryValues>) => SectionState<MemoryValues>,
  ) => void;
  setMcpState: (updater: (s: SectionState<McpValues>) => SectionState<McpValues>) => void;
  onClose: () => void;
}): ReactNode {
  if (!sheet) return null;
  if (sheet.kind === "memory.dream.prune") {
    return (
      <PruneForm
        node={sheet.node}
        onClose={onClose}
        onSave={(patch) => {
          setMemState((s) => {
            const v = structuredClone(s.values);
            Object.assign(v.dream.prune, patch);
            const dirty = { ...s.dirty };
            for (const k of Object.keys(patch)) dirty[`dream.prune.${k}`] = true;
            return { ...s, values: v, dirty };
          });
          onClose();
        }}
      />
    );
  }
  if (sheet.kind === "memory.dream.discord") {
    return (
      <DiscordForm
        node={sheet.node}
        onClose={onClose}
        onSave={(patch) => {
          setMemState((s) => {
            const v = structuredClone(s.values);
            Object.assign(v.dream.discord, patch);
            const dirty = { ...s.dirty };
            for (const k of Object.keys(patch)) dirty[`dream.discord.${k}`] = true;
            return { ...s, values: v, dirty };
          });
          onClose();
        }}
      />
    );
  }
  if (sheet.kind === "mcp.new" || sheet.kind === "mcp.item") {
    const isNew = sheet.kind === "mcp.new";
    return (
      <McpItemForm
        isNew={isNew}
        {...(isNew ? {} : { name: sheet.name, item: sheet.item })}
        onClose={onClose}
        onSave={(name, form) => {
          setMcpState((s) => ({
            ...s,
            values: { ...s.values, [name]: { ...(s.values[name] ?? {}), ...form } },
            dirty: { ...s.dirty, [name]: true },
          }));
          onClose();
        }}
      />
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pending restart strip
// ---------------------------------------------------------------------------

function PendingRestartStrip({
  services,
  onDismiss,
}: {
  services: readonly string[];
  onDismiss: () => void;
}) {
  if (services.length === 0) return null;
  return (
    <div
      style={{
        padding: "10px 20px",
        background: "var(--canvas-1)",
        borderTop: "1px solid var(--ember-400)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 -4px 14px oklch(0% 0 0 / 0.3)",
        flexShrink: 0,
      }}
    >
      <span className="ds-dot ds-dot--degraded" aria-hidden />
      <div
        style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-1)" }}
      >
        Saved. <span style={{ color: "var(--fg-3)" }}>Restart required:</span>{" "}
        <span style={{ color: "var(--ember-300)" }}>{services.join(", ")}</span>
      </div>
      <div style={{ flex: 1 }} />
      <SecondaryButton onClick={onDismiss} Icon={RefreshCw}>
        Later
      </SecondaryButton>
      <PrimaryButton onClick={onDismiss} Icon={RefreshCw}>
        Restart now
      </PrimaryButton>
    </div>
  );
}
