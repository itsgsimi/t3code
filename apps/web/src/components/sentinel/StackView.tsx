import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Loader2, Play, RotateCw, Square } from "lucide-react";

import {
  useLlmAction,
  useSentinelAgentStatus,
  useSentinelAgentTools,
  useSentinelHealth,
  useSentinelModelsLoaded,
} from "../../sentinel/hooks";
import type { LlmAction, SentinelLoadedRole } from "../../sentinel/api";
import { DetailSheet, useDetailSheetParam } from "./DetailSheet";
import { PageCrumb, PageHeader, type DotState } from "./shared";

/**
 * Stack — every process Sentinel manages, grouped by kind.
 * Live data comes from /v1/health, /v1/agent/status, /v1/agent/tools,
 * and /v1/models/loaded. Selecting a card opens a right-side DetailSheet
 * with per-service details (tool names for MCP, configured vs loaded for
 * LLMs). The DetailSheet takes the Beardy slot.
 */
export function StackView() {
  const [tab, setTab] = useState<TabKey>("all");
  const urlSelected = useDetailSheetParam("stack");
  const [selectedId, setSelectedId] = useState<string | null>(urlSelected);
  const health = useSentinelHealth();
  const agent = useSentinelAgentStatus();
  const tools = useSentinelAgentTools();
  const loaded = useSentinelModelsLoaded();
  const services = useServices(health.data, agent.data, tools.data, loaded.data);

  const filtered = services.filter((s) => (tab === "all" ? true : s.kind === tab));
  const healthyCount = services.filter((s) => s.state === "healthy").length;
  const offline = health.isError;
  const selected = services.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex min-w-0 flex-1">
      <div className="min-w-0 flex-1 overflow-auto">
        <div style={pageStyle}>
          <PageCrumb>Sentinel / Stack</PageCrumb>
          <PageHeader
            title="Stack"
            chip={{
              state: offline ? "down" : healthyCount === services.length ? "healthy" : "degraded",
              text: offline ? "API offline" : `${healthyCount} / ${services.length} healthy`,
            }}
            subtitle="Every process Sentinel manages. Click a card for details."
          />

          <div
            className="flex gap-1"
            style={{ marginBottom: 16, borderBottom: "1px solid var(--border-soft)" }}
          >
            {TABS.map((t) => (
              <Tab
                key={t}
                label={t}
                active={tab === t}
                count={
                  t === "all"
                    ? services.length
                    : t === "rocm"
                      ? undefined
                      : services.filter((s) => s.kind === t).length
                }
                onClick={() => setTab(t)}
              />
            ))}
          </div>

          {tab === "rocm" ? (
            <RocmPanel />
          ) : (
            <div style={gridStyle}>
              {filtered.map((service) => (
                <StackCard
                  key={service.id}
                  service={service}
                  selected={selectedId === service.id}
                  onSelect={() => setSelectedId(service.id)}
                />
              ))}
              {filtered.length === 0 ? (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--fg-3)",
                    padding: "16px 0",
                  }}
                >
                  No services matching {tab}.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <DetailSheet
        open={!!selected}
        title={selected?.name ?? ""}
        eyebrow={selected?.kind}
        onClose={() => setSelectedId(null)}
        persist={{ key: "stack", value: selected?.id ?? null }}
      >
        {selected ? <CardDetail service={selected} mcpTools={tools.data?.servers ?? {}} /> : null}
      </DetailSheet>
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

type TabKey = "all" | "core" | "models" | "mcp" | "memory" | "rocm";
const TABS: readonly TabKey[] = ["all", "core", "models", "mcp", "memory", "rocm"] as const;

interface Service {
  id: string;
  name: string;
  descriptor: string;
  state: DotState;
  kind: Exclude<TabKey, "all">;
  tools?: string[];
  role?: SentinelLoadedRole;
  note?: string;
  mcpName?: string;
}

function useServices(
  health?: { status: string; model_name?: string; context_length?: number },
  agent?: { mcp_servers: Record<string, boolean> },
  tools?: { servers: Record<string, string[]>; toolsets: Record<string, string[]> },
  loaded?: { roles: SentinelLoadedRole[] },
): readonly Service[] {
  return useMemo(() => {
    const services: Service[] = [];
    if (!health) {
      services.push({
        id: "api",
        name: "orchestrator (API)",
        descriptor: "FastAPI · :6967",
        state: "unknown",
        kind: "core",
        note: "API unreachable — run `sentinel up`",
      });
      return services;
    }
    services.push({
      id: "api",
      name: "orchestrator (API)",
      descriptor: "FastAPI · :6967",
      state: health.status === "ok" ? "healthy" : "degraded",
      kind: "core",
    });
    for (const r of loaded?.roles ?? []) {
      if (!r.port) continue;
      const state: DotState = !r.healthy
        ? "down"
        : r.loaded_model
          ? r.configured_model_file &&
            normalize(r.configured_model_file) !== normalize(r.loaded_model)
            ? "degraded"
            : "healthy"
          : "busy";
      services.push({
        id: `llm-${r.role}`,
        name: `llama.cpp · ${r.role}`,
        descriptor: r.loaded_model
          ? `${r.loaded_model} · :${r.port}`
          : r.healthy
            ? `up · unknown model · :${r.port}`
            : `:${r.port} unreachable`,
        state,
        kind: "models",
        role: r,
      });
    }
    const serversMap = tools?.servers ?? {};
    for (const [name, connected] of Object.entries(agent?.mcp_servers ?? {})) {
      const list = serversMap[name];
      const toolNames = Array.isArray(list) ? list : [];
      services.push({
        id: `mcp-${name}`,
        name: `mcp · ${name}`,
        descriptor:
          toolNames.length > 0
            ? `${toolNames.length} tools`
            : connected
              ? "connected"
              : "disconnected",
        state: connected ? "healthy" : "down",
        kind: classifyMcp(name),
        tools: toolNames,
        mcpName: name,
      });
    }
    return services;
  }, [health, agent, tools, loaded]);
}

function normalize(s: string): string {
  return (s.split("/").pop() ?? s).toLowerCase();
}

function classifyMcp(name: string): Exclude<TabKey, "all"> {
  if (name.includes("graphiti") || name.includes("vault") || name.includes("memory")) {
    return "memory";
  }
  return "mcp";
}

const TAB_HINTS: Record<TabKey, string> = {
  all: "Every process Sentinel manages in one grid",
  core: "The always-on orchestrator (FastAPI)",
  models: "Each llama-server container, its loaded model, and port",
  mcp: "External MCP tool servers (non-memory)",
  memory: "Graphiti + Neo4j + sentinel-vault — the memory tier",
  rocm: "Manage the ROCm Docker image powering every LLM container — list tags, pull, promote, auto-rollback on smoke regression",
};

function Tab({
  label,
  active,
  count,
  onClick,
}: {
  label: TabKey;
  active: boolean;
  count: number | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={TAB_HINTS[label]}
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
      {typeof count === "number" ? (
        <span style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function StackCard({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="cursor-pointer border-0 text-left"
      style={{
        background: selected ? "var(--canvas-2)" : "var(--canvas-1)",
        border: `1px solid ${selected ? "var(--border-default)" : "var(--border-soft)"}`,
        borderRadius: 8,
        padding: 14,
        width: "100%",
      }}
    >
      <div className="flex items-center gap-[9px]">
        <span className={`ds-dot ds-dot--${service.state}`} aria-hidden />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-1)" }}>
          {service.name}
        </div>
        <Badge>{service.kind}</Badge>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 6 }}>{service.descriptor}</div>
      {service.note ? (
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
          {service.note}
        </div>
      ) : null}
    </button>
  );
}

function CardDetail({
  service,
  mcpTools,
}: {
  service: Service;
  mcpTools: Record<string, string[]>;
}) {
  if (service.id === "api") {
    return (
      <Detail>
        <KV label="endpoint" value="http://localhost:6967" />
        <KV label="source" value="src/sentinel/api/server.py" />
        <KV
          label="routes"
          value="/v1/health, /v1/query, /v1/agent/*, /v1/models/*, /v1/config/*, /v1/admin/*"
        />
      </Detail>
    );
  }
  if (service.id.startsWith("llm-")) {
    const r = service.role;
    if (!r) return null;
    return (
      <>
        <Detail>
          <KV label="role" value={r.role} />
          <KV label="port" value={r.port ? `:${r.port}` : "—"} />
          <KV label="configured model" value={r.configured_model_name ?? "—"} />
          <KV label="configured file" value={r.configured_model_file ?? "—"} />
          <KV
            label="loaded (live)"
            value={r.loaded_model ?? (r.healthy ? "up · unknown" : "port down")}
          />
          {r.detail ? <KV label="detail" value={r.detail} /> : null}
        </Detail>
        <LlmLifecycle role={r} />
      </>
    );
  }
  if (service.id.startsWith("mcp-")) {
    const list = service.tools ?? (service.mcpName ? (mcpTools[service.mcpName] ?? []) : []);
    return (
      <Detail>
        <KV label="tool count" value={String(list.length)} />
        {list.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--fg-3)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              tools
            </div>
            <div className="flex flex-wrap gap-[6px]">
              {list.map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    padding: "2px 7px",
                    borderRadius: 3,
                    background: "var(--canvas-2)",
                    border: "1px solid var(--border-soft)",
                    color: "var(--fg-2)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Detail>
    );
  }
  return null;
}

function LlmLifecycle({ role }: { role: SentinelLoadedRole }) {
  const key = role.configured_registry_key;
  const lifecycle = useLlmAction(key);
  const disabled = !key || lifecycle.isRunning;
  const job = lifecycle.job;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          color: "var(--fg-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        lifecycle
      </div>
      {!key ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--fg-4)",
          }}
        >
          No registry key assigned — can't start/stop this role.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <LifecycleButton
              action="up"
              icon={<Play size={12} />}
              label="Start"
              disabled={disabled}
              onClick={() => void lifecycle.trigger("up")}
            />
            <LifecycleButton
              action="restart"
              icon={<RotateCw size={12} />}
              label="Restart"
              disabled={disabled}
              onClick={() => void lifecycle.trigger("restart")}
            />
            <LifecycleButton
              action="down"
              icon={<Square size={12} />}
              label="Stop"
              disabled={disabled}
              danger
              onClick={() => void lifecycle.trigger("down")}
            />
            {job || lifecycle.isRunning ? (
              <button
                type="button"
                onClick={lifecycle.reset}
                disabled={lifecycle.isRunning}
                className="cursor-pointer border-0"
                style={{
                  padding: "5px 10px",
                  borderRadius: 4,
                  background: "transparent",
                  color: "var(--fg-4)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  cursor: lifecycle.isRunning ? "default" : "pointer",
                }}
              >
                clear
              </button>
            ) : null}
          </div>
          {lifecycle.triggerError ? (
            <div
              style={{
                marginTop: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--state-down-fg)",
                wordBreak: "break-all",
              }}
            >
              {lifecycle.triggerError}
            </div>
          ) : null}
          {job ? <JobStatus job={job} running={lifecycle.isRunning} /> : null}
        </>
      )}
    </div>
  );
}

function LifecycleButton({
  action,
  icon,
  label,
  disabled,
  danger,
  onClick,
}: {
  action: LlmAction;
  icon: ReactNode;
  label: string;
  disabled: boolean;
  danger?: boolean | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${action} llm container`}
      className="flex cursor-pointer items-center gap-[6px] border-0"
      style={{
        padding: "5px 10px",
        borderRadius: 4,
        background: "var(--canvas-3)",
        color: disabled
          ? "var(--fg-4)"
          : danger
            ? "var(--state-down-fg)"
            : "var(--fg-1)",
        border: "1px solid var(--border-soft)",
        fontSize: 11.5,
        fontFamily: "var(--font-mono)",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function JobStatus({ job, running }: { job: import("../../sentinel/api").LlmJob; running: boolean }) {
  const color =
    job.status === "ok"
      ? "var(--state-healthy-fg)"
      : job.status === "error"
        ? "var(--state-down-fg)"
        : "var(--fg-2)";
  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        background: "var(--canvas-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: 5,
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
      }}
    >
      <div className="flex items-center gap-2" style={{ color, marginBottom: 4 }}>
        {running ? <Loader2 size={12} className="animate-spin" /> : null}
        <span>
          {job.action} · {job.status}
        </span>
        {job.returncode !== null ? (
          <span style={{ color: "var(--fg-4)" }}>exit {job.returncode}</span>
        ) : null}
      </div>
      {job.message ? (
        <div style={{ color: "var(--fg-2)", marginBottom: 6 }}>{job.message}</div>
      ) : null}
      {job.stderr ? (
        <pre
          style={{
            color: "var(--fg-3)",
            fontSize: 10.5,
            whiteSpace: "pre-wrap",
            maxHeight: 160,
            overflow: "auto",
            margin: 0,
          }}
        >
          {job.stderr.trim()}
        </pre>
      ) : job.stdout ? (
        <pre
          style={{
            color: "var(--fg-3)",
            fontSize: 10.5,
            whiteSpace: "pre-wrap",
            maxHeight: 160,
            overflow: "auto",
            margin: 0,
          }}
        >
          {job.stdout.trim().split("\n").slice(-20).join("\n")}
        </pre>
      ) : null}
    </div>
  );
}

function Detail({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: 12,
        background: "var(--canvas-2)",
        border: "1px solid var(--border-soft)",
        borderRadius: 6,
      }}
    >
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-baseline gap-3"
      style={{ padding: "4px 0", borderBottom: "1px dashed var(--border-soft)" }}
    >
      <span
        style={{
          color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          width: 140,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--fg-1)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
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

// ---- ROCm panel -----------------------------------------------------------

import {
  useSentinelRocmActive,
  useSentinelRocmHistory,
  useSentinelRocmLocal,
  useSentinelRocmTags,
  useSentinelRocmPullJobs,
  useSentinelStartRocmPull,
  useSentinelPromoteRocm,
  useSentinelRollbackRocm,
} from "../../sentinel/hooks";
import type { RocmHistoryEntry, RocmLocalImage, RocmRemoteTag } from "../../sentinel/api";

function RocmPanel() {
  const active = useSentinelRocmActive();
  const tags = useSentinelRocmTags("rocm");
  const local = useSentinelRocmLocal();
  const history = useSentinelRocmHistory(10);
  const pullJobs = useSentinelRocmPullJobs();
  const pull = useSentinelStartRocmPull();
  const promote = useSentinelPromoteRocm();
  const rollback = useSentinelRollbackRocm();

  const activeTag = active.data?.tag ?? null;
  const localTags = new Set((local.data?.images ?? []).map((i) => i.tag));
  const runningPulls = new Set(
    (pullJobs.data?.jobs ?? []).filter((j) => j.status === "running").map((j) => j.tag),
  );

  return (
    <div className="flex flex-col gap-4">
      <RocmActiveCard
        activeImage={active.data?.image ?? null}
        activeTag={activeTag}
        previous={active.data?.previous ?? null}
        onRollback={() => rollback.mutate()}
        rollingBack={rollback.isPending}
      />

      <RocmSection title="Local images" subtitle={`${(local.data?.images ?? []).length} pulled`}>
        <RocmLocalList
          images={local.data?.images ?? []}
          activeTag={activeTag}
          promotingTag={promote.isPending ? (promote.variables?.tag ?? null) : null}
          onPromote={(tag) => promote.mutate({ tag, smoke: true, auto_rollback: true })}
        />
      </RocmSection>

      <RocmSection title="Available on Docker Hub" subtitle="newest first">
        <RocmRemoteList
          tags={tags.data?.tags ?? []}
          localTags={localTags}
          runningPulls={runningPulls}
          onPull={(tag) => pull.mutate(tag)}
          loading={tags.isLoading}
        />
      </RocmSection>

      <RocmSection title="History">
        <RocmHistoryList entries={history.data?.entries ?? []} />
      </RocmSection>

      {promote.isError ? (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--state-down-bg)",
            borderRadius: 6,
            fontSize: 11.5,
            color: "var(--state-down-fg)",
            fontFamily: "var(--font-mono)",
          }}
        >
          promote failed — {(promote.error as Error).message}
        </div>
      ) : null}
      {promote.data?.status === "rolled_back" ? (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--state-degraded-bg)",
            borderRadius: 6,
            fontSize: 11.5,
            color: "var(--fg-1)",
            fontFamily: "var(--font-mono)",
          }}
        >
          auto-rolled back after smoke regression — active stays at previous tag
        </div>
      ) : null}
    </div>
  );
}

function RocmActiveCard({
  activeImage,
  activeTag,
  previous,
  onRollback,
  rollingBack,
}: {
  activeImage: string | null;
  activeTag: string | null;
  previous: string | null;
  onRollback: () => void;
  rollingBack: boolean;
}) {
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
        style={{
          fontSize: 11,
          color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        active image
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--fg-1)",
          wordBreak: "break-all",
        }}
      >
        {activeImage ?? "—"}
      </div>
      {activeTag ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", marginTop: 4 }}>
          tag: <span style={{ color: "var(--fg-1)" }}>{activeTag}</span>
        </div>
      ) : null}
      {previous ? (
        <div className="mt-2 flex items-center gap-3">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
            previous: <span style={{ color: "var(--fg-2)" }}>{previous}</span>
          </span>
          <button
            type="button"
            onClick={onRollback}
            disabled={rollingBack}
            className="cursor-pointer border-0"
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              background: "var(--canvas-3)",
              color: "var(--fg-1)",
              border: "1px solid var(--border-soft)",
              fontSize: 11,
            }}
          >
            {rollingBack ? "Rolling back…" : "Roll back"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RocmSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
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
        {title}
        {subtitle ? (
          <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
            {subtitle}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function RocmLocalList({
  images,
  activeTag,
  promotingTag,
  onPromote,
}: {
  images: readonly RocmLocalImage[];
  activeTag: string | null;
  promotingTag: string | null;
  onPromote: (tag: string) => void;
}) {
  if (images.length === 0) {
    return (
      <div
        style={{
          padding: 12,
          background: "var(--canvas-1)",
          border: "1px solid var(--border-soft)",
          borderRadius: 6,
          fontSize: 11.5,
          color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
        }}
      >
        No local images found. Pull one from the list below.
      </div>
    );
  }
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {images.map((img, i) => {
        const isActive = img.tag === activeTag;
        const isPromoting = img.tag === promotingTag;
        return (
          <div
            key={img.id}
            className="grid items-center gap-3"
            style={{
              gridTemplateColumns: "1.8fr 110px 170px 110px",
              padding: "8px 14px",
              borderBottom: i === images.length - 1 ? "none" : "1px solid var(--border-soft)",
              fontSize: 12,
            }}
          >
            <span
              className="flex items-center gap-[8px]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)", fontSize: 11, wordBreak: "break-all" }}
            >
              {img.tag}
              {isActive ? (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9.5,
                    padding: "1px 6px",
                    borderRadius: 3,
                    background: "var(--ember-400)",
                    color: "var(--fg-on-accent)",
                  }}
                >
                  ACTIVE
                </span>
              ) : null}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
              {img.size}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
              {img.created}
            </span>
            <span>
              {isActive ? null : (
                <button
                  type="button"
                  onClick={() => onPromote(img.tag)}
                  disabled={isPromoting}
                  className="cursor-pointer border-0"
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: isPromoting ? "var(--canvas-3)" : "var(--ember-400)",
                    color: isPromoting ? "var(--fg-3)" : "var(--fg-on-accent)",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {isPromoting ? "Promoting…" : "Promote"}
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RocmRemoteList({
  tags,
  localTags,
  runningPulls,
  onPull,
  loading,
}: {
  tags: readonly RocmRemoteTag[];
  localTags: ReadonlySet<string>;
  runningPulls: ReadonlySet<string>;
  onPull: (tag: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
        Fetching from Docker Hub…
      </div>
    );
  }
  if (tags.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
        No tags returned from Docker Hub.
      </div>
    );
  }
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {tags.slice(0, 20).map((t, i) => {
        const isLocal = localTags.has(t.tag);
        const isPulling = runningPulls.has(t.tag);
        const sizeGb = t.full_size > 0 ? `${(t.full_size / 1024 / 1024 / 1024).toFixed(1)} GB` : "—";
        return (
          <div
            key={t.tag}
            className="grid items-center gap-3"
            style={{
              gridTemplateColumns: "1.8fr 170px 90px 100px",
              padding: "8px 14px",
              borderBottom: i === Math.min(tags.length, 20) - 1 ? "none" : "1px solid var(--border-soft)",
              fontSize: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--fg-1)",
                fontSize: 11,
                wordBreak: "break-all",
              }}
            >
              {t.tag}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
              {t.last_updated ? t.last_updated.slice(0, 19).replace("T", " ") : "—"}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-3)", fontSize: 11 }}>
              {sizeGb}
            </span>
            <span>
              {isLocal ? (
                <span style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                  local ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onPull(t.tag)}
                  disabled={isPulling}
                  className="cursor-pointer"
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: "var(--canvas-3)",
                    color: "var(--fg-1)",
                    border: "1px solid var(--border-soft)",
                    fontSize: 11,
                  }}
                >
                  {isPulling ? "Pulling…" : "Pull"}
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RocmHistoryList({ entries }: { entries: readonly RocmHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
        No promotion history yet.
      </div>
    );
  }
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {entries.map((e, i) => {
        const smokeStr = e.smoke ? (e.smoke.passed ? "smoke ✓" : "smoke ✗") : "—";
        return (
          <div
            key={`${e.ts}-${i}`}
            className="grid items-center gap-3"
            style={{
              gridTemplateColumns: "140px 100px 1.4fr 1.4fr 70px 60px",
              padding: "6px 14px",
              borderBottom: i === entries.length - 1 ? "none" : "1px solid var(--border-soft)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{ color: "var(--fg-3)" }}>{e.ts.slice(0, 19).replace("T", " ")}</span>
            <span style={{ color: e.event === "rollback" ? "var(--state-degraded-fg)" : "var(--fg-1)" }}>
              {e.event}
            </span>
            <span style={{ color: "var(--fg-1)", wordBreak: "break-all" }}>{e.tag ?? "—"}</span>
            <span style={{ color: "var(--fg-3)", wordBreak: "break-all" }}>
              {e.previous ? e.previous.split(":").pop() : "—"}
            </span>
            <span style={{ color: e.smoke?.passed ? "var(--state-healthy-fg)" : e.smoke ? "var(--state-down-fg)" : "var(--fg-4)" }}>
              {smokeStr}
            </span>
            <span style={{ color: e.rolled_back ? "var(--state-down-fg)" : "var(--fg-3)" }}>
              {e.rolled_back ? "rb" : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
