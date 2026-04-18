import { createFileRoute } from "@tanstack/react-router";

import { SentinelPlaceholder } from "../components/sentinel/SentinelPlaceholder";

function ConfigRouteView() {
  return (
    <SentinelPlaceholder
      title="Config"
      body="Read-only view (v1) of config/config.yaml — model_registry, mcp_servers, agents, toolsets, sessions. Editor is deferred to v2. Scoped in docs/design/2026-04-18-frontend-design-brief.md §7.6."
      nextAction="Edit `config/config.yaml` directly for now."
    />
  );
}

export const Route = createFileRoute("/_chat/config")({
  component: ConfigRouteView,
});
