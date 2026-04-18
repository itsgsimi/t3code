import { createFileRoute } from "@tanstack/react-router";

import { SentinelPlaceholder } from "../components/sentinel/SentinelPlaceholder";

function HomeRouteView() {
  return (
    <SentinelPlaceholder
      title="Home"
      body="Morning briefing, stack health strip, recent activity. Phase 4 of the implementation plan — coming next."
    />
  );
}

export const Route = createFileRoute("/_chat/home")({
  component: HomeRouteView,
});
