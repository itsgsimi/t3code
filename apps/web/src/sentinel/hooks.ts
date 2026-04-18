import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  applyPreset,
  createRegistryEntry,
  deleteRegistryEntry,
  fetchBenchRuns,
  fetchConfigSection,
  fetchConfigSections,
  fetchDeployHosts,
  fetchDreamRuns,
  fetchEvalRuns,
  fetchLangfuseStatus,
  fetchModelsPresets,
  fetchModelsRegistry,
  fetchModelsLoaded,
  fetchModelsRoles,
  fetchSentinelAgentStatus,
  fetchSentinelAgentTools,
  fetchSentinelHealth,
  fetchSentinelSessions,
  postSentinelQuery,
  runBench,
  runEval,
  swapModel,
  syncLangfusePrompts,
  triggerBriefing,
  triggerDream,
  updateRegistryEntry,
  type BenchRunInput,
  type EvalRunInput,
  type SentinelAgentStatus,
  type SentinelAgentTools,
  type SentinelBenchRuns,
  type SentinelConfigSection,
  type SentinelConfigSections,
  type SentinelDeployHosts,
  type SentinelDreamRuns,
  type SentinelEvalRuns,
  type SentinelHealth,
  type SentinelLangfuseStatus,
  type SentinelModelsLoaded,
  type SentinelModelsPresets,
  type SentinelModelsRegistry,
  type SentinelModelsRoles,
  type SentinelQueryRequest,
  type SentinelSession,
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

export function useSentinelTriggerDream() {
  return useMutation({ mutationFn: triggerDream });
}

export function useSentinelTriggerBriefing() {
  return useMutation({ mutationFn: triggerBriefing });
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
// Bench / Evals / Dream / Langfuse
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
  });
}

export function useSentinelRunEval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EvalRunInput) => runEval(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["sentinel", "evals", "runs"] }),
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

export function useSentinelLangfuseStatus() {
  return useQuery<SentinelLangfuseStatus>({
    queryKey: ["sentinel", "langfuse", "status"],
    queryFn: fetchLangfuseStatus,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useSentinelSyncLangfuse() {
  return useMutation({ mutationFn: syncLangfusePrompts });
}
