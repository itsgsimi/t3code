/**
 * Config page — grouping, labels, redirect targets, field counts, restart
 * manifest. Keeps the section metadata out of the view so the rail + page
 * header can reason about it generically.
 */

export interface ConfigGroup {
  key: string;
  label: string;
  icon: ConfigGroupIcon;
  sections: readonly string[];
}

export type ConfigGroupIcon =
  | "settings"
  | "cpu"
  | "bot"
  | "brain"
  | "plug"
  | "activity"
  | "wrench";

export const CONFIG_GROUPS: readonly ConfigGroup[] = [
  {
    key: "system",
    label: "System",
    icon: "settings",
    sections: ["api_server", "logging", "debug", "sessions"],
  },
  {
    key: "models",
    label: "Models",
    icon: "cpu",
    sections: ["model_registry", "models", "model_presets"],
  },
  {
    key: "agents",
    label: "Agents",
    icon: "bot",
    sections: ["agents", "skill_injection", "tool_classification", "toolsets", "deep_think"],
  },
  {
    key: "memory",
    label: "Memory",
    icon: "brain",
    sections: ["memory"],
  },
  {
    key: "integrations",
    label: "Integrations",
    icon: "plug",
    sections: ["mcp_servers", "web_search", "home_iot", "host_aliases", "morning_briefing"],
  },
  {
    key: "observability",
    label: "Observability",
    icon: "activity",
    sections: ["eval"],
  },
  {
    key: "tooling",
    label: "Tooling",
    icon: "wrench",
    sections: ["finetune", "bench"],
  },
] as const;

export interface RedirectInfo {
  to: string;
  route: string;
  desc: string;
}

export const CONFIG_REDIRECTS: Readonly<Record<string, RedirectInfo>> = {
  model_registry: {
    to: "Models › Registry",
    route: "/models",
    desc: "Identity-keyed model definitions (file, port, context, profile).",
  },
  models: {
    to: "Models › Roles",
    route: "/models",
    desc: "Role → registry key assignments (orchestrator, worker, …).",
  },
  host_aliases: {
    to: "Deploy",
    route: "/deploy",
    desc: "IP → hostname mapping for host-monitor and deploy.",
  },
};

export const CONFIG_SECTION_DESC: Readonly<Record<string, string>> = {
  api_server: "FastAPI server host + port.",
  logging: "Log level + file destinations.",
  debug: "Debug / trace capture.",
  sessions: "Session store — timeouts, history cap, vault persistence.",
  model_presets: "Named model-swap recipes.",
  agents: "Agent definitions — prompt, model role, toolsets, temperature.",
  skill_injection: "Selector-model–gated skill injection.",
  tool_classification: "Tool-router classifier model.",
  toolsets: "Domain groupings with keywords, max_turns, tool allowlists.",
  deep_think: "Deep-think tool — model role, max tokens, temperature.",
  memory: "Knowledge-graph backend (Graphiti + Neo4j).",
  mcp_servers: "Tool-server transports, hosts, ports, exclude lists.",
  web_search: "Web-search backend (Perplexica / SearXNG).",
  home_iot: "Home automation adapters — Govee, Nest, Kasa, ChargePoint, Bluelink.",
  morning_briefing: "Discord briefing schedule + RSS feeds.",
  eval: "Eval synthetic config, results dir, regression threshold.",
  finetune: "Fine-tune workspace paths + LoRA defaults.",
  bench: "Inference benchmarks + model-eval weighting.",
};

/**
 * Per-field descriptions for the scalar section editor. Keyed as
 * ``<section>.<path>`` with dots for nested fields. Missing keys render
 * without a hint. Copy is short on purpose — one line, operator-facing.
 */
export const CONFIG_FIELD_HINTS: Readonly<Record<string, string>> = {
  // api_server
  "api_server.host": "Bind address. Keep 127.0.0.1 for LAN-only.",
  "api_server.port": "HTTP port — Sentinel defaults to 6967.",

  // logging
  "logging.level": "DEBUG / INFO / WARNING / ERROR. INFO is a sensible default.",
  "logging.file": "Destination file for the assistant log.",

  // debug
  "debug.full_trace":
    "Capture full prompt + response bodies in traces (noisy but useful when a response is empty).",
  "debug.full_trace_max_chars":
    "Truncate full-trace bodies at N chars so traces don't explode.",

  // sessions
  "sessions.idle_timeout": "Seconds of inactivity before a session is pruned from memory.",
  "sessions.max_sessions": "Upper bound on concurrent in-memory sessions.",
  "sessions.max_history_messages": "Messages kept per session before history is truncated.",
  "sessions.persist_to_memory_server":
    "Mirror sessions to sentinel-vault when available (transparent fallback otherwise).",

  // skill_injection
  "skill_injection.enabled": "Master switch for skill injection.",
  "skill_injection.model":
    "Role reference (e.g. skill_classifier) — resolved against models.<role>.",
  "skill_injection.agents_enabled":
    "Agents that receive injected skills. Empty list = every agent.",

  // tool_classification
  "tool_classification.model":
    "Role reference for the tool-routing classifier. Resolved against models.<role>.",

  // deep_think
  "deep_think.max_turns": "Hard cap on reasoning loop iterations per invocation.",
  "deep_think.max_tokens": "Token budget for the deep-think response.",
  "deep_think.timeout_seconds": "Abort a deep-think call if it runs past this many seconds.",
  "deep_think.temperature": "Sampling temperature for the deep-think model.",
  "deep_think.memory_write":
    "Persist deep-think episodes back to Graphiti under the deep_thinker group.",

  // web_search
  "web_search.searxng_url": "Self-hosted SearXNG base URL (JSON search endpoint).",
  "web_search.default_max_results": "Default result count when the agent doesn't specify.",
  "web_search.fetch_max_chars": "Max chars per fetched page body before truncation.",
  "web_search.fetch_timeout": "HTTP fetch timeout in seconds.",

  // eval
  "eval.results_dir": "Directory where eval run artifacts are written.",
  "eval.regression_threshold":
    "Score drop (0–1) before eval run is flagged as a regression.",
  "eval.synthetic_llm_model": "Model used to generate synthetic eval cases.",
  "eval.synthetic_default_count": "Default number of cases generated per synthetic run.",

  // memory.*
  "memory.backend": "Only 'graphiti' is supported today.",
  "memory.reranker":
    'Cross-encoder reranker. Currently "none" — the stock Graphiti MCP image ignores this setting and uses RRF. See docs/concepts/reranker.md for the path to re-enable.',
  "memory.neo4j.uri": "Bolt URI for the Graphiti Neo4j instance.",
  "memory.neo4j.user": "Neo4j username.",
  "memory.neo4j.password":
    "Neo4j password — store in env var and reference via ${NEO4J_PASSWORD}.",
  "memory.llm.base_url": "OpenAI-compatible endpoint Graphiti uses for entity extraction.",
  "memory.llm.model": "Model name Graphiti advertises when calling the extraction endpoint.",
  "memory.embedder.base_url": "Vector embedder endpoint.",
  "memory.embedder.model": "Embedder model name.",
  "memory.embedder.dim": "Output dimension of the embedder (must match Neo4j index).",
  "memory.shim.enabled": "Enable the structured-output shim for local LLMs.",
  "memory.shim.port": "HTTP port the shim binds to.",
  "memory.shim.timeout_seconds": "Shim call timeout.",
  "memory.auto_recall.enabled": "Inject relevant memories into every query pre-prompt.",
  "memory.auto_recall.max_results": "Max retrieved memories per query.",
  "memory.auto_recall.max_tokens": "Token budget for injected memory block.",
  "memory.auto_recall.search_config":
    "Graphiti search config. hybrid_rrf = vector + BM25 reciprocal rank fusion.",
  "memory.dream.trigger":
    "session_gap = run after an idle gap. cron = run on a schedule. manual = only on `sentinel dream run`.",
  "memory.dream.session_gap_minutes":
    "Minutes of idle before session_gap triggers a dream.",
  "memory.dream.cron_schedule": "Cron expression for cron trigger mode.",
  "memory.dream.cron_timezone": "Timezone used to evaluate the cron expression.",
  "memory.dream.model": "Model role used for dream consolidation.",
  "memory.dream.merge_redundant": "Merge duplicate facts discovered during dream.",
  "memory.dream.resolve_contradictions": "Resolve contradictions between facts.",
  "memory.dream.build_communities": "Re-cluster entity communities (Graphiti feature).",
  "memory.dream.prune_noise": "Prune stale / low-signal facts per the prune policy.",
  "memory.dream.restore_model":
    "Swap back to the previous orchestrator model after dream completes.",
  "memory.impulse.enabled": "Inject dream-surfaced nudges into chat.",
  "memory.impulse.max_per_query": "Max impulses shown per user turn.",
  "memory.impulse.cooldown_hours": "Hours before the same impulse can re-fire.",
  "memory.impulse.score_threshold": "Minimum impulse score (0–1) before showing.",
  "memory.impulse.dream_nudges": "Enable impulses sourced from dream-filed insights.",
};

/** Services that need a restart after this section changes. */
export const CONFIG_SECTION_RESTART: Readonly<Record<string, readonly string[]>> = {
  api_server: ["api"],
  memory: ["api", "graphiti-mcp"],
  mcp_servers: ["api"],
  logging: ["api"],
  sessions: ["api"],
  skill_injection: ["api"],
  tool_classification: ["api"],
  deep_think: ["api"],
  web_search: ["api"],
  home_iot: ["api"],
  morning_briefing: ["api"],
  eval: ["api"],
  agents: ["api"],
  toolsets: ["api"],
  debug: ["api"],
};
