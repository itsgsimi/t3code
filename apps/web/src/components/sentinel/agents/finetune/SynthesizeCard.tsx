import { useEffect, useState } from "react";

import {
  useSentinelFinetuneDatasets,
  useSentinelSynthesizeFinetuneDataset,
} from "../../../../sentinel/hooks";
import type { FinetuneSynthesizeInput } from "../../../../sentinel/api";
import { Card, CardHead } from "../_shared";

export function SynthesizeCard() {
  const datasets = useSentinelFinetuneDatasets();
  const synth = useSentinelSynthesizeFinetuneDataset();
  const [sourceDataset, setSourceDataset] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [count, setCount] = useState<string>("20");
  const [claudeModel, setClaudeModel] = useState<string>("");
  const [outName, setOutName] = useState<string>("");

  const available = datasets.data?.datasets ?? [];
  // Auto-pick the most recent dataset as source if nothing selected yet.
  useEffect(() => {
    if (!sourceDataset && available.length > 0) {
      setSourceDataset(available[0]!.name);
    }
  }, [sourceDataset, available]);

  const canSubmit = !!sourceDataset && !!topic.trim() && !synth.isPending;

  const handleSubmit = () => {
    const input: FinetuneSynthesizeInput = {
      source_dataset: sourceDataset,
      topic: topic.trim(),
    };
    const n = Number(count);
    if (!Number.isNaN(n) && n > 0) input.count = n;
    if (claudeModel.trim()) input.claude_model = claudeModel.trim();
    if (outName.trim()) input.out_dataset_name = outName.trim();
    synth.mutate(input);
  };

  return (
    <Card>
      <CardHead>
        <span>Synthesize variations (claude -p)</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--fg-4)" }}>
          seeds dataset → fan out
        </span>
      </CardHead>
      <div
        style={{
          padding: 14,
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 2fr) 110px 130px 140px auto",
          gap: 10,
          alignItems: "end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            source dataset
          </span>
          <select
            value={sourceDataset}
            onChange={(e) => setSourceDataset(e.target.value)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 4,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              color: "var(--fg-1)",
            }}
          >
            <option value="">-- pick --</option>
            {available.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            topic
          </span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="what behaviour to amplify"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 4,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              color: "var(--fg-1)",
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            count
          </span>
          <input
            type="text"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="20"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 4,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              color: "var(--fg-1)",
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            claude model
          </span>
          <input
            type="text"
            value={claudeModel}
            onChange={(e) => setClaudeModel(e.target.value)}
            placeholder="sonnet / opus / …"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 4,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              color: "var(--fg-1)",
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            out name (opt)
          </span>
          <input
            type="text"
            value={outName}
            onChange={(e) => setOutName(e.target.value)}
            placeholder="auto-timestamped"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 4,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              color: "var(--fg-1)",
            }}
          />
        </label>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            padding: "7px 14px",
            borderRadius: 5,
            background: !canSubmit ? "var(--canvas-3)" : "var(--ember-400)",
            color: !canSubmit ? "var(--fg-3)" : "var(--fg-on-accent)",
            border: "none",
            fontSize: 12.5,
            fontWeight: 500,
            cursor: !canSubmit ? "default" : "pointer",
          }}
        >
          {synth.isPending ? "Synthesizing…" : "Synthesize"}
        </button>
      </div>
      {synth.data ? (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--border-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--state-healthy-fg)",
          }}
        >
          Wrote {synth.data.examples_written} examples → {synth.data.out_path}
          <span style={{ color: "var(--fg-4)", marginLeft: 8 }}>
            seeds={synth.data.seeds_used} · calls={synth.data.llm_calls}
            {synth.data.dropped_rows > 0 ? ` · dropped=${synth.data.dropped_rows}` : ""}
          </span>
          {synth.data.errors.length > 0 ? (
            <div style={{ color: "var(--state-down-fg)", marginTop: 4 }}>
              warnings: {synth.data.errors.join(" | ")}
            </div>
          ) : null}
        </div>
      ) : null}
      {synth.isError ? (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--border-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--state-down-fg)",
          }}
        >
          Synthesis failed: {(synth.error as Error).message}
        </div>
      ) : null}
    </Card>
  );
}
