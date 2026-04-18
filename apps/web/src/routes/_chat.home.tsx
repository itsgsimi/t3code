import { createFileRoute } from "@tanstack/react-router";

import { HomeView } from "../components/sentinel/HomeView";

export const Route = createFileRoute("/_chat/home")({
  component: HomeView,
});
