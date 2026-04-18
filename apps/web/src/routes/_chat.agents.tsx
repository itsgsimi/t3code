import { createFileRoute } from "@tanstack/react-router";

import { SentinelPlaceholder } from "../components/sentinel/SentinelPlaceholder";

function AgentsRouteView() {
  return (
    <SentinelPlaceholder
      title="Agents"
      body="Evals, dream runs, sessions browser, fine-tuning, and Langfuse traces. Scoped in docs/design/2026-04-18-frontend-design-brief.md §7.4."
      nextAction="`sentinel eval run --grounding` · `sentinel dream run` · `sentinel agent tools`"
    />
  );
}

export const Route = createFileRoute("/_chat/agents")({
  component: AgentsRouteView,
});
