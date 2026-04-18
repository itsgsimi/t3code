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
