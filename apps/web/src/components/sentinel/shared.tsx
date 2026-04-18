import type { CSSProperties, ReactNode } from "react";

/**
 * Shared bits for Sentinel page surfaces (Home, Stack, Models, Agents,
 * Deploy, Config). Keep this file small — it's not a kitchen-sink design
 * system. For anything used only once, inline it in the page.
 */

// ---------------------------------------------------------------------------
// Page chrome
// ---------------------------------------------------------------------------

export function PageCrumb({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 18 }}>{children}</div>;
}

export function PageHeader({
  title,
  chip,
  subtitle,
}: {
  title: string;
  chip?: { state: DotState; text: string };
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
        <h1 style={titleStyle}>{title}</h1>
        {chip ? (
          <>
            <span className={`ds-dot ds-dot--${chip.state}`} aria-hidden />
            <span
              style={{
                fontSize: 12,
                color: `var(--state-${chip.state}-fg)`,
                fontFamily: "var(--font-mono)",
              }}
            >
              {chip.text}
            </span>
          </>
        ) : null}
      </div>
      {subtitle ? (
        <p style={{ fontSize: 12.5, color: "var(--fg-3)", margin: "6px 0 18px" }}>{subtitle}</p>
      ) : null}
    </div>
  );
}

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 600,
  color: "var(--fg-1)",
  letterSpacing: "-0.02em",
  margin: 0,
};

export type DotState = "healthy" | "busy" | "degraded" | "down" | "dream" | "unknown";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export interface TabOption {
  key: string;
  label: string;
  count?: number;
}

export function Tabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly TabOption[];
}) {
  return (
    <div
      className="flex gap-1"
      style={{ marginBottom: 16, borderBottom: "1px solid var(--border-soft)" }}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="flex cursor-pointer items-center gap-[6px] border-0 bg-transparent"
            style={{
              padding: "8px 12px",
              fontSize: 12.5,
              color: active ? "var(--fg-1)" : "var(--fg-3)",
              borderBottom: `2px solid ${active ? "var(--ember-400)" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {opt.label}
            {typeof opt.count === "number" ? (
              <span
                style={{
                  fontSize: 10,
                  color: "var(--fg-4)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
