import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  fetchSentinelAgentStatus,
  fetchSentinelAgentTools,
  fetchSentinelHealth,
  fetchSentinelSessions,
  postSentinelQuery,
  swapModel,
  triggerBriefing,
  triggerDream,
  type SentinelAgentStatus,
  type SentinelHealth,
  type SentinelQueryRequest,
  type SentinelSession,
  type SentinelToolGroup,
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
  return useQuery<SentinelToolGroup[]>({
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
