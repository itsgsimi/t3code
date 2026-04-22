import { Loader2 } from "lucide-react";

import { useStackAction } from "../../../../sentinel/hooks";
import { useConfirm } from "../../primitives";
import { Card, CardHead } from "../_shared";

export function FinetuneModeCard() {
  const stack = useStackAction("finetune");
  const running = stack.isRunning;
  const job = stack.job;
  const terminal = job && job.status !== "running" ? job.status : null;
  const confirm = useConfirm();

  const handleUp = async () => {
    const ok = await confirm({
      title: "Enter fine-tune mode?",
      body: (
        <span>
          This will stop all LLM containers (orchestrator, worker, classifiers, embedder)
          and the memory stack (Neo4j + Graphiti), then start the fine-tune training container.
          LLM/memory will NOT auto-restart — use <code>sentinel up</code> when done.
        </span>
      ),
      confirmLabel: "Enter fine-tune mode",
      destructive: true,
    });
    if (ok) stack.trigger("up");
  };

  const handleDown = () => {
    stack.trigger("down");
  };

  return (
    <Card>
      <CardHead>
        <span>Fine-tune mode</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--fg-4)" }}>
          tears down LLM + memory, boots training container
        </span>
      </CardHead>
      <div
        style={{
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 12.5,
          color: "var(--fg-2)",
        }}
      >
        <button
          type="button"
          onClick={handleUp}
          disabled={running}
          style={{
            padding: "6px 14px",
            borderRadius: 4,
            border: "1px solid var(--border-default)",
            background: running ? "var(--canvas-3)" : "var(--ember-400)",
            color: running ? "var(--fg-4)" : "var(--fg-on-accent)",
            cursor: running ? "default" : "pointer",
            fontSize: 11.5,
          }}
        >
          enter mode
        </button>
        <button
          type="button"
          onClick={handleDown}
          disabled={running}
          style={{
            padding: "6px 14px",
            borderRadius: 4,
            border: "1px solid var(--border-default)",
            background: "var(--canvas-2)",
            color: running ? "var(--fg-4)" : "var(--fg-1)",
            cursor: running ? "default" : "pointer",
            fontSize: 11.5,
          }}
        >
          exit mode
        </button>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-3)" }}>
          {running ? (
            <span>
              <Loader2 size={11} className="inline animate-spin" /> {job?.action ?? "working"}…
            </span>
          ) : terminal === "ok" ? (
            <span style={{ color: "var(--fg-2)" }}>{job?.message ?? "done"}</span>
          ) : terminal === "error" ? (
            <span style={{ color: "var(--state-down-fg)" }}>{job?.message ?? "failed"}</span>
          ) : (
            "idle"
          )}
        </div>
      </div>
      {stack.triggerError ? (
        <div
          style={{
            padding: "0 16px 12px",
            color: "var(--state-down-fg)",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
        >
          {stack.triggerError}
        </div>
      ) : null}
    </Card>
  );
}
