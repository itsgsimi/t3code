import { useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

import { notify, formatError } from "../components/sentinel/primitives/notify";

/**
 * Drop-in replacement for `useMutation` that surfaces errors as toasts by
 * default. Callers can override `onError` per call; the wrapper only runs
 * the default when no explicit handler is provided.
 */
export function useSentinelMutation<TData, TVars, TError = Error, TCtx = unknown>(
  options: UseMutationOptions<TData, TError, TVars, TCtx> & {
    /** Title prefix on the error toast. Defaults to "Request failed". */
    errorTitle?: string;
  },
): UseMutationResult<TData, TError, TVars, TCtx> {
  const { errorTitle, onError, ...rest } = options;
  return useMutation<TData, TError, TVars, TCtx>({
    ...rest,
    onError: onError ?? ((err) => {
      notify.error(errorTitle ?? "Request failed", formatError(err));
    }),
  });
}

import {
  applyModelMode,
  applyPreset,
  createAgent,
  createRegistryEntry,
  deleteAgentFile,
  deleteRegistryEntry,
  fetchAgentFile,
  fetchAgentsList,
  writeAgentFile,
  exportFinetuneDataset,
  synthesizeFinetuneDataset,
  startFinetuneTraining,
  fetchFinetuneTrainJob,
  fetchFinetuneTrainJobs,
  fetchRecipesList,
  fetchRecipeFile,
  writeRecipeFile,
  buildFinetuneDataset,
  registerFinetuneModel,
  promoteFinetuneModel,
  fetchCurationExamples,
  fetchCurationDecisions,
  recordCurationDecision,
  fetchBenchRuns,
  fetchConfigSection,
  setFinetuneBaseModel,
  fetchConfigSections,
  fetchDeployHosts,
  fetchActivityLog,
  fetchActivitySources,
  fetchActivityToolCalls,
  fetchBriefingEvents,
  fetchBriefingRuns,
  fetchDreamRuns,
  fetchFinetuneDatasets,
  fetchFinetuneRecipes,
  fetchFinetuneRuns,
  fetchFinetuneStatus,
  fetchEvalRuns,
  fetchTracingMetrics,
  fetchTracingTrace,
  fetchTracingTraces,
  recordTracingScore,
  fetchLlmJob,
  fetchStackJob,
  fetchSystemStats,
  fetchModelsModes,
  fetchModelsPresets,
  fetchModelsRegistry,
  fetchModelsLoaded,
  fetchModelsRoles,
  fetchSentinelAgentStatus,
  fetchSentinelAgentTools,
  fetchSentinelHealth,
  fetchSentinelSession,
  fetchSentinelSessions,
  postSentinelQuery,
  runBench,
  runEval,
  fetchEvalJob,
  fetchEvalJobs,
  fetchEvalSuites,
  fetchEvalSuite,
  writeEvalSuite,
  fetchLocalModels,
  startModelDownload,
  fetchModelDownloadJobs,
  fetchModelDownloadJob,
  cancelModelDownloadJob,
  fetchRocmTags,
  fetchRocmLocal,
  fetchRocmActive,
  fetchRocmHistory,
  startRocmPull,
  fetchRocmPullJobs,
  promoteRocmTag,
  rollbackRocm,
  swapModel,
  triggerBriefing,
  triggerDream,
  triggerLlmAction,
  triggerStackAction,
  updateConfigSection,
  updateRegistryEntry,
  type ActivityLogLevel,
  type ActivityLogResponse,
  type ActivityLogSource,
  type ActivitySourcesResponse,
  type BenchRunInput,
  type BriefingEventsResponse,
  type BriefingRunsResponse,
  type ToolCallsResponse,
  type FinetuneDataset,
  type FinetuneRecipe,
  type FinetuneRun,
  type FinetuneStatus,
  type EvalRunInput,
  type EvalJob,
  type EvalJobStartResponse,
  type EvalJobsListResponse,
  type EvalSuiteFile,
  type EvalSuiteListResponse,
  type EvalSuiteWriteResponse,
  type LocalModelListResponse,
  type ModelDownloadInput,
  type ModelDownloadJob,
  type ModelDownloadJobsResponse,
  type ModelDownloadStartResponse,
  type RocmActive,
  type RocmHistoryEntry,
  type RocmLocalImage,
  type RocmPromoteInput,
  type RocmPromoteResponse,
  type RocmPullJobsResponse,
  type RocmPullStartResponse,
  type RocmRemoteTag,
  type LlmAction,
  type LlmJob,
  type StackAction,
  type StackJob,
  type StackTier,
  type SentinelSystemStats,
  type SentinelAgentStatus,
  type SentinelAgentTools,
  type SentinelBenchRuns,
  type SentinelConfigSection,
  type SentinelConfigSections,
  type SentinelDeployHosts,
  type SentinelDreamRuns,
  type SentinelEvalRuns,
  type SentinelHealth,
  type TracingMetricsResponse,
  type TracingTraceFull,
  type TracingTracesResponse,
  type TracingScoreInput,
  type TracingScoreResult,
  type ModelModeApplyInput,
  type SentinelModesByRole,
  type SentinelModelsLoaded,
  type SentinelModelsPresets,
  type SentinelModelsRegistry,
  type SentinelModelsRoles,
  type SentinelQueryRequest,
  type SentinelSession,
  type SentinelSessionDetail,
  type AgentFileContent,
  type AgentsListResponse,
  type NewAgentInput,
  type FinetuneExportInput,
  type FinetuneExportResult,
  type FinetuneSynthesizeInput,
  type FinetuneSynthesizeResult,
  type FinetuneTrainInput,
  type FinetuneTrainStartResponse,
  type FinetuneTrainJob,
  type FinetuneTrainJobsListResponse,
  type RecipesListResponse,
  type RecipeFileContent,
  type FinetuneBuildInput,
  type FinetuneRegisterInput,
  type FinetunePromoteInput,
  type SentinelCliAck,
  type CurationExamplesResponse,
  type CurationDecisionsResponse,
  type CurationDecisionInput,
  type CurationDecisionRecord,
} from "./api";

/** Top-level health ping — refreshes every 10s. */
export function useSentinelHealth() {
  return useQuery<SentinelHealth>({
    queryKey: ["sentinel", "health"],
    queryFn: fetchSentinelHealth,
    refetchInterval: 10_000,
    retry: false,
  });
}

export function useSentinelAgentStatus() {
  return useQuery<SentinelAgentStatus>({
    queryKey: ["sentinel", "agent", "status"],
    queryFn: fetchSentinelAgentStatus,
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useSentinelAgentTools() {
  return useQuery<SentinelAgentTools>({
    queryKey: ["sentinel", "agent", "tools"],
    queryFn: fetchSentinelAgentTools,
    retry: false,
  });
}

export function useSentinelSessions(limit = 20) {
  return useQuery<SentinelSession[]>({
    queryKey: ["sentinel", "sessions", limit],
    queryFn: () => fetchSentinelSessions(limit),
    retry: false,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useSentinelSessionDetail(sessionId: string | undefined) {
  return useQuery<SentinelSessionDetail>({
    queryKey: ["sentinel", "session", sessionId],
    queryFn: () => fetchSentinelSession(sessionId as string),
    enabled: Boolean(sessionId),
    retry: false,
  });
}

export function useSentinelQueryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: SentinelQueryRequest) => postSentinelQuery(req),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "sessions"] });
    },
  });
}

export function useSentinelModelSwap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ role, registryKey }: { role: string; registryKey: string }) =>
      swapModel(role, registryKey),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "health"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "agent", "status"] });
    },
  });
}

/**
 * Fire-and-poll llm container lifecycle (up/down/restart) for a registry key.
 * Returns the active job (polled every 1.5s while running) plus a `trigger`
 * callback and `reset` to clear after viewing a terminal result.
 */
export function useLlmAction(registryKey: string | null) {
  const qc = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const job = useQuery<LlmJob>({
    queryKey: ["sentinel", "llm-job", jobId],
    queryFn: () => fetchLlmJob(jobId as string),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const data = q.state.data;
      return data && data.status !== "running" ? false : 1500;
    },
  });

  const done =
    job.data && job.data.status !== "running" ? job.data.status : null;
  useEffect(() => {
    if (done) {
      void qc.invalidateQueries({ queryKey: ["sentinel", "health"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "loaded"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "agent", "status"] });
    }
  }, [done, qc]);

  async function trigger(action: LlmAction) {
    if (!registryKey) return;
    setTriggerError(null);
    try {
      const ack = await triggerLlmAction(registryKey, action);
      setJobId(ack.job_id);
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : String(err));
    }
  }

  function reset() {
    setJobId(null);
    setTriggerError(null);
  }

  const isRunning = !!jobId && (!job.data || job.data.status === "running");

  return {
    job: job.data ?? null,
    isRunning,
    triggerError,
    trigger,
    reset,
  };
}

/**
 * Fire-and-poll stack tier lifecycle (all / llm / mcp, up/down/restart).
 * Pattern mirrors useLlmAction — ack → poll → invalidate health on terminal.
 */
export function useStackAction(tier: StackTier) {
  const qc = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const job = useQuery<StackJob>({
    queryKey: ["sentinel", "stack-job", jobId],
    queryFn: () => fetchStackJob(jobId as string),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const data = q.state.data;
      return data && data.status !== "running" ? false : 1500;
    },
  });

  const done =
    job.data && job.data.status !== "running" ? job.data.status : null;
  useEffect(() => {
    if (done) {
      void qc.invalidateQueries({ queryKey: ["sentinel", "health"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "loaded"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "agent", "status"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "system", "stats"] });
    }
  }, [done, qc]);

  async function trigger(action: StackAction) {
    setTriggerError(null);
    try {
      const ack = await triggerStackAction(tier, action);
      setJobId(ack.job_id);
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : String(err));
    }
  }

  function reset() {
    setJobId(null);
    setTriggerError(null);
  }

  const isRunning = !!jobId && (!job.data || job.data.status === "running");

  return {
    job: job.data ?? null,
    isRunning,
    triggerError,
    trigger,
    reset,
  };
}

/** GPU + CPU + memory snapshot. Polls every 10s. */
export function useSentinelSystemStats() {
  return useQuery<SentinelSystemStats>({
    queryKey: ["sentinel", "system", "stats"],
    queryFn: fetchSystemStats,
    refetchInterval: 10_000,
    retry: false,
  });
}

export function useSentinelTriggerDream() {
  return useMutation({ mutationFn: triggerDream });
}

export function useSentinelTriggerBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerBriefing,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "activity", "briefing-runs"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "activity", "briefing"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Models / roles / presets
// ---------------------------------------------------------------------------

export function useSentinelModelsRegistry() {
  return useQuery<SentinelModelsRegistry>({
    queryKey: ["sentinel", "models", "registry"],
    queryFn: fetchModelsRegistry,
    retry: false,
  });
}

export function useSentinelModelsRoles() {
  return useQuery<SentinelModelsRoles>({
    queryKey: ["sentinel", "models", "roles"],
    queryFn: fetchModelsRoles,
    refetchInterval: 20_000,
    retry: false,
  });
}

export function useSentinelModelsLoaded() {
  return useQuery<SentinelModelsLoaded>({
    queryKey: ["sentinel", "models", "loaded"],
    queryFn: fetchModelsLoaded,
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useSentinelModelsPresets() {
  return useQuery<SentinelModelsPresets>({
    queryKey: ["sentinel", "models", "presets"],
    queryFn: fetchModelsPresets,
    retry: false,
  });
}

/**
 * Fetch inference modes for every swappable role, or a single role when
 * provided. Refreshes every 15s so the dropdown reflects active_mode
 * changes that land via CLI or another client.
 */
export function useSentinelModelsModes(role?: string) {
  return useQuery<SentinelModesByRole>({
    queryKey: ["sentinel", "models", "modes", role ?? "*"],
    queryFn: () => fetchModelsModes(role),
    refetchInterval: 15_000,
    retry: false,
  });
}

/** Apply an inference mode — blocking; invalidates health/roles/modes. */
export function useSentinelApplyModelMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ModelModeApplyInput) => applyModelMode(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "modes"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "roles"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "loaded"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "health"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "agent", "status"] });
    },
  });
}

export function useApplyPreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (preset: string) => applyPreset(preset),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "health"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "agent", "status"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "roles"] });
    },
  });
}

export function useCreateRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, entry }: { key: string; entry: Record<string, unknown> }) =>
      createRegistryEntry(key, entry),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "registry"] });
    },
  });
}

export function useUpdateRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, entry }: { key: string; entry: Record<string, unknown> }) =>
      updateRegistryEntry(key, entry),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "registry"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "roles"] });
    },
  });
}

export function useDeleteRegistryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => deleteRegistryEntry(key),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "registry"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "roles"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function useSentinelConfigSections() {
  return useQuery<SentinelConfigSections>({
    queryKey: ["sentinel", "config", "sections"],
    queryFn: fetchConfigSections,
    retry: false,
  });
}

export function useSentinelConfigSection(section: string | null) {
  return useQuery<SentinelConfigSection>({
    queryKey: ["sentinel", "config", "section", section],
    queryFn: () => {
      if (!section) throw new Error("no section");
      return fetchConfigSection(section);
    },
    enabled: !!section,
    retry: false,
  });
}

/**
 * Save a config section via PATCH. On success, invalidates the section
 * query so next reads hydrate from disk.
 */
export function useUpdateConfigSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ section, value }: { section: string; value: unknown }) =>
      updateConfigSection(section, value),
    onSuccess: (data, variables) => {
      void qc.invalidateQueries({
        queryKey: ["sentinel", "config", "section", variables.section],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

export function useSentinelDeployHosts() {
  return useQuery<SentinelDeployHosts>({
    queryKey: ["sentinel", "deploy", "hosts"],
    queryFn: fetchDeployHosts,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Bench / Evals / Dream / Tracing
// ---------------------------------------------------------------------------

export function useSentinelBenchRuns(limit = 20) {
  return useQuery<SentinelBenchRuns>({
    queryKey: ["sentinel", "bench", "runs", limit],
    queryFn: () => fetchBenchRuns(limit),
    retry: false,
  });
}

export function useSentinelRunBench() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BenchRunInput) => runBench(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["sentinel", "bench", "runs"] }),
  });
}

export function useSentinelEvalRuns(limit = 20) {
  return useQuery<SentinelEvalRuns>({
    queryKey: ["sentinel", "evals", "runs", limit],
    queryFn: () => fetchEvalRuns(limit),
    retry: false,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useSentinelRunEval() {
  const qc = useQueryClient();
  return useMutation<EvalJobStartResponse, Error, EvalRunInput>({
    mutationFn: (input: EvalRunInput) => runEval(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "evals", "runs"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "evals", "jobs"] });
    },
  });
}

export function useSentinelEvalJob(jobId: string | null) {
  return useQuery<EvalJob>({
    queryKey: ["sentinel", "evals", "job", jobId],
    queryFn: () => fetchEvalJob(jobId as string),
    enabled: typeof jobId === "string" && jobId.length > 0,
    refetchInterval: (q) =>
      q.state.data?.status === "running" ? 2_000 : false,
    retry: false,
  });
}

export function useSentinelEvalJobs() {
  return useQuery<EvalJobsListResponse>({
    queryKey: ["sentinel", "evals", "jobs"],
    queryFn: fetchEvalJobs,
    refetchInterval: 5_000,
    retry: false,
  });
}

export function useSentinelEvalSuites() {
  return useQuery<EvalSuiteListResponse>({
    queryKey: ["sentinel", "evals", "suites"],
    queryFn: fetchEvalSuites,
    retry: false,
  });
}

export function useSentinelEvalSuite(name: string | null) {
  return useQuery<EvalSuiteFile>({
    queryKey: ["sentinel", "evals", "suite", name],
    queryFn: () => fetchEvalSuite(name as string),
    enabled: typeof name === "string" && name.length > 0,
    retry: false,
  });
}

export function useSentinelWriteEvalSuite() {
  const qc = useQueryClient();
  return useMutation<EvalSuiteWriteResponse, Error, { name: string; content: string }>({
    mutationFn: ({ name, content }) => writeEvalSuite(name, content),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "evals", "suites"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "evals", "suite", vars.name] });
    },
  });
}

export function useSentinelLocalModels() {
  return useQuery<LocalModelListResponse>({
    queryKey: ["sentinel", "models", "local"],
    queryFn: fetchLocalModels,
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useSentinelStartModelDownload() {
  const qc = useQueryClient();
  return useMutation<ModelDownloadStartResponse, Error, ModelDownloadInput>({
    mutationFn: (input) => startModelDownload(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "download-jobs"] });
    },
  });
}

export function useSentinelModelDownloadJobs() {
  return useQuery<ModelDownloadJobsResponse>({
    queryKey: ["sentinel", "models", "download-jobs"],
    queryFn: fetchModelDownloadJobs,
    refetchInterval: 3_000,
    retry: false,
  });
}

export function useSentinelModelDownloadJob(jobId: string | null) {
  return useQuery<ModelDownloadJob>({
    queryKey: ["sentinel", "models", "download-job", jobId],
    queryFn: () => fetchModelDownloadJob(jobId as string),
    enabled: typeof jobId === "string" && jobId.length > 0,
    refetchInterval: (q) => (q.state.data?.status === "running" ? 2_000 : false),
    retry: false,
  });
}

export function useSentinelCancelModelDownload() {
  const qc = useQueryClient();
  return useMutation<{ status: string; message: string }, Error, string>({
    mutationFn: (jobId) => cancelModelDownloadJob(jobId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "models", "download-jobs"] });
    },
  });
}

export function useSentinelDreamRuns() {
  return useQuery<SentinelDreamRuns>({
    queryKey: ["sentinel", "dream", "runs"],
    queryFn: fetchDreamRuns,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useSentinelActivityLog(opts: {
  source?: string;
  level?: ActivityLogLevel;
  contains?: string;
  limit?: number;
}) {
  return useQuery<ActivityLogResponse>({
    queryKey: [
      "sentinel",
      "activity",
      "log",
      opts.source ?? "api",
      opts.level ?? "ALL",
      opts.contains ?? "",
      opts.limit ?? 100,
    ],
    queryFn: () => fetchActivityLog(opts),
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useSentinelActivitySources() {
  return useQuery<ActivitySourcesResponse>({
    queryKey: ["sentinel", "activity", "sources"],
    queryFn: fetchActivitySources,
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useSentinelBriefingEvents(limit = 20) {
  return useQuery<BriefingEventsResponse>({
    queryKey: ["sentinel", "activity", "briefing", limit],
    queryFn: () => fetchBriefingEvents(limit),
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useSentinelBriefingRuns(limit = 10) {
  return useQuery<BriefingRunsResponse>({
    queryKey: ["sentinel", "activity", "briefing-runs", limit],
    queryFn: () => fetchBriefingRuns(limit),
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useSentinelToolCalls(limit = 20, role = "orchestrator") {
  return useQuery<ToolCallsResponse>({
    queryKey: ["sentinel", "activity", "tool-calls", role, limit],
    queryFn: () => fetchActivityToolCalls(limit, role),
    refetchInterval: 20_000,
    retry: false,
  });
}

export function useSentinelFinetuneStatus() {
  return useQuery<FinetuneStatus>({
    queryKey: ["sentinel", "finetune", "status"],
    queryFn: fetchFinetuneStatus,
    retry: false,
  });
}

export function useSetFinetuneBaseModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ baseModelId, baseModelPath }: { baseModelId: string; baseModelPath: string }) =>
      setFinetuneBaseModel({ base_model_id: baseModelId, base_model_path: baseModelPath }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "finetune", "status"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "finetune", "recipes"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "config"] });
    },
  });
}

export function useSentinelFinetuneDatasets() {
  return useQuery<{ datasets: FinetuneDataset[] }>({
    queryKey: ["sentinel", "finetune", "datasets"],
    queryFn: fetchFinetuneDatasets,
    retry: false,
  });
}

export function useSentinelFinetuneRecipes() {
  return useQuery<{ recipes: FinetuneRecipe[] }>({
    queryKey: ["sentinel", "finetune", "recipes"],
    queryFn: fetchFinetuneRecipes,
    retry: false,
  });
}

export function useSentinelFinetuneRuns() {
  return useQuery<{ runs: FinetuneRun[] }>({
    queryKey: ["sentinel", "finetune", "runs"],
    queryFn: fetchFinetuneRuns,
    retry: false,
  });
}

// ---- Local tracing --------------------------------------------------------

export function useSentinelTracingTraces(limit = 20, name?: string, sessionId?: string) {
  return useQuery<TracingTracesResponse>({
    queryKey: ["sentinel", "tracing", "traces", limit, name ?? "", sessionId ?? ""],
    queryFn: () => fetchTracingTraces(limit, name, sessionId),
    refetchInterval: 10_000,
    retry: false,
  });
}

export function useSentinelTracingTrace(id: string | null) {
  return useQuery<TracingTraceFull>({
    queryKey: ["sentinel", "tracing", "trace", id],
    queryFn: () => fetchTracingTrace(id as string),
    enabled: typeof id === "string" && id.length > 0,
    retry: false,
  });
}

export function useSentinelTracingMetrics() {
  return useQuery<TracingMetricsResponse>({
    queryKey: ["sentinel", "tracing", "metrics"],
    queryFn: fetchTracingMetrics,
    refetchInterval: 10_000,
    retry: false,
  });
}

export function useSentinelRecordTracingScore() {
  const qc = useQueryClient();
  return useMutation<TracingScoreResult, Error, TracingScoreInput>({
    mutationFn: (input) => recordTracingScore(input),
    onSuccess: (_, input) => {
      void qc.invalidateQueries({
        queryKey: ["sentinel", "tracing", "trace", input.trace_id],
      });
    },
  });
}

// ---- Agents filesystem ----------------------------------------------------

export function useSentinelAgentsList() {
  return useQuery<AgentsListResponse>({
    queryKey: ["sentinel", "agents-fs", "list"],
    queryFn: fetchAgentsList,
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useSentinelAgentFile(path: string | null) {
  return useQuery<AgentFileContent>({
    queryKey: ["sentinel", "agents-fs", "file", path],
    queryFn: () => fetchAgentFile(path as string),
    enabled: typeof path === "string" && path.length > 0,
    retry: false,
  });
}

export function useSentinelWriteAgentFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { path: string; content: string }) => writeAgentFile(args.path, args.content),
    onSuccess: (_, args) => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "agents-fs", "list"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "agents-fs", "file", args.path] });
    },
  });
}

export function useSentinelDeleteAgentFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => deleteAgentFile(path),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "agents-fs", "list"] });
    },
  });
}

export function useSentinelCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAgentInput) => createAgent(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "agents-fs", "list"] });
    },
  });
}

export function useSentinelExportFinetuneDataset() {
  const qc = useQueryClient();
  return useMutation<FinetuneExportResult, Error, FinetuneExportInput>({
    mutationFn: (input) => exportFinetuneDataset(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "finetune", "datasets"] });
    },
  });
}

export function useSentinelSynthesizeFinetuneDataset() {
  const qc = useQueryClient();
  return useMutation<FinetuneSynthesizeResult, Error, FinetuneSynthesizeInput>({
    mutationFn: (input) => synthesizeFinetuneDataset(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "finetune", "datasets"] });
    },
  });
}

// ---- Fine-tune training jobs ----------------------------------------------

export function useSentinelStartFinetuneTraining() {
  const qc = useQueryClient();
  return useMutation<FinetuneTrainStartResponse, Error, FinetuneTrainInput>({
    mutationFn: (input) => startFinetuneTraining(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "finetune", "train-jobs"] });
    },
  });
}

export function useSentinelFinetuneTrainJob(jobId: string | null) {
  return useQuery<FinetuneTrainJob>({
    queryKey: ["sentinel", "finetune", "train-job", jobId],
    queryFn: () => fetchFinetuneTrainJob(jobId as string),
    enabled: typeof jobId === "string" && jobId.length > 0,
    refetchInterval: (q) => (q.state.data?.status === "running" ? 3_000 : false),
    retry: false,
  });
}

export function useSentinelFinetuneTrainJobs() {
  return useQuery<FinetuneTrainJobsListResponse>({
    queryKey: ["sentinel", "finetune", "train-jobs"],
    queryFn: fetchFinetuneTrainJobs,
    refetchInterval: 10_000,
    retry: false,
  });
}

// ---- Recipe filesystem ----------------------------------------------------

export function useSentinelRecipesList() {
  return useQuery<RecipesListResponse>({
    queryKey: ["sentinel", "recipes-fs", "list"],
    queryFn: fetchRecipesList,
    refetchInterval: 60_000,
    retry: false,
  });
}

export function useSentinelRecipeFile(path: string | null) {
  return useQuery<RecipeFileContent>({
    queryKey: ["sentinel", "recipes-fs", "file", path],
    queryFn: () => fetchRecipeFile(path as string),
    enabled: typeof path === "string" && path.length > 0,
    retry: false,
  });
}

export function useSentinelWriteRecipeFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { path: string; content: string }) =>
      writeRecipeFile(args.path, args.content),
    onSuccess: (_, args) => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "recipes-fs", "list"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "recipes-fs", "file", args.path] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "finetune", "recipes"] });
    },
  });
}

// ---- One-click finetune actions -------------------------------------------

export function useSentinelBuildFinetuneDataset() {
  const qc = useQueryClient();
  return useMutation<SentinelCliAck, Error, FinetuneBuildInput>({
    mutationFn: (input) => buildFinetuneDataset(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "finetune", "datasets"] });
    },
  });
}

export function useSentinelRegisterFinetuneModel() {
  return useMutation<SentinelCliAck, Error, FinetuneRegisterInput>({
    mutationFn: (input) => registerFinetuneModel(input),
  });
}

export function useSentinelPromoteFinetuneModel() {
  const qc = useQueryClient();
  return useMutation<SentinelCliAck, Error, FinetunePromoteInput>({
    mutationFn: (input) => promoteFinetuneModel(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "models"] });
    },
  });
}

// ---- Curation ------------------------------------------------------------

export function useSentinelCurationExamples(
  dataset: string | null,
  offset: number,
  limit: number,
) {
  return useQuery<CurationExamplesResponse>({
    queryKey: ["sentinel", "finetune", "curation", "examples", dataset, offset, limit],
    queryFn: () => fetchCurationExamples(dataset as string, offset, limit),
    enabled: typeof dataset === "string" && dataset.length > 0,
    retry: false,
  });
}

export function useSentinelCurationDecisions(dataset: string | null) {
  return useQuery<CurationDecisionsResponse>({
    queryKey: ["sentinel", "finetune", "curation", "decisions", dataset],
    queryFn: () => fetchCurationDecisions(dataset as string),
    enabled: typeof dataset === "string" && dataset.length > 0,
    retry: false,
  });
}

export function useSentinelRecordCurationDecision() {
  const qc = useQueryClient();
  return useMutation<
    CurationDecisionRecord & { status: string },
    Error,
    CurationDecisionInput
  >({
    mutationFn: (input) => recordCurationDecision(input),
    onSuccess: (_, input) => {
      void qc.invalidateQueries({
        queryKey: ["sentinel", "finetune", "curation", "decisions", input.dataset],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// ROCm image management

export function useSentinelRocmTags(prefix: string = "rocm") {
  return useQuery<{ tags: RocmRemoteTag[] }>({
    queryKey: ["sentinel", "rocm", "tags", prefix],
    queryFn: () => fetchRocmTags(prefix),
    retry: false,
  });
}

export function useSentinelRocmLocal() {
  return useQuery<{ images: RocmLocalImage[] }>({
    queryKey: ["sentinel", "rocm", "local"],
    queryFn: fetchRocmLocal,
    refetchInterval: 10_000,
    retry: false,
  });
}

export function useSentinelRocmActive() {
  return useQuery<RocmActive>({
    queryKey: ["sentinel", "rocm", "active"],
    queryFn: fetchRocmActive,
    retry: false,
  });
}

export function useSentinelRocmHistory(limit: number = 20) {
  return useQuery<{ entries: RocmHistoryEntry[] }>({
    queryKey: ["sentinel", "rocm", "history", limit],
    queryFn: () => fetchRocmHistory(limit),
    retry: false,
  });
}

export function useSentinelRocmPullJobs() {
  return useQuery<RocmPullJobsResponse>({
    queryKey: ["sentinel", "rocm", "pull-jobs"],
    queryFn: fetchRocmPullJobs,
    refetchInterval: 3_000,
    retry: false,
  });
}

export function useSentinelStartRocmPull() {
  const qc = useQueryClient();
  return useMutation<RocmPullStartResponse, Error, string>({
    mutationFn: (tag) => startRocmPull(tag),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "rocm", "pull-jobs"] });
    },
  });
}

export function useSentinelPromoteRocm() {
  const qc = useQueryClient();
  return useMutation<RocmPromoteResponse, Error, RocmPromoteInput>({
    mutationFn: (input) => promoteRocmTag(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "rocm", "active"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "rocm", "history"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "rocm", "local"] });
    },
  });
}

export function useSentinelRollbackRocm() {
  const qc = useQueryClient();
  return useMutation<{ status: string; active?: RocmActive }, Error, void>({
    mutationFn: () => rollbackRocm(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sentinel", "rocm", "active"] });
      void qc.invalidateQueries({ queryKey: ["sentinel", "rocm", "history"] });
    },
  });
}
