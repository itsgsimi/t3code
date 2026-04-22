import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Root of the authenticated app. Redirects to the Sentinel Home dashboard —
 * t3code's session workbench lives under /code, not at /.
 */
export const Route = createFileRoute("/_chat/")({
  beforeLoad: () => {
    throw redirect({ to: "/home", replace: true });
  },
});
