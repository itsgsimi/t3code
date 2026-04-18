import { Link, useLocation } from "@tanstack/react-router";
import { Bot, Cloud, Cpu, FileCog, Home, Layers, ListTodo, type LucideIcon } from "lucide-react";

type SectionKey = "home" | "sessions" | "stack" | "models" | "agents" | "deploy" | "config";

interface NavEntry {
  key: SectionKey;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Test against pathname to decide if this entry is active. */
  matches: (pathname: string) => boolean;
  disabled?: boolean;
}

const NAV: readonly NavEntry[] = [
  {
    key: "home",
    label: "Home",
    to: "/home",
    icon: Home,
    matches: (p) => p === "/home" || p === "/home/",
  },
  {
    key: "sessions",
    label: "Sessions",
    to: "/",
    icon: ListTodo,
    matches: (p) => p === "/" || p.startsWith("/draft/") || /^\/[^/]+\/[^/]+\/?$/.test(p), // $environmentId/$threadId
  },
  {
    key: "stack",
    label: "Stack",
    to: "/stack",
    icon: Layers,
    matches: (p) => p.startsWith("/stack"),
  },
  {
    key: "models",
    label: "Models",
    to: "/models",
    icon: Cpu,
    matches: (p) => p.startsWith("/models"),
  },
  {
    key: "agents",
    label: "Agents",
    to: "/agents",
    icon: Bot,
    matches: (p) => p.startsWith("/agents"),
  },
  {
    key: "deploy",
    label: "Deploy",
    to: "/deploy",
    icon: Cloud,
    matches: (p) => p.startsWith("/deploy"),
  },
  {
    key: "config",
    label: "Config",
    to: "/config",
    icon: FileCog,
    matches: (p) => p.startsWith("/config"),
  },
] as const;

export function SentinelRail() {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="flex shrink-0 flex-col items-center gap-1 px-2 py-3"
      style={{
        width: 56,
        background: "var(--canvas-1)",
        borderRight: "1px solid var(--border-soft)",
      }}
    >
      {NAV.map((entry) => (
        <RailButton key={entry.key} entry={entry} active={entry.matches(pathname)} />
      ))}
    </nav>
  );
}

function RailButton({ entry, active }: { entry: NavEntry; active: boolean }) {
  const Icon = entry.icon;

  return (
    <Link
      to={entry.to}
      title={entry.label}
      aria-label={entry.label}
      aria-current={active ? "page" : undefined}
      className="flex h-10 w-10 items-center justify-center transition-colors"
      style={{
        background: active ? "var(--canvas-3)" : "transparent",
        color: active ? "var(--ember-400)" : "var(--fg-3)",
        borderRadius: 6,
        border: `1px solid ${active ? "var(--border-soft)" : "transparent"}`,
      }}
    >
      <Icon size={18} strokeWidth={1.5} />
    </Link>
  );
}

/**
 * Route-matching for layout concerns outside the rail. True when the current
 * pathname is inside the Sessions surface — where the thread sidebar belongs.
 */
export function isSessionsRoute(pathname: string): boolean {
  const entry = NAV.find((n) => n.key === "sessions");
  return entry?.matches(pathname) ?? false;
}
