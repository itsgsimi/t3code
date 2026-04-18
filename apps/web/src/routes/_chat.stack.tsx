import { createFileRoute } from "@tanstack/react-router";

import { SentinelPlaceholder } from "../components/sentinel/SentinelPlaceholder";

function StackRouteView() {
  return (
    <SentinelPlaceholder
      title="Stack"
      body="LLM containers, MCP servers, API, logs, doctor. Phase 5 of the implementation plan — coming next."
    />
  );
}

export const Route = createFileRoute("/_chat/stack")({
  component: StackRouteView,
});
