import { createFileRoute } from "@tanstack/react-router";

import { AgentsView } from "../components/sentinel/AgentsView";

export const Route = createFileRoute("/_chat/agents")({
  component: AgentsView,
});
