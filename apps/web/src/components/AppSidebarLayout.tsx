import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { SentinelTopBar } from "./sentinel/SentinelTopBar";
import { SentinelRail, isSessionsRoute } from "./sentinel/SentinelRail";
import { BeardyDrawer } from "./sentinel/BeardyDrawer";
import { useBeardyDrawerStore } from "../sentinel/beardyDrawerStore";

/**
 * Sentinel app shell. The thread sidebar is intentionally NOT at this level
 * any more — it lives inside the Sessions route layout
 * (`routes/_chat._sessions.tsx`). Home, Stack, Agents, etc. render straight
 * into the outlet without a contextual sidebar.
 */
export function AppSidebarLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const setAutoCollapsed = useBeardyDrawerStore((state) => state.setAutoCollapsed);

  useEffect(() => {
    const onMenuAction = window.desktopBridge?.onMenuAction;
    if (typeof onMenuAction !== "function") {
      return;
    }

    const unsubscribe = onMenuAction((action) => {
      if (action !== "open-settings") return;
      void navigate({ to: "/settings" });
    });

    return () => {
      unsubscribe?.();
    };
  }, [navigate]);

  // Sessions is visually dense — auto-collapse Beardy when entering, auto-
  // restore on leaving (unless the user explicitly toggled while inside).
  useEffect(() => {
    setAutoCollapsed(isSessionsRoute(pathname));
  }, [pathname, setAutoCollapsed]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <SentinelTopBar />
      <div className="flex min-h-0 flex-1">
        <SentinelRail />
        <div className="flex min-w-0 flex-1">{children}</div>
        <BeardyDrawer />
      </div>
    </div>
  );
}
