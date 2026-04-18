import { Outlet, createFileRoute } from "@tanstack/react-router";

import ThreadSidebar from "../components/Sidebar";
import { Sidebar, SidebarProvider, SidebarRail } from "../components/ui/sidebar";

const THREAD_SIDEBAR_WIDTH_STORAGE_KEY = "chat_thread_sidebar_width";
const THREAD_SIDEBAR_MIN_WIDTH = 13 * 16;
const THREAD_MAIN_CONTENT_MIN_WIDTH = 40 * 16;

/**
 * Sessions layout — wraps the harness session routes (index, thread detail,
 * draft) with t3code's thread sidebar. The Sentinel chrome (top bar, rail,
 * Beardy drawer) lives outside; this layout only renders inside the
 * Sessions section of the product.
 */
function SessionsLayout() {
  return (
    <SidebarProvider defaultOpen>
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
      <Outlet />
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/_chat/sessions")({
  component: SessionsLayout,
});
