import { createFileRoute } from "@tanstack/react-router";

import { ConfigView } from "../components/sentinel/ConfigView";

export const Route = createFileRoute("/_chat/config")({
  component: ConfigView,
});
