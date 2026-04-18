import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import ThreadSidebar from "./Sidebar";
import { Sidebar, SidebarProvider, SidebarRail } from "./ui/sidebar";
import { SentinelTopBar } from "./sentinel/SentinelTopBar";
import { SentinelRail, isSessionsRoute } from "./sentinel/SentinelRail";
import { BeardyDrawer } from "./sentinel/BeardyDrawer";
import { useBeardyDrawerStore } from "../sentinel/beardyDrawerStore";

const THREAD_SIDEBAR_WIDTH_STORAGE_KEY = "chat_thread_sidebar_width";
const THREAD_SIDEBAR_MIN_WIDTH = 13 * 16;
const THREAD_MAIN_CONTENT_MIN_WIDTH = 40 * 16;

export function AppSidebarLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const showThreadSidebar = isSessionsRoute(pathname);
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

  // Sessions is dense — auto-collapse Beardy when entering, auto-restore when
  // leaving (unless the user explicitly toggled while in Sessions). Matches
  // the design brief's "two surfaces, two voices" rule.
  useEffect(() => {
    setAutoCollapsed(showThreadSidebar);
  }, [showThreadSidebar, setAutoCollapsed]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <SentinelTopBar />
      <div className="flex min-h-0 flex-1">
        <SentinelRail />
        <SidebarProvider defaultOpen>
          {showThreadSidebar ? (
            <Sidebar
              side="left"
              collapsible="offcanvas"
              className="border-r border-border bg-card text-foreground"
              resizable={{
                minWidth: THREAD_SIDEBAR_MIN_WIDTH,
                shouldAcceptWidth: ({ nextWidth, wrapper }) =>
                  wrapper.clientWidth - nextWidth >= THREAD_MAIN_CONTENT_MIN_WIDTH,
                storageKey: THREAD_SIDEBAR_WIDTH_STORAGE_KEY,
              }}
            >
              <ThreadSidebar />
              <SidebarRail />
            </Sidebar>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </SidebarProvider>
        <BeardyDrawer />
      </div>
    </div>
  );
}
