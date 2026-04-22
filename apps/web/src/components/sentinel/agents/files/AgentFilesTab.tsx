import { useEffect, useState } from "react";

import {
  useSentinelAgentsList,
  useSentinelCreateAgent,
} from "../../../../sentinel/hooks";
import { Card, EmptyCard } from "../_shared";
import { AgentTreeNode } from "./agentTree";
import { AgentFileEditor } from "./AgentFileEditor";

export function AgentFilesTab() {
  const list = useSentinelAgentsList();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const agents = list.data?.agents ?? [];

  // Default to the first file the first time data arrives.
  useEffect(() => {
    if (selectedPath || agents.length === 0) return;
    for (const a of agents) {
      if (a.files.length > 0) {
        setSelectedPath(a.files[0]!.path);
        return;
      }
    }
  }, [selectedPath, agents]);

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(240px, 280px) minmax(0, 1fr)" }}>
      <div>
        <Card>
          <div
            className="flex items-center gap-2"
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border-soft)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            <span style={{ flex: 1 }}>agents/</span>
            <button
              type="button"
              onClick={() => setCreating(true)}
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                background: "var(--canvas-2)",
                color: "var(--fg-1)",
                border: "1px solid var(--border-soft)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              + agent
            </button>
          </div>
          {list.isLoading ? (
            <div style={{ padding: 16, color: "var(--fg-4)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              Loading…
            </div>
          ) : agents.length === 0 ? (
            <div style={{ padding: 16, color: "var(--fg-3)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              No agents yet.
            </div>
          ) : (
            agents.map((a) => (
              <AgentTreeNode
                key={a.name}
                agent={a}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
              />
            ))
          )}
        </Card>
      </div>
      <div>
        {creating ? (
          <NewAgentPanel
            onCreated={(name) => {
              setCreating(false);
              setSelectedPath(`${name}/AGENT.md`);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : selectedPath ? (
          <AgentFileEditor path={selectedPath} onDeleted={() => setSelectedPath(null)} />
        ) : (
          <EmptyCard>Select a file from the tree on the left.</EmptyCard>
        )}
      </div>
    </div>
  );
}

export function NewAgentPanel({
  onCreated,
  onCancel,
}: {
  onCreated: (name: string) => void;
  onCancel: () => void;
}) {
  const create = useSentinelCreateAgent();
  const [name, setName] = useState("");
  const [agentMd, setAgentMd] = useState(
    "# New agent\n\nDescribe this agent's role and responsibilities.\n",
  );

  const disabled = create.isPending || !name || !/^[a-z0-9][a-z0-9_-]*$/.test(name);

  return (
    <Card>
      <div
        className="flex items-center gap-2"
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-soft)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-2)",
        }}
      >
        <span>New agent</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--fg-4)" }}>
          lowercase, digits, _ and - only
        </span>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="agent-name"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            padding: "7px 10px",
            borderRadius: 5,
            background: "var(--canvas-2)",
            border: "1px solid var(--border-soft)",
            color: "var(--fg-1)",
          }}
        />
        <textarea
          value={agentMd}
          onChange={(e) => setAgentMd(e.target.value)}
          spellCheck={false}
          placeholder="AGENT.md content"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.55,
            padding: 10,
            minHeight: 260,
            borderRadius: 5,
            background: "var(--canvas-1)",
            color: "var(--fg-1)",
            border: "1px solid var(--border-soft)",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              create.mutate(
                { name, agent_md: agentMd },
                { onSuccess: () => onCreated(name) },
              )
            }
            disabled={disabled}
            style={{
              padding: "7px 14px",
              borderRadius: 5,
              background: disabled ? "var(--canvas-3)" : "var(--ember-400)",
              color: disabled ? "var(--fg-3)" : "var(--fg-on-accent)",
              border: "none",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: disabled ? "default" : "pointer",
            }}
          >
            {create.isPending ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "6px 12px",
              borderRadius: 5,
              background: "var(--canvas-3)",
              color: "var(--fg-2)",
              border: "1px solid var(--border-soft)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {create.isError ? (
            <span style={{ color: "var(--state-down-fg)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
              {(create.error as Error).message}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
