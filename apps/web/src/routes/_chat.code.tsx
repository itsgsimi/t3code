import { Outlet, createFileRoute } from "@tanstack/react-router";

import ThreadSidebar from "../components/Sidebar";
import { Sidebar, SidebarProvider } from "../components/ui/sidebar";

/**
 * Sessions layout — wraps the harness session routes (index, thread detail,
 * draft) with t3code's thread sidebar. The Sentinel chrome (top bar, rail,
 * Beardy drawer) lives outside; this layout only renders inside the
 * Sessions section of the product.
 *
 * The thread sidebar uses collapsible="none" so it participates in Sentinel's
 * normal flex layout instead of position:fixed-ing itself over the rail.
 * That's what lets the Sessions surface feel integrated with the rest of the
 * app — click any rail icon and you're out, no modal-like takeover.
 */
function SessionsLayout() {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        side="left"
        collapsible="none"
        className="w-[260px] shrink-0 border-r border-border bg-card text-foreground"
      >
        <ThreadSidebar />
      </Sidebar>
      <Outlet />
    </SidebarProvider>
  );
}

export const Route = createFileRoute("/_chat/code")({
  component: SessionsLayout,
});
