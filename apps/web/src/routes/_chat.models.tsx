import { createFileRoute } from "@tanstack/react-router";

import { SentinelPlaceholder } from "../components/sentinel/SentinelPlaceholder";

function ModelsRouteView() {
  return (
    <SentinelPlaceholder
      title="Models"
      body="Registry, roles, swap presets, and bench runs live here. The surface wasn't built in the first design pass — the screens are scoped in docs/design/2026-04-18-frontend-design-brief.md §7.3."
      nextAction="`sentinel model roles` · `sentinel model swap <role> <id>`"
    />
  );
}

export const Route = createFileRoute("/_chat/models")({
  component: ModelsRouteView,
});
