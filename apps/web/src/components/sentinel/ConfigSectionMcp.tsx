import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  FlagChip,
  PrimaryButton,
  RestartNote,
  SecondaryButton,
} from "./configPrimitives";
import type { SectionState } from "./configState";

export interface McpServer {
  transport: string;
  hostname?: string | null;
  port?: number | null;
  endpoint?: string | null;
  description?: string | null;
  always_on?: boolean | null;
  exclude_tools?: number | null;
  connected?: boolean | null;
  eval_safe?: boolean | null;
  command?: string | null;
  args?: string | null;
}

export type McpValues = Record<string, McpServer>;

export type McpSheetKind =
  | { kind: "mcp.new" }
  | { kind: "mcp.item"; name: string; item: McpServer };

export function ConfigSectionMcp({
  state,
  setState,
  openSheet,
}: {
  state: SectionState<McpValues>;
  setState: (updater: (s: SectionState<McpValues>) => SectionState<McpValues>) => void;
  openSheet: (s: McpSheetKind) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const items = Object.entries(state.values);
  const counts: Record<Filter, number> = {
    all: items.length,
    up: items.filter(([, v]) => v.connected).length,
    down: items.filter(([, v]) => !v.connected).length,
    always_on: items.filter(([, v]) => v.always_on).length,
  };
  const filtered = items.filter(([, v]) => {
    if (filter === "up") return !!v.connected;
    if (filter === "down") return !v.connected;
    if (filter === "always_on") return !!v.always_on;
    return true;
  });

  function remove(name: string) {
    setState((s) => {
      const c = { ...s.values };
      delete c[name];
      return { ...s, values: c, dirty: { ...s.dirty, [name]: true } };
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--canvas-1)",
            padding: 3,
            borderRadius: 5,
            border: "1px solid var(--border-soft)",
          }}
        >
          {(["all", "up", "down", "always_on"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              style={{
                padding: "4px 10px",
                borderRadius: 3,
                border: 0,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                background: filter === k ? "var(--canvas-3)" : "transparent",
                color: filter === k ? "var(--fg-1)" : "var(--fg-3)",
              }}
            >
              {k.replace("_", " ")}{" "}
              <span style={{ color: "var(--fg-4)" }}>{counts[k]}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <PrimaryButton onClick={() => openSheet({ kind: "mcp.new" })} Icon={Plus}>
          Add server
        </PrimaryButton>
      </div>

      <div
        style={{
          background: "var(--canvas-1)",
          border: "1px solid var(--border-soft)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            alignItems: "center",
            gap: 12,
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
          <span></span>
          <span>name</span>
          <span>transport</span>
          <span>address</span>
          <span>flags</span>
          <span style={{ textAlign: "right" }}>actions</span>
        </div>
        {filtered.map(([name, item], i) => (
          <McpRow
            key={name}
            name={name}
            item={item}
            last={i === filtered.length - 1}
            dirty={!!state.dirty[name]}
            onEdit={() => openSheet({ kind: "mcp.item", name, item })}
            onDelete={() => remove(name)}
          />
        ))}
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 20,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-4)",
            }}
          >
            No servers match {filter}.
          </div>
        ) : null}
      </div>

      <RestartNote services={["api"]} />
    </div>
  );
}

const GRID = "24px 1.2fr 110px 1.5fr 110px 120px";
type Filter = "all" | "up" | "down" | "always_on";

function McpRow({
  name,
  item,
  last,
  dirty,
  onEdit,
  onDelete,
}: {
  name: string;
  item: McpServer;
  last: boolean;
  dirty: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const addr =
    item.port != null ? `${item.hostname ?? "—"}:${item.port}${item.endpoint ?? ""}` : "—";
  const state = item.connected ? "healthy" : "down";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: GRID,
        alignItems: "center",
        gap: 12,
        padding: "11px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontSize: 12.5,
        background: dirty ? "var(--ember-tint)" : "transparent",
      }}
    >
      <span className={`ds-dot ds-dot--${state}`} aria-hidden />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{name}</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.description}
        </span>
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>
        {item.transport}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-2)",
          wordBreak: "break-all",
        }}
      >
        {addr}
      </span>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {item.always_on ? <FlagChip>always_on</FlagChip> : null}
        {typeof item.exclude_tools === "number" && item.exclude_tools > 0 ? (
          <FlagChip muted>{item.exclude_tools} excl</FlagChip>
        ) : null}
        {item.eval_safe === false ? <FlagChip danger>eval_unsafe</FlagChip> : null}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <SecondaryButton onClick={onEdit} Icon={Pencil}>
          Edit
        </SecondaryButton>
        <SecondaryButton onClick={onDelete} Icon={Trash2} danger />
      </div>
    </div>
  );
}
