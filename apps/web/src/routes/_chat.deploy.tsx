import { createFileRoute } from "@tanstack/react-router";

import { DeployView } from "../components/sentinel/DeployView";

export const Route = createFileRoute("/_chat/deploy")({
  component: DeployView,
});
