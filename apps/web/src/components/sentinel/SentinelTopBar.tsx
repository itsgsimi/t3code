import { useNavigate } from "@tanstack/react-router";
import { Bot, Settings } from "lucide-react";

import { useCommandPaletteStore } from "../../commandPaletteStore";
import { useBeardyDrawerStore } from "../../sentinel/beardyDrawerStore";

const FORMATTED_SHORTCUT = navigator.userAgent.toLowerCase().includes("mac") ? "⌘K" : "Ctrl K";

export function SentinelTopBar() {
  const navigate = useNavigate();
  const openPalette = useCommandPaletteStore((state) => state.setOpen);
  const chatOpen = useBeardyDrawerStore((state) => state.open);
  const toggleChat = useBeardyDrawerStore((state) => state.toggle);

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-3 px-3.5"
      style={{
        background: "var(--canvas-1)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <div
        className="flex items-center gap-2"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: "-0.01em",
          color: "var(--fg-1)",
        }}
      >
        <div
          aria-hidden
          className="flex h-6 w-6 items-center justify-center"
          style={{
            borderRadius: 5,
            background: "linear-gradient(135deg, var(--ember-400), var(--ember-600))",
            color: "var(--fg-on-accent)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "-0.03em",
            boxShadow: "inset 0 0 0 1px oklch(100% 0 0 / 0.15)",
          }}
        >
          S
        </div>
        Sentinel
      </div>

      <div
        aria-hidden
        className="mx-1 h-[18px] w-px"
        style={{ background: "var(--border-default)" }}
      />

      <HealthChip />

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => openPalette(true)}
        className="flex cursor-text items-center gap-2 transition-colors"
        style={{
          minWidth: 180,
          padding: "5px 10px",
          background: "var(--canvas-2)",
          border: "1px solid var(--border-soft)",
          borderRadius: 5,
          color: "var(--fg-3)",
          fontSize: 12,
        }}
      >
        <span style={{ fontFamily: "var(--font-sans)" }}>Search or run a command…</span>
        <span
          className="ml-auto"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-3)",
            background: "var(--canvas-3)",
            border: "1px solid var(--border-soft)",
            borderRadius: 3,
            padding: "1px 5px",
          }}
        >
          {FORMATTED_SHORTCUT}
        </span>
      </button>

      <IconButton label="Toggle Beardy" active={chatOpen} onClick={() => toggleChat()}>
        <Bot size={16} />
      </IconButton>

      <IconButton label="Settings" onClick={() => void navigate({ to: "/settings" })}>
        <Settings size={16} />
      </IconButton>
    </header>
  );
}

function HealthChip() {
  return (
    <div
      className="inline-flex items-center gap-[7px]"
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: "var(--state-healthy-bg)",
        color: "var(--state-healthy-fg)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      <span className="ds-dot ds-dot--healthy" aria-hidden />
      <span>4 / 4 healthy</span>
    </div>
  );
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-[30px] w-[30px] items-center justify-center transition-colors"
      style={{
        background: active ? "var(--canvas-3)" : "transparent",
        border: `1px solid ${active ? "var(--border-default)" : "transparent"}`,
        borderRadius: 5,
        color: active ? "var(--fg-1)" : "var(--fg-2)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
