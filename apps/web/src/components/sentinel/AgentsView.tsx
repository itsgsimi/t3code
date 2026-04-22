import { Suspense, lazy, useState, type CSSProperties } from "react";

import { useSentinelEvalRuns } from "../../sentinel/hooks";
import { PageCrumb, PageHeader, Tabs, type TabOption } from "./shared";

const EvalsTab = lazy(() =>
  import("./agents/evals/EvalsTab").then((m) => ({ default: m.EvalsTab })),
);
const DreamTab = lazy(() =>
  import("./agents/dream/DreamTab").then((m) => ({ default: m.DreamTab })),
);
const DiagnosticsTab = lazy(() =>
  import("./agents/diagnostics/DiagnosticsTab").then((m) => ({
    default: m.DiagnosticsTab,
  })),
);
const SessionsTab = lazy(() =>
  import("./agents/sessions/SessionsTab").then((m) => ({
    default: m.SessionsTab,
  })),
);
const FineTuneTab = lazy(() =>
  import("./agents/finetune/FineTuneTab").then((m) => ({
    default: m.FineTuneTab,
  })),
);
const CurateTab = lazy(() =>
  import("./agents/curate/CurateTab").then((m) => ({ default: m.CurateTab })),
);
const AgentFilesTab = lazy(() =>
  import("./agents/files/AgentFilesTab").then((m) => ({
    default: m.AgentFilesTab,
  })),
);
const TracingTab = lazy(() =>
  import("./agents/tracing/TracingTab").then((m) => ({
    default: m.TracingTab,
  })),
);

type TabKey =
  | "evals"
  | "files"
  | "tracing"
  | "dream"
  | "diagnostics"
  | "sessions"
  | "curate"
  | "finetune";

const pageStyle: CSSProperties = {
  padding: "24px 28px 60px",
  maxWidth: 1200,
  margin: "0 auto",
};

function TabFallback() {
  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 20,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--fg-3)",
      }}
    >
      Loading…
    </div>
  );
}

/**
 * Agents — evals, dream, sessions browser, fine-tune, curate, files,
 * tracing. Wired to:
 *   /v1/evals/runs + /v1/evals/run
 *   /v1/dream/runs + /v1/admin/trigger-dream
 *   /v1/tracing/traces + /v1/tracing/trace/{id}
 *   /v1/finetune/* for the fine-tune + curate + files tabs
 * Historical sessions surface via /v1/sessions.
 */
export function AgentsView() {
  const [tab, setTab] = useState<TabKey>("evals");
  const evalRuns = useSentinelEvalRuns(30);

  return (
    <div className="min-w-0 flex-1 overflow-auto">
      <div style={pageStyle}>
        <PageCrumb>Sentinel / Agents</PageCrumb>
        <PageHeader
          title="Agents"
          chip={{
            state: "healthy",
            text: `${evalRuns.data?.runs.length ?? 0} eval runs tracked`,
          }}
          subtitle="Evals, nightly dream, session history, diagnostics, tracing, and fine-tuning pipeline."
        />

        <Tabs
          value={tab}
          onChange={(v) => setTab(v as TabKey)}
          options={
            [
              { key: "evals", label: "Evals", count: evalRuns.data?.runs.length ?? 0 },
              { key: "dream", label: "Dream" },
              { key: "diagnostics", label: "Diagnostics" },
              { key: "sessions", label: "Sessions" },
              { key: "finetune", label: "Fine-tune" },
              { key: "curate", label: "Curate" },
              { key: "files", label: "Files" },
              { key: "tracing", label: "Tracing" },
            ] satisfies TabOption[]
          }
        />

        <Suspense fallback={<TabFallback />}>
          {tab === "evals" ? <EvalsTab /> : null}
          {tab === "dream" ? <DreamTab /> : null}
          {tab === "diagnostics" ? <DiagnosticsTab /> : null}
          {tab === "sessions" ? <SessionsTab /> : null}
          {tab === "finetune" ? <FineTuneTab /> : null}
          {tab === "curate" ? <CurateTab /> : null}
          {tab === "files" ? <AgentFilesTab /> : null}
          {tab === "tracing" ? <TracingTab /> : null}
        </Suspense>
      </div>
    </div>
  );
}
