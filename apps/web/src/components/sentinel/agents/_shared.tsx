import type { ReactNode } from "react";

export function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRight: "1px solid var(--border-soft)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--fg-3)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--fg-1)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
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

export function CardHead({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-soft)",
        fontSize: 12.5,
        fontWeight: 500,
        color: "var(--fg-1)",
      }}
    >
      {children}
    </div>
  );
}

export function EmptyCard({ children }: { children: ReactNode }) {
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

export function KV({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-baseline gap-3"
      style={{ padding: "4px 0", borderBottom: "1px dashed var(--border-soft)" }}
    >
      <span style={{ color: "var(--fg-3)", fontSize: 11, width: 180 }}>{label}</span>
      <span style={{ color: "var(--fg-1)", fontSize: 13, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

export function TableHead({ columns, widths }: { columns: readonly string[]; widths: readonly string[] }) {
  return (
    <div
      className="grid items-center gap-3"
      style={{
        gridTemplateColumns: widths.join(" "),
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
