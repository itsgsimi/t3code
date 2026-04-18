import { createFileRoute } from "@tanstack/react-router";

import { SentinelPlaceholder } from "../components/sentinel/SentinelPlaceholder";

function DeployRouteView() {
  return (
    <SentinelPlaceholder
      title="Deploy"
      body="Remote hosts, provisioning, and per-service deploy/undeploy. Scoped in docs/design/2026-04-18-frontend-design-brief.md §7.5."
      nextAction="`sentinel deploy up <server> <host>` · `sentinel provision <host>`"
    />
  );
}

export const Route = createFileRoute("/_chat/deploy")({
  component: DeployRouteView,
});
