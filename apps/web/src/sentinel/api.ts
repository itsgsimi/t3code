/**
 * Typed client for Sentinel's FastAPI surface.
 *
 * Base URL is configurable via VITE_SENTINEL_API_URL (falls back to
 * http://localhost:6967, the default api_server.port from config.yaml).
 * The Sentinel API enables CORS for localhost origins so the web app can
 * hit it directly from a Vite dev server.
 */

const DEFAULT_BASE = "http://localhost:6967";
const BASE_URL: string = import.meta.env.VITE_SENTINEL_API_URL ?? DEFAULT_BASE;

/** Thrown when the Sentinel API is unreachable or returns a non-2xx. */
export class SentinelApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SentinelApiError";
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch (err) {
    throw new SentinelApiError(err instanceof Error ? err.message : "Sentinel API unreachable");
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new SentinelApiError(
      `${path} → ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch (err) {
    throw new SentinelApiError(err instanceof Error ? err.message : "Sentinel API unreachable");
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new SentinelApiError(
      `${path} → ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch (err) {
    throw new SentinelApiError(err instanceof Error ? err.message : "Sentinel API unreachable");
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new SentinelApiError(
      `${path} → ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Types — keep in sync with src/sentinel/api/server.py response models.
// ---------------------------------------------------------------------------

export interface SentinelHealth {
  status: string;
  mcp_persistence: boolean;
  model_provider?: string;
  model_name?: string;
  context_length?: number;
}

export interface SentinelModelInfo {
  name: string;
  provider: string;
  base_url: string;
}

export interface SentinelAgentStatus {
  model: SentinelModelInfo;
  tool_count: number;
  toolset_count: number;
  skill_count: number;
  mcp_servers: Record<string, boolean>;
}

/**
 * Response shape of `/v1/agent/tools` — matches runtime.get_agent_tools().
 * servers: map of MCP server name → list of tool names exposed by that server.
 * toolsets: map of toolset name → list of tools in that toolset.
 */
export interface SentinelAgentTools {
  servers: Record<string, string[]>;
  toolsets: Record<string, string[]>;
}

export interface SentinelSkill {
  name: string;
  description: string;
  path?: string;
  triggers?: string[];
}

export interface SentinelAgentSkills {
  skills: SentinelSkill[];
  injection_enabled: boolean;
}

export interface SentinelSession {
  session_id: string;
  message_count: number;
  started_at?: string;
  last_activity?: string;
  topic_preview?: string;
}

export interface SentinelSessionDetail extends SentinelSession {
  topic?: string;
  recent_messages?: Array<{ role: string; content: string; timestamp?: string }>;
}

export interface SentinelQueryRequest {
  query: string;
  session_id?: string;
  user_id?: string;
}

export interface SentinelQueryResponse {
  response: string;
  session_id: string;
  trace_id?: string;
}

export interface SentinelAdminAck {
  status: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

export function fetchSentinelHealth(): Promise<SentinelHealth> {
  return get<SentinelHealth>("/v1/health");
}

export function fetchSentinelAgentStatus(): Promise<SentinelAgentStatus> {
  return get<SentinelAgentStatus>("/v1/agent/status");
}

export function fetchSentinelAgentTools(): Promise<SentinelAgentTools> {
  return get<SentinelAgentTools>("/v1/agent/tools");
}

export function fetchSentinelAgentSkills(): Promise<SentinelAgentSkills> {
  return get<SentinelAgentSkills>("/v1/agent/skills");
}

export function fetchSentinelSessions(limit = 20): Promise<SentinelSession[]> {
  return get<SentinelSession[]>(`/v1/sessions?limit=${limit}`);
}

export function fetchSentinelSession(sessionId: string): Promise<SentinelSessionDetail> {
  return get<SentinelSessionDetail>(`/v1/sessions/${encodeURIComponent(sessionId)}`);
}

export interface FinetuneBaseModelInput {
  base_model_id: string;
  base_model_path: string;
}

export interface FinetuneBaseModelResponse {
  status: string;
  family: string;
  applied_defaults: Record<string, unknown>;
  section: string;
  value: unknown;
}

export function setFinetuneBaseModel(
  input: FinetuneBaseModelInput,
): Promise<FinetuneBaseModelResponse> {
  return post<FinetuneBaseModelResponse>("/v1/finetune/base-model", input);
}

export function postSentinelQuery(req: SentinelQueryRequest): Promise<SentinelQueryResponse> {
  return post<SentinelQueryResponse>("/v1/query", req);
}

export function postSentinelFeedback(
  traceId: string,
  score: number,
  comment?: string,
): Promise<{ status: string }> {
  return post("/v1/feedback", { trace_id: traceId, score, comment });
}

export function triggerDream(): Promise<SentinelAdminAck> {
  return post<SentinelAdminAck>("/v1/admin/trigger-dream");
}

export function triggerBriefing(): Promise<SentinelAdminAck> {
  return post<SentinelAdminAck>("/v1/admin/trigger-briefing");
}

/**
 * CLI-backed model swap. Wraps `sentinel model swap <role> <registry_key>`.
 * The backend endpoint is added in src/sentinel/api/server.py as part of the
 * web-frontend wiring pass. Not available on stock Sentinel < 2026-04-18.
 */
export function swapModel(role: string, registryKey: string): Promise<SentinelAdminAck> {
  return post<SentinelAdminAck>("/v1/admin/model-swap", {
    role,
    registry_key: registryKey,
  });
}

// ---------------------------------------------------------------------------
// Models / roles / presets
// ---------------------------------------------------------------------------

export interface SentinelRegistryEntry {
  name?: string;
  file?: string;
  port?: number;
  context_length?: number;
  provider?: string;
  gpu_layers?: number;
  no_mmap?: boolean;
  [key: string]: unknown;
}

export interface SentinelModelsRegistry {
  models: Record<string, SentinelRegistryEntry>;
}

export interface SentinelRole {
  role: string;
  default: string | null;
  registry_key: string | null;
  overridden: boolean;
  port: number | null;
  context_length: number | null;
}

export interface SentinelModelsRoles {
  roles: SentinelRole[];
}

export interface SentinelModelsPresets {
  presets: Record<string, Record<string, string>>;
}

export function fetchModelsRegistry(): Promise<SentinelModelsRegistry> {
  return get<SentinelModelsRegistry>("/v1/models/registry");
}

export interface RegistryCrudAck {
  status: string;
  key?: string;
  entry?: Record<string, unknown>;
  message?: string;
}

export function createRegistryEntry(
  key: string,
  entry: Record<string, unknown>,
): Promise<RegistryCrudAck> {
  return post<RegistryCrudAck>("/v1/models/registry", { key, entry });
}

export async function updateRegistryEntry(
  key: string,
  entry: Record<string, unknown>,
): Promise<RegistryCrudAck> {
  const res = await fetch(`${BASE_URL}/v1/models/registry/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entry }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SentinelApiError(
      `PATCH /v1/models/registry/${key} → ${res.status} ${res.statusText} ${text}`,
      res.status,
    );
  }
  return (await res.json()) as RegistryCrudAck;
}

export async function deleteRegistryEntry(key: string): Promise<RegistryCrudAck> {
  const res = await fetch(`${BASE_URL}/v1/models/registry/${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SentinelApiError(
      `DELETE /v1/models/registry/${key} → ${res.status} ${res.statusText} ${text}`,
      res.status,
    );
  }
  return (await res.json()) as RegistryCrudAck;
}
export function fetchModelsRoles(): Promise<SentinelModelsRoles> {
  return get<SentinelModelsRoles>("/v1/models/roles");
}
export function fetchModelsLoaded(): Promise<SentinelModelsLoaded> {
  return get<SentinelModelsLoaded>("/v1/models/loaded");
}

export interface SentinelLoadedRole {
  role: string;
  port: number | null;
  configured_registry_key: string | null;
  configured_model_name: string | null;
  configured_model_file: string | null;
  healthy: boolean;
  loaded_model: string | null;
  detail: string | null;
}
export interface SentinelModelsLoaded {
  roles: SentinelLoadedRole[];
}
export function fetchModelsPresets(): Promise<SentinelModelsPresets> {
  return get<SentinelModelsPresets>("/v1/models/presets");
}
export function applyPreset(preset: string): Promise<SentinelCliAck> {
  return post<SentinelCliAck>("/v1/models/presets/apply", { preset });
}

// ---------------------------------------------------------------------------
// Inference modes — named sampler+template bundles per model
// ---------------------------------------------------------------------------

/** Single inference mode definition attached to a ModelConfig. */
export interface SentinelModeConfig {
  description?: string;
  chat_template_kwargs?: string;
  reasoning_format?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  min_p?: number;
  repeat_penalty?: number;
  presence_penalty?: number;
}

/** Response shape for GET /v1/models/modes (one entry per role). */
export interface SentinelRoleModes {
  model_id: string | null;
  model_name: string | null;
  active_mode: string | null;
  default_mode: string | null;
  modes: Record<string, SentinelModeConfig>;
}

/** Map of role name -> modes info. */
export type SentinelModesByRole = Record<string, SentinelRoleModes>;

export function fetchModelsModes(role?: string): Promise<SentinelModesByRole> {
  const path = role
    ? `/v1/models/modes?role=${encodeURIComponent(role)}`
    : "/v1/models/modes";
  return get<SentinelModesByRole>(path);
}

export interface ModelModeApplyInput {
  role: string;
  /** Mode name, or 'default'/'reset'/'clear'/'none' to drop the override. */
  mode: string;
}

/** POST /v1/models/modes/apply — blocking subprocess; may take 30-60s. */
export function applyModelMode(
  input: ModelModeApplyInput,
): Promise<SentinelCliAck> {
  return post<SentinelCliAck>("/v1/models/modes/apply", input);
}

// ---------------------------------------------------------------------------
// Async llm container lifecycle
// ---------------------------------------------------------------------------

export type LlmAction = "up" | "down" | "restart";
export type LlmJobStatus = "running" | "ok" | "error";

export interface LlmJobAck {
  job_id: string;
  status: LlmJobStatus;
  registry_key: string;
  action: LlmAction;
}

export interface LlmJob {
  job_id: string;
  action: LlmAction;
  registry_key: string;
  status: LlmJobStatus;
  started_at: string;
  finished_at: string | null;
  returncode: number | null;
  stdout: string;
  stderr: string;
  message: string | null;
}

export function triggerLlmAction(
  registryKey: string,
  action: LlmAction,
): Promise<LlmJobAck> {
  return post<LlmJobAck>(
    `/v1/admin/llm/${encodeURIComponent(registryKey)}/${action}`,
  );
}

export function fetchLlmJob(jobId: string): Promise<LlmJob> {
  return get<LlmJob>(`/v1/admin/llm/jobs/${encodeURIComponent(jobId)}`);
}

// ---------------------------------------------------------------------------
// Stack tier lifecycle (whole-stack, llm tier, mcp tier)
// ---------------------------------------------------------------------------

export type StackTier = "all" | "llm" | "mcp" | "finetune";
export type StackAction = "up" | "down" | "restart";

export interface StackJobAck {
  job_id: string;
  status: LlmJobStatus;
  tier: StackTier;
  action: StackAction;
}

export interface StackJob {
  job_id: string;
  tier: StackTier;
  action: StackAction;
  status: LlmJobStatus;
  started_at: string;
  finished_at: string | null;
  returncode: number | null;
  stdout: string;
  stderr: string;
  message: string | null;
}

export function triggerStackAction(
  tier: StackTier,
  action: StackAction,
): Promise<StackJobAck> {
  return post<StackJobAck>(`/v1/admin/stack/${tier}/${action}`);
}

export function fetchStackJob(jobId: string): Promise<StackJob> {
  return get<StackJob>(`/v1/admin/stack/jobs/${encodeURIComponent(jobId)}`);
}

// ---------------------------------------------------------------------------
// System stats (GPU + CPU + memory)
// ---------------------------------------------------------------------------

export interface SentinelSystemStats {
  gpu_use_pct: number | null;
  gpu_temp_c: number | null;
  gpu_power_w: number | null;
  gpu_fan_pct: number | null;
  memory_total_gb: number | null;
  memory_used_gb: number | null;
  cpu_load_1m: number | null;
  cpu_load_5m: number | null;
  cpu_load_15m: number | null;
  cpu_count: number | null;
  rocm_smi_available: boolean;
  amdgpu_top_available: boolean;
  gfx_activity_pct: number | null;
  fdinfo_gfx_pct: number | null;
  fdinfo_compute_pct: number | null;
  fdinfo_media_pct: number | null;
  vram_used_mib: number | null;
  vram_total_mib: number | null;
  gtt_used_mib: number | null;
  gtt_total_mib: number | null;
  sclk_mhz: number | null;
  mclk_mhz: number | null;
  fclk_mhz: number | null;
  socket_power_w: number | null;
  updated_at: string;
}

export function fetchSystemStats(): Promise<SentinelSystemStats> {
  return get<SentinelSystemStats>("/v1/system/stats");
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface SentinelConfigSections {
  sections: string[];
}

export interface SentinelConfigSection {
  section: string;
  value: unknown;
}

export function fetchConfigSections(): Promise<SentinelConfigSections> {
  return get<SentinelConfigSections>("/v1/config/sections");
}
export async function updateConfigSection(
  section: string,
  value: unknown,
): Promise<SentinelConfigSection> {
  const res = await fetch(
    `${BASE_URL}/v1/config/${encodeURIComponent(section)}`,
    {
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SentinelApiError(
      `PATCH /v1/config/${section} → ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
      res.status,
    );
  }
  return (await res.json()) as SentinelConfigSection;
}
export function fetchConfigSection(section: string): Promise<SentinelConfigSection> {
  return get<SentinelConfigSection>(`/v1/config/${encodeURIComponent(section)}`);
}

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

export interface SentinelDeployHost {
  alias: string;
  host: string;
}

export interface SentinelDeployHosts {
  hosts: SentinelDeployHost[];
}

export function fetchDeployHosts(): Promise<SentinelDeployHosts> {
  return get<SentinelDeployHosts>("/v1/deploy/hosts");
}

// ---------------------------------------------------------------------------
// Bench
// ---------------------------------------------------------------------------

export interface SentinelBenchRun {
  run_id?: string;
  label?: string;
  model_file?: string;
  port?: number;
  passes: number;
  tg_tok_s_mean?: number;
  pp_tok_s_mean?: number;
  thinking: boolean;
  file: string;
  mtime: string;
}

export interface SentinelBenchRuns {
  runs: SentinelBenchRun[];
}

export interface BenchRunInput {
  passes?: number;
  label?: string;
  port?: number;
}

export interface LocalModelEntry {
  name: string;
  path: string;
  kind: "gguf" | "hf-dir" | "meta" | "file";
  size: number;
  mtime: string;
}

export interface LocalModelListResponse {
  root: string;
  entries: LocalModelEntry[];
}

export type ModelDownloadMode = "url" | "hf";

export interface ModelDownloadInput {
  mode: ModelDownloadMode;
  url?: string;
  repo?: string;
  filename?: string;
  dest_name?: string;
}

export interface ModelDownloadStartResponse {
  job_id: string;
  status: "running";
  mode: ModelDownloadMode;
  source: string;
  dest: string;
  pid: number;
}

export type ModelDownloadStatus = "running" | "ok" | "error";

export interface ModelDownloadJob {
  job_id: string;
  mode: ModelDownloadMode;
  source: string;
  dest: string;
  dest_exists: boolean;
  bytes_downloaded: number;
  pid: number | null;
  started_at: string | null;
  finished_at: string | null;
  returncode: number | null;
  status: ModelDownloadStatus;
  message: string | null;
  log_tail: string;
}

export interface ModelDownloadJobsResponse {
  active_job_ids: string[];
  jobs: Array<Omit<ModelDownloadJob, "log_tail">>;
}

export function fetchLocalModels(): Promise<LocalModelListResponse> {
  return get<LocalModelListResponse>("/v1/models/local");
}

export function startModelDownload(
  payload: ModelDownloadInput,
): Promise<ModelDownloadStartResponse> {
  return post<ModelDownloadStartResponse>("/v1/models/download", payload);
}

export function fetchModelDownloadJobs(): Promise<ModelDownloadJobsResponse> {
  return get<ModelDownloadJobsResponse>("/v1/models/download-jobs");
}

export function fetchModelDownloadJob(jobId: string): Promise<ModelDownloadJob> {
  return get<ModelDownloadJob>(`/v1/models/download-jobs/${encodeURIComponent(jobId)}`);
}

export function cancelModelDownloadJob(jobId: string): Promise<{ status: string; message: string }> {
  return post<{ status: string; message: string }>(
    `/v1/models/download-jobs/${encodeURIComponent(jobId)}/cancel`,
  );
}

// ---------------------------------------------------------------------------
// ROCm image management

export interface RocmRemoteTag {
  tag: string;
  last_updated: string | null;
  full_size: number;
  digest: string | null;
}

export interface RocmLocalImage {
  tag: string;
  size: string;
  created: string;
  id: string;
}

export interface RocmActive {
  image: string;
  tag: string;
  source: "env" | "compose_default";
  previous: string | null;
}

export interface RocmHistoryEntry {
  ts: string;
  event: "promote" | "rollback" | "promote_failed";
  tag?: string;
  image?: string;
  previous?: string;
  smoke?: { passed: boolean; metrics?: Record<string, unknown>; log_tail?: string } | null;
  rolled_back?: boolean;
  reason?: string;
}

export interface RocmPullJob {
  job_id: string;
  tag: string;
  image: string;
  pid: number | null;
  started_at: string | null;
  finished_at: string | null;
  returncode: number | null;
  status: "running" | "ok" | "error";
  message: string | null;
  log_tail: string;
}

export interface RocmPullJobsResponse {
  active_job_ids: string[];
  jobs: Array<Omit<RocmPullJob, "log_tail">>;
}

export interface RocmPullStartResponse {
  job_id: string;
  status: "running";
  tag: string;
  image: string;
  pid: number;
}

export interface RocmPromoteInput {
  tag: string;
  smoke?: boolean;
  auto_rollback?: boolean;
}

export interface RocmPromoteResponse {
  status: "ok" | "rolled_back" | "noop";
  active?: RocmActive;
  smoke?: { passed: boolean; metrics?: Record<string, unknown>; log_tail?: string } | null;
  previous?: string;
  message?: string;
}

export function fetchRocmTags(prefix = "rocm"): Promise<{ tags: RocmRemoteTag[] }> {
  return get(`/v1/rocm/tags?prefix=${encodeURIComponent(prefix)}`);
}

export function fetchRocmLocal(): Promise<{ images: RocmLocalImage[] }> {
  return get("/v1/rocm/local");
}

export function fetchRocmActive(): Promise<RocmActive> {
  return get<RocmActive>("/v1/rocm/active");
}

export function fetchRocmHistory(limit = 20): Promise<{ entries: RocmHistoryEntry[] }> {
  return get(`/v1/rocm/history?limit=${limit}`);
}

export function startRocmPull(tag: string): Promise<RocmPullStartResponse> {
  return post<RocmPullStartResponse>("/v1/rocm/pull", { tag });
}

export function fetchRocmPullJobs(): Promise<RocmPullJobsResponse> {
  return get<RocmPullJobsResponse>("/v1/rocm/pull-jobs");
}

export function fetchRocmPullJob(jobId: string): Promise<RocmPullJob> {
  return get<RocmPullJob>(`/v1/rocm/pull-jobs/${encodeURIComponent(jobId)}`);
}

export function promoteRocmTag(payload: RocmPromoteInput): Promise<RocmPromoteResponse> {
  return post<RocmPromoteResponse>("/v1/rocm/promote", payload);
}

export function rollbackRocm(): Promise<{ status: string; active?: RocmActive }> {
  return post("/v1/rocm/rollback");
}

export function fetchBenchRuns(limit = 20): Promise<SentinelBenchRuns> {
  return get<SentinelBenchRuns>(`/v1/bench/runs?limit=${limit}`);
}
export function runBench(payload: BenchRunInput): Promise<SentinelCliAck> {
  return post<SentinelCliAck>("/v1/bench/run", payload);
}

// ---------------------------------------------------------------------------
// Evals
// ---------------------------------------------------------------------------

export interface SentinelEvalRun {
  file: string;
  mtime: string;
  suite?: string;
  run_id?: string;
  pass_rate?: number;
  cases_total?: number;
  cases_passed?: number;
  started_at?: string;
  duration_seconds?: number;
}

export interface SentinelEvalRuns {
  runs: SentinelEvalRun[];
}

export interface EvalRunInput {
  grounding?: boolean;
  quick?: boolean;
  memory?: boolean;
  subsystem?: boolean;
  suite?: string;
}

export interface EvalSuiteEntry {
  name: string;
  path: string;
  size: number;
  mtime: string;
}

export interface EvalSuiteListResponse {
  suites: EvalSuiteEntry[];
}

export interface EvalSuiteFile {
  name: string;
  path: string;
  content: string;
}

export interface EvalSuiteWriteResponse {
  status: "ok";
  name: string;
  path: string;
  size: number;
  mtime: string;
}

export function fetchEvalSuites(): Promise<EvalSuiteListResponse> {
  return get<EvalSuiteListResponse>("/v1/evals/suites");
}

export function fetchEvalSuite(name: string): Promise<EvalSuiteFile> {
  return get<EvalSuiteFile>(`/v1/evals/suites/${encodeURIComponent(name)}`);
}

export function writeEvalSuite(name: string, content: string): Promise<EvalSuiteWriteResponse> {
  return put<EvalSuiteWriteResponse>(
    `/v1/evals/suites/${encodeURIComponent(name)}`,
    { content },
  );
}

export function fetchEvalRuns(limit = 20): Promise<SentinelEvalRuns> {
  return get<SentinelEvalRuns>(`/v1/evals/runs?limit=${limit}`);
}
export interface EvalJobStartResponse {
  job_id: string;
  status: "running";
  kind: string;
}

export function runEval(payload: EvalRunInput): Promise<EvalJobStartResponse> {
  return post<EvalJobStartResponse>("/v1/evals/run", payload);
}

export type EvalJobStatus = "running" | "ok" | "error";

export interface EvalJob {
  job_id: string;
  kind: string;
  args: string[];
  status: EvalJobStatus;
  started_at: string;
  finished_at: string | null;
  returncode: number | null;
  stdout: string;
  stderr: string;
  message: string | null;
}

export function fetchEvalJob(jobId: string): Promise<EvalJob> {
  return get<EvalJob>(`/v1/evals/jobs/${jobId}`);
}

export interface EvalJobsListResponse {
  active_job_id: string | null;
  jobs: Array<Omit<EvalJob, "stdout" | "stderr">>;
}

export function fetchEvalJobs(): Promise<EvalJobsListResponse> {
  return get<EvalJobsListResponse>("/v1/evals/jobs");
}

// ---------------------------------------------------------------------------
// Dream
// ---------------------------------------------------------------------------

export interface SentinelDreamRun {
  last_run?: string;
  sessions_reviewed?: number;
  episodes_ingested?: number;
  impulses_stored?: number;
  facts_pruned?: number;
  duration_seconds?: number;
  errors?: string[];
  dry_run?: boolean;
  [key: string]: unknown;
}

export interface SentinelDreamRuns {
  runs: SentinelDreamRun[];
}

export function fetchDreamRuns(): Promise<SentinelDreamRuns> {
  return get<SentinelDreamRuns>("/v1/dream/runs");
}

// ---------------------------------------------------------------------------
// Activity / diagnostics
// ---------------------------------------------------------------------------

export type ActivityLogSource = "api" | "assistant" | "dream";
export type ActivityLogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface ActivityLogRecord {
  timestamp: string;
  logger: string;
  level: ActivityLogLevel;
  message: string;
}

export interface ActivityLogResponse {
  records: ActivityLogRecord[];
}

export function fetchActivityLog(opts: {
  source?: string;
  level?: ActivityLogLevel;
  contains?: string;
  limit?: number;
}): Promise<ActivityLogResponse> {
  const qs = new URLSearchParams();
  if (opts.source) qs.set("source", opts.source);
  if (opts.level) qs.set("level", opts.level);
  if (opts.contains) qs.set("contains", opts.contains);
  if (opts.limit != null) qs.set("limit", String(opts.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get<ActivityLogResponse>(`/v1/activity/log${suffix}`);
}

export interface ActivitySource {
  key: string;
  path: string;
  size_bytes: number;
  mtime: string;
  age_seconds: number;
  fresh: boolean;
}

export interface ActivitySourcesResponse {
  sources: ActivitySource[];
}

export function fetchActivitySources(): Promise<ActivitySourcesResponse> {
  return get<ActivitySourcesResponse>("/v1/activity/sources");
}

export interface BriefingEvent {
  timestamp: string;
  event: string;
  level: ActivityLogLevel;
  detail: Record<string, string>;
  raw: string;
}

export interface BriefingEventsResponse {
  events: BriefingEvent[];
}

export function fetchBriefingEvents(limit = 20): Promise<BriefingEventsResponse> {
  return get<BriefingEventsResponse>(`/v1/activity/briefing?limit=${limit}`);
}

export type BriefingRunStatus = "ok" | "failed" | "skipped";

export interface BriefingRun {
  started_at: string;
  finished_at?: string;
  duration_seconds?: number;
  status: BriefingRunStatus;
  channel_id?: number | null;
  session_id?: string | null;
  prompt_chars?: number;
  response?: string;
  response_chars?: number;
  chunks_sent?: number;
  feed_sections?: number;
  feed_items?: number;
  error?: string | null;
}

export interface BriefingRunsResponse {
  runs: BriefingRun[];
}

export function fetchBriefingRuns(limit = 10): Promise<BriefingRunsResponse> {
  return get<BriefingRunsResponse>(`/v1/activity/briefing-runs?limit=${limit}`);
}

export interface ToolCallTurn {
  trace_id: string | null;
  session_id: string;
  query_preview: string;
  tools: string[];
  tool_count: number;
  error_count: number;
  response_chars: number;
}

export interface ToolCallsResponse {
  role: string;
  turns: number;
  tool_calls_total: number;
  tool_calls_with_error: number;
  tools_histogram: Record<string, number>;
  last_turn_at: string | null;
  recent: ToolCallTurn[];
}

export function fetchActivityToolCalls(limit = 20, role = "orchestrator"): Promise<ToolCallsResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("role", role);
  return get<ToolCallsResponse>(`/v1/activity/tool-calls?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// Finetune (read-only — training still CLI)
// ---------------------------------------------------------------------------

export interface FinetuneStatus {
  workspace_dir: string | null;
  target_role: string | null;
  target_registry: string | null;
  base_model_id: string | null;
  base_model_path: string | null;
  default_dataset_name: string | null;
  default_recipe_name: string | null;
  python_bin: string | null;
  counts: Partial<Record<"datasets" | "recipes" | "snapshots" | "runs", number>>;
}

export interface FinetuneDataset {
  name: string;
  path: string;
  manifest: Record<string, unknown> | null;
  examples_count: number;
  has_examples: boolean;
  mtime: string;
}

export interface FinetuneRecipe {
  name: string;
  path: string;
  recipe: Record<string, unknown> | null;
  mtime: string;
}

export interface FinetuneRun {
  name: string;
  path: string;
  checkpoints: string[];
  latest_checkpoint: string | null;
  has_train_py: boolean;
  has_run_sh: boolean;
  mtime: string;
}

export function fetchFinetuneStatus(): Promise<FinetuneStatus> {
  return get<FinetuneStatus>("/v1/finetune/status");
}
export function fetchFinetuneDatasets(): Promise<{ datasets: FinetuneDataset[] }> {
  return get<{ datasets: FinetuneDataset[] }>("/v1/finetune/datasets");
}
export function fetchFinetuneRecipes(): Promise<{ recipes: FinetuneRecipe[] }> {
  return get<{ recipes: FinetuneRecipe[] }>("/v1/finetune/recipes");
}
export function fetchFinetuneRuns(): Promise<{ runs: FinetuneRun[] }> {
  return get<{ runs: FinetuneRun[] }>("/v1/finetune/runs");
}

// ---------------------------------------------------------------------------
// Local tracing
// ---------------------------------------------------------------------------

export interface TracingTraceSummary {
  id: string;
  name: string;
  session_id: string | null;
  user_id: string | null;
  source: string | null;
  input_preview: string | null;
  output_preview: string | null;
  status: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
}

export interface TracingTracesResponse {
  traces: TracingTraceSummary[];
  detail?: string;
}

export function fetchTracingTraces(limit = 20, name?: string, sessionId?: string): Promise<TracingTracesResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (name) params.set("name", name);
  if (sessionId) params.set("session_id", sessionId);
  return get<TracingTracesResponse>(`/v1/tracing/traces?${params.toString()}`);
}

export interface TracingSpan {
  id: string;
  trace_id: string;
  parent_span_id: string | null;
  name: string;
  kind: string;
  input: string | null;
  output: string | null;
  metadata: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost: number | null;
}

export interface TracingScore {
  id: number;
  trace_id: string;
  span_id: string | null;
  name: string;
  value: number;
  comment: string | null;
  created_at: string;
}

export interface TracingTraceFull extends TracingTraceSummary {
  input: string | null;
  output: string | null;
  metadata: string | null;
  spans: TracingSpan[];
  scores: TracingScore[];
}

export function fetchTracingTrace(id: string): Promise<TracingTraceFull> {
  return get<TracingTraceFull>(`/v1/tracing/trace/${encodeURIComponent(id)}`);
}

export interface TracingMetricsSnapshot {
  enqueued_traces: number;
  enqueued_spans: number;
  enqueued_scores: number;
  dropped_events: number;
  flushes_total: number;
  rows_written_total: number;
  last_flush_rows: number;
  last_flush_ms: number;
  flush_ms_ema: number;
  last_flush_at: number;
  write_errors: number;
  queue_depth: number;
  db_size_bytes: number;
  uptime_seconds: number;
}

export interface TracingMetricsResponse {
  enabled: boolean;
  db_path?: string;
  trace_count?: number;
  metrics?: TracingMetricsSnapshot;
  detail?: string;
}

export function fetchTracingMetrics(): Promise<TracingMetricsResponse> {
  return get<TracingMetricsResponse>("/v1/tracing/metrics");
}

export interface TracingScoreInput {
  trace_id: string;
  name: string;
  value: number;
  comment?: string;
}

export interface TracingScoreResult {
  status: string;
  trace_id: string;
  name: string;
  value: number;
  comment: string | null;
}

export function recordTracingScore(
  input: TracingScoreInput,
): Promise<TracingScoreResult> {
  return post<TracingScoreResult>("/v1/tracing/score", input);
}

// ---------------------------------------------------------------------------
// Agents filesystem
// ---------------------------------------------------------------------------

export interface AgentFileEntry {
  path: string;
  name: string;
  size_bytes: number;
  mtime: string;
}

export interface AgentEntry {
  name: string;
  files: AgentFileEntry[];
}

export interface AgentsListResponse {
  agents: AgentEntry[];
}

export interface AgentFileContent extends AgentFileEntry {
  content: string;
}

export function fetchAgentsList(): Promise<AgentsListResponse> {
  return get<AgentsListResponse>("/v1/agents-fs/list");
}

export function fetchAgentFile(path: string): Promise<AgentFileContent> {
  return get<AgentFileContent>(`/v1/agents-fs/file?path=${encodeURIComponent(path)}`);
}

export function writeAgentFile(path: string, content: string): Promise<AgentFileEntry & { status: string }> {
  const url = `/v1/agents-fs/file?path=${encodeURIComponent(path)}`;
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        method: "PUT",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        reject(new SentinelApiError(`${url} → ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`, response.status));
        return;
      }
      resolve(await response.json());
    } catch (err) {
      reject(new SentinelApiError(err instanceof Error ? err.message : "write failed"));
    }
  });
}

export function deleteAgentFile(path: string): Promise<{ status: string; path: string }> {
  const url = `/v1/agents-fs/file?path=${encodeURIComponent(path)}`;
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        reject(new SentinelApiError(`${url} → ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`, response.status));
        return;
      }
      resolve(await response.json());
    } catch (err) {
      reject(new SentinelApiError(err instanceof Error ? err.message : "delete failed"));
    }
  });
}

export interface NewAgentInput {
  name: string;
  agent_md?: string;
  soul_md?: string;
}

export function createAgent(input: NewAgentInput): Promise<{ status: string; name: string }> {
  return post<{ status: string; name: string }>("/v1/agents-fs/new-agent", input);
}

export interface FinetuneExportInput {
  role: "orchestrator" | "skill-classifier" | "tool-classifier" | "worker";
  since?: string;
  until?: string;
  min_score?: number;
  score_name?: string;
  limit?: number;
  dataset_name?: string;
}

export interface FinetuneExportResult {
  status: string;
  role: string;
  dataset_name: string;
  examples_written: number;
  rows_scanned: number;
  duration_seconds: number;
  out_path: string;
}

export function exportFinetuneDataset(
  input: FinetuneExportInput,
): Promise<FinetuneExportResult> {
  return post<FinetuneExportResult>("/v1/finetune/export", input);
}

export interface FinetuneSynthesizeInput {
  source_path?: string;
  source_dataset?: string;
  topic: string;
  count?: number;
  batch_size?: number;
  out_dataset_name?: string;
  claude_model?: string;
  rng_seed?: number;
}

export interface FinetuneSynthesizeResult {
  status: string;
  dataset_name: string;
  seeds_used: number;
  examples_written: number;
  llm_calls: number;
  dropped_rows: number;
  errors: string[];
  out_path: string;
}

export function synthesizeFinetuneDataset(
  input: FinetuneSynthesizeInput,
): Promise<FinetuneSynthesizeResult> {
  return post<FinetuneSynthesizeResult>("/v1/finetune/synthesize", input);
}

export interface FinetuneTrainInput {
  recipe: string;
  extra_args?: string[];
}

export interface FinetuneTrainStartResponse {
  job_id: string;
  status: "running";
  recipe: string;
  pid: number;
}

export function startFinetuneTraining(
  input: FinetuneTrainInput,
): Promise<FinetuneTrainStartResponse> {
  return post<FinetuneTrainStartResponse>("/v1/finetune/train", input);
}

export interface FinetuneTrainMetricPoint {
  loss: number;
  learning_rate?: number;
  epoch?: number;
}

export interface FinetuneTrainMetrics {
  points: FinetuneTrainMetricPoint[];
  latest: FinetuneTrainMetricPoint | null;
  step_count: number;
}

export type FinetuneTrainStatus = "running" | "ok" | "error";

export interface FinetuneTrainJob {
  job_id: string;
  recipe: string;
  args: string[];
  pid: number | null;
  status: FinetuneTrainStatus;
  started_at: string;
  finished_at: string | null;
  returncode: number | null;
  message: string | null;
  stdout: string;
  metrics: FinetuneTrainMetrics;
}

export function fetchFinetuneTrainJob(jobId: string): Promise<FinetuneTrainJob> {
  return get<FinetuneTrainJob>(`/v1/finetune/train-jobs/${encodeURIComponent(jobId)}`);
}

export interface FinetuneTrainJobsListResponse {
  active_job_id: string | null;
  jobs: Array<Omit<FinetuneTrainJob, "stdout">>;
}

export function fetchFinetuneTrainJobs(): Promise<FinetuneTrainJobsListResponse> {
  return get<FinetuneTrainJobsListResponse>("/v1/finetune/train-jobs");
}

// ---------------------------------------------------------------------------
// Recipes filesystem
// ---------------------------------------------------------------------------

export interface RecipeFileEntry {
  name: string;
  size_bytes: number;
  mtime: string;
}

export interface RecipesListResponse {
  recipes: RecipeFileEntry[];
}

export interface RecipeFileContent extends RecipeFileEntry {
  path: string;
  content: string;
}

export function fetchRecipesList(): Promise<RecipesListResponse> {
  return get<RecipesListResponse>("/v1/recipes-fs/list");
}

export function fetchRecipeFile(path: string): Promise<RecipeFileContent> {
  return get<RecipeFileContent>(`/v1/recipes-fs/file?path=${encodeURIComponent(path)}`);
}

export function writeRecipeFile(
  path: string,
  content: string,
): Promise<RecipeFileEntry & { status: string }> {
  const url = `/v1/recipes-fs/file?path=${encodeURIComponent(path)}`;
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        method: "PUT",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        reject(
          new SentinelApiError(
            `${url} → ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
            response.status,
          ),
        );
        return;
      }
      resolve(await response.json());
    } catch (err) {
      reject(new SentinelApiError(err instanceof Error ? err.message : "write failed"));
    }
  });
}

// ---------------------------------------------------------------------------
// Fine-tune one-click actions (build / register / promote)
// ---------------------------------------------------------------------------

export interface FinetuneBuildInput {
  dataset_name: string;
  classifier?: boolean;
}

export interface FinetuneRegisterInput {
  model_id: string;
  gguf: string;
}

export interface FinetunePromoteInput {
  model_id: string;
  role?: string;
}

export function buildFinetuneDataset(
  input: FinetuneBuildInput,
): Promise<SentinelCliAck> {
  return post<SentinelCliAck>("/v1/finetune/build", input);
}

export function registerFinetuneModel(
  input: FinetuneRegisterInput,
): Promise<SentinelCliAck> {
  return post<SentinelCliAck>("/v1/finetune/register", input);
}

export function promoteFinetuneModel(
  input: FinetunePromoteInput,
): Promise<SentinelCliAck> {
  return post<SentinelCliAck>("/v1/finetune/promote", input);
}

// ---------------------------------------------------------------------------
// Curation review
// ---------------------------------------------------------------------------

export interface CurationExample {
  index: number;
  record: {
    id?: string;
    messages?: Array<{ role: string; content: string }>;
    metadata?: Record<string, unknown>;
  };
}

export interface CurationExamplesResponse {
  dataset: string;
  offset: number;
  limit: number;
  total: number;
  examples: CurationExample[];
}

export function fetchCurationExamples(
  dataset: string,
  offset: number,
  limit: number,
): Promise<CurationExamplesResponse> {
  const params = new URLSearchParams();
  params.set("dataset", dataset);
  params.set("offset", String(offset));
  params.set("limit", String(limit));
  return get<CurationExamplesResponse>(`/v1/finetune/curation/examples?${params.toString()}`);
}

export type CurationBucket = "keep" | "rewrite" | "drop" | "needs-user-decision";

export interface CurationDecisionRecord {
  example_id: string;
  bucket: CurationBucket;
  created_at: string;
  notes?: string;
  rewrite?: string;
}

export interface CurationDecisionsResponse {
  dataset: string;
  decisions: Record<string, CurationDecisionRecord>;
}

export function fetchCurationDecisions(
  dataset: string,
): Promise<CurationDecisionsResponse> {
  return get<CurationDecisionsResponse>(
    `/v1/finetune/curation/decisions?dataset=${encodeURIComponent(dataset)}`,
  );
}

export interface CurationDecisionInput {
  dataset: string;
  example_id: string;
  bucket: CurationBucket;
  notes?: string;
  rewrite?: string;
}

export function recordCurationDecision(
  input: CurationDecisionInput,
): Promise<CurationDecisionRecord & { status: string }> {
  return post<CurationDecisionRecord & { status: string }>(
    "/v1/finetune/curation/decision",
    input,
  );
}

// ---------------------------------------------------------------------------
// Shared CLI ack type (stdout/stderr returned by subprocess endpoints).
// ---------------------------------------------------------------------------

export interface SentinelCliAck {
  status: string;
  message: string;
  stdout?: string;
  stderr?: string;
}
