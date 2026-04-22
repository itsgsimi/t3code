import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Code,
  ExternalLink,
  Lock,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { CONFIG_REDIRECTS } from "./configSchema";

/**
 * Form primitives for the Config settings surface. KV row, inputs, tri-state
 * toggle, env-chip, accordion card, restart note, YAML peek. The vocabulary
 * matches ModelEditor so edits on the right rail feel consistent.
 */

// ---------------------------------------------------------------------------
// KV row
// ---------------------------------------------------------------------------

export function KV({
  label,
  children,
  hint,
  required,
  error,
  changed,
}: {
  label: string;
  children: ReactNode;
  hint?: string | undefined;
  required?: boolean | undefined;
  error?: string | null | undefined;
  changed?: boolean | undefined;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "170px minmax(0, 1fr)",
        rowGap: 4,
        columnGap: 12,
        padding: "6px 0",
      }}
    >
      <label
        style={{
          paddingTop: 7,
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: changed ? "var(--ember-400)" : "var(--fg-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>
            {label}
            {required ? <span style={{ color: "var(--ember-400)" }}> *</span> : null}
          </span>
          {changed ? (
            <span style={{ fontSize: 9, color: "var(--ember-400)" }}>●</span>
          ) : null}
        </div>
        {hint ? (
          <div
            style={{
              color: "var(--fg-4)",
              fontSize: 10,
              marginTop: 3,
              fontFamily: "var(--font-sans)",
            }}
          >
            {hint}
          </div>
        ) : null}
      </label>
      <div>
        {children}
        {error ? (
          <div
            style={{
              marginTop: 4,
              fontSize: 10.5,
              color: "var(--state-down-fg)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

const inputStyle = (mono: boolean, disabled: boolean): CSSProperties => ({
  width: "100%",
  padding: "6px 9px",
  background: "var(--canvas-3)",
  border: "1px solid var(--border-soft)",
  borderRadius: 4,
  color: "var(--fg-1)",
  fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
  fontSize: 12,
  outline: "none",
  opacity: disabled ? 0.55 : 1,
});

export function TextInput({
  value,
  onChange,
  mono,
  placeholder,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  mono?: boolean | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <input
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle(!!mono, !!disabled)}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  disabled,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  step?: number | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <input
      type="number"
      step={step}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      style={inputStyle(true, !!disabled)}
    />
  );
}

export function SelectField({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: readonly (string | { value: string; label: string })[];
  disabled?: boolean | undefined;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={inputStyle(true, !!disabled)}
    >
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

export function TriBool({
  value,
  onChange,
  disabled,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean | null) => void;
  disabled?: boolean | undefined;
}) {
  const opts: { v: boolean | null; l: string }[] = [
    { v: null, l: "unset" },
    { v: true, l: "true" },
    { v: false, l: "false" },
  ];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {opts.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.l}
            type="button"
            onClick={() => !disabled && onChange(o.v)}
            disabled={disabled}
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              background: active ? "var(--canvas-4)" : "var(--canvas-3)",
              color: active ? "var(--fg-1)" : "var(--fg-3)",
              border: `1px solid ${active ? "var(--border-default)" : "var(--border-soft)"}`,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              cursor: disabled ? "default" : "pointer",
              opacity: disabled ? 0.55 : 1,
            }}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

export function EnvChip({ varname }: { varname: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 9px",
        background: "var(--canvas-2)",
        border: "1px dashed var(--border-default)",
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        color: "var(--fg-3)",
        width: "100%",
      }}
    >
      <Lock size={11} />
      <span style={{ color: "var(--fg-2)" }}>{varname}</span>
      <span
        style={{
          marginLeft: "auto",
          padding: "1px 6px",
          borderRadius: 3,
          background: "var(--canvas-3)",
          color: "var(--fg-4)",
          fontSize: 9.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        env
      </span>
    </div>
  );
}

/** Env-var literal (${FOO}) auto-renders as a locked chip; otherwise TextInput. */
export function SmartText({
  value,
  onChange,
  mono = true,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  mono?: boolean | undefined;
  disabled?: boolean | undefined;
}) {
  if (typeof value === "string" && /^\$\{[A-Z0-9_]+\}$/.test(value)) {
    return <EnvChip varname={value} />;
  }
  return <TextInput value={value ?? ""} onChange={onChange} mono={mono} disabled={disabled} />;
}

// ---------------------------------------------------------------------------
// Section card
// ---------------------------------------------------------------------------

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  disabled,
  onToggleEnable,
  enableLabel,
  accent,
}: {
  title?: string | undefined;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  disabled?: boolean | undefined;
  onToggleEnable?: (() => void) | undefined;
  enableLabel?: string | undefined;
  accent?: boolean | undefined;
}) {
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 14,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {title ? (
        <div
          style={{
            padding: "11px 16px",
            borderBottom: "1px solid var(--border-soft)",
            background: accent ? "var(--canvas-2)" : "transparent",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--fg-2)",
            }}
          >
            {title}
          </span>
          {subtitle ? (
            <span
              style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}
            >
              {subtitle}
            </span>
          ) : null}
          {disabled ? <OffChip /> : null}
          <div style={{ flex: 1 }} />
          {onToggleEnable ? (
            <EnableToggle disabled={!!disabled} onClick={onToggleEnable} label={enableLabel} />
          ) : null}
          {actions}
        </div>
      ) : null}
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

export function OffChip() {
  return (
    <span
      style={{
        padding: "2px 7px",
        borderRadius: 3,
        fontSize: 9.5,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: "var(--state-unknown-bg)",
        color: "var(--state-unknown-fg)",
      }}
    >
      off
    </span>
  );
}

function EnableToggle({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label?: string | undefined;
}) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 9px",
        borderRadius: 4,
        background: "var(--canvas-3)",
        color: "var(--fg-2)",
        border: "1px solid var(--border-soft)",
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
      }}
    >
      {disabled ? `Enable ${label ?? ""}`.trim() : "Disable"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Accordion
// ---------------------------------------------------------------------------

export function Accordion({
  title,
  subtitle,
  open,
  onToggle,
  count,
  children,
  disabled,
  onToggleEnable,
  enableLabel,
  accent,
}: {
  title: string;
  subtitle?: string | undefined;
  open: boolean;
  onToggle: () => void;
  count: number;
  children: ReactNode;
  disabled?: boolean | undefined;
  onToggleEnable?: (() => void) | undefined;
  enableLabel?: string | undefined;
  accent?: boolean | undefined;
}) {
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        marginBottom: 10,
        overflow: "hidden",
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 16px",
          background: accent ? "var(--ember-tint)" : "transparent",
          border: 0,
          borderBottom: open ? "1px solid var(--border-soft)" : "none",
          cursor: "pointer",
          color: "var(--fg-1)",
          textAlign: "left",
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: accent ? "var(--ember-300)" : "var(--fg-1)",
          }}
        >
          {title}
        </span>
        {subtitle ? (
          <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{subtitle}</span>
        ) : null}
        {disabled ? <OffChip /> : null}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-4)" }}>
          {count} fields
        </span>
        {onToggleEnable ? (
          <EnableToggle disabled={!!disabled} onClick={onToggleEnable} label={enableLabel} />
        ) : null}
      </button>
      {open ? <div style={{ padding: "10px 16px" }}>{children}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restart note + read-only YAML
// ---------------------------------------------------------------------------

export function RestartNote({ services }: { services: readonly string[] }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 14px",
        background: "var(--canvas-1)",
        border: "1px dashed var(--border-default)",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        color: "var(--fg-3)",
      }}
    >
      <RefreshCw size={13} />
      <span>
        After save, restart <span style={{ color: "var(--fg-1)" }}>{services.join(", ")}</span>{" "}
        to apply.
      </span>
    </div>
  );
}

export function ReadOnlyYaml({ section, values }: { section: string; values: unknown }) {
  const [show, setShow] = useState(false);
  const yaml = useMemo(() => renderYaml({ [section]: values }), [section, values]);
  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          background: "transparent",
          border: "1px solid var(--border-soft)",
          borderRadius: 4,
          color: "var(--fg-3)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
        }}
      >
        <Code size={11} /> {show ? "Hide" : "Show"} YAML
      </button>
      {show ? (
        <pre
          style={{
            marginTop: 8,
            padding: 14,
            background: "var(--canvas-2)",
            border: "1px solid var(--border-soft)",
            borderRadius: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--fg-2)",
            lineHeight: 1.6,
            overflow: "auto",
            maxHeight: 260,
          }}
        >
          {yaml}
        </pre>
      ) : null}
    </div>
  );
}

function renderYaml(v: unknown, depth = 0): string {
  const pad = "  ".repeat(depth);
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map((i) => `${pad}- ${renderYaml(i, 0)}`).join("\n");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          return `${pad}${k}:\n${renderYaml(val, depth + 1)}`;
        }
        return `${pad}${k}: ${renderYaml(val, 0)}`;
      })
      .join("\n");
  }
  return String(v);
}

// ---------------------------------------------------------------------------
// Redirect card
// ---------------------------------------------------------------------------

export function RedirectCard({
  section,
  onOpen,
}: {
  section: string;
  onOpen: (route: string) => void;
}) {
  const r = CONFIG_REDIRECTS[section];
  if (!r) return null;
  const firstWord = r.to.split(" ")[0] ?? r.to;
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 22,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ember-tint)",
          color: "var(--ember-300)",
        }}
      >
        <ExternalLink size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--fg-1)",
          }}
        >
          Managed in {r.to}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
          {r.desc} Config edits for this section happen there so the UI can do structured
          things like model swap, restart, and drift detection.
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-4)",
            fontFamily: "var(--font-mono)",
            marginTop: 8,
          }}
        >
          {r.route}
        </div>
      </div>
      <PrimaryButton onClick={() => onOpen(r.route)}>Open {firstWord}</PrimaryButton>
    </div>
  );
}

export function PrimaryButton({
  onClick,
  children,
  disabled,
  Icon,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean | undefined;
  Icon?: LucideIcon | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 5,
        background: disabled ? "var(--canvas-3)" : "var(--ember-400)",
        color: disabled ? "var(--fg-4)" : "var(--fg-on-accent)",
        border: 0,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {Icon ? <Icon size={12} /> : null}
      {children}
    </button>
  );
}

export function SecondaryButton({
  onClick,
  children,
  disabled,
  danger,
  Icon,
}: {
  onClick: () => void;
  children?: ReactNode | undefined;
  disabled?: boolean | undefined;
  danger?: boolean | undefined;
  Icon?: LucideIcon | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 5,
        background: "var(--canvas-3)",
        color: disabled
          ? "var(--fg-4)"
          : danger
            ? "var(--state-down-fg)"
            : "var(--fg-1)",
        border: "1px solid var(--border-soft)",
        fontSize: 12,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {Icon ? <Icon size={12} /> : null}
      {children}
    </button>
  );
}

export function FlagChip({
  children,
  muted,
  danger,
}: {
  children: ReactNode;
  muted?: boolean | undefined;
  danger?: boolean | undefined;
}) {
  const bg = danger
    ? "var(--state-down-bg)"
    : muted
      ? "var(--canvas-3)"
      : "var(--state-healthy-bg)";
  const col = danger
    ? "var(--state-down-fg)"
    : muted
      ? "var(--fg-3)"
      : "var(--state-healthy-fg)";
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        padding: "2px 6px",
        borderRadius: 3,
        background: bg,
        color: col,
        textTransform: "lowercase",
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sheet form section fieldset (used inside DetailSheet bodies)
// ---------------------------------------------------------------------------

export function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset
      style={{
        border: "1px solid var(--border-soft)",
        borderRadius: 6,
        padding: "10px 14px 14px",
        marginBottom: 12,
        background: "var(--canvas-2)",
      }}
    >
      <legend
        style={{
          padding: "0 6px",
          fontFamily: "var(--font-display)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--fg-2)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
