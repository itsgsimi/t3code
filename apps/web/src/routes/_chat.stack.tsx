import { createFileRoute } from "@tanstack/react-router";

import { StackView } from "../components/sentinel/StackView";

export const Route = createFileRoute("/_chat/stack")({
  component: StackView,
});
