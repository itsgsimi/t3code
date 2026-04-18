import { createFileRoute } from "@tanstack/react-router";

import { ModelsView } from "../components/sentinel/ModelsView";

export const Route = createFileRoute("/_chat/models")({
  component: ModelsView,
});
