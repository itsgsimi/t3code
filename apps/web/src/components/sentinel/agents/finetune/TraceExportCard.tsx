import { useState } from "react";

import { useSentinelExportFinetuneDataset } from "../../../../sentinel/hooks";
import type { FinetuneExportInput } from "../../../../sentinel/api";
import { Card, CardHead } from "../_shared";

export function TraceExportCard() {
  const exportDataset = useSentinelExportFinetuneDataset();
  const [role, setRole] = useState<"orchestrator" | "skill-classifier" | "tool-classifier" | "worker">("orchestrator");
  const [since, setSince] = useState<string>("7d");
  const [minScore, setMinScore] = useState<string>("");
  const [datasetName, setDatasetName] = useState<string>("");

  const handleExport = () => {
    const input: FinetuneExportInput = { role };
    if (since.trim()) input.since = since.trim();
    const scoreVal = minScore.trim();
    if (scoreVal) {
      const n = Number(scoreVal);
      if (!Number.isNaN(n)) input.min_score = n;
    }
    if (datasetName.trim()) input.dataset_name = datasetName.trim();
    exportDataset.mutate(input);
  };

  return (
    <Card>
      <CardHead>
        <span>Build dataset from traces</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--fg-4)" }}>
          streams run/traces.db → JSONL
        </span>
      </CardHead>
      <div
        style={{
          padding: 14,
          display: "grid",
          gridTemplateColumns: "minmax(200px, 1fr) minmax(120px, 160px) minmax(120px, 160px) minmax(200px, 1fr) auto",
          gap: 10,
          alignItems: "end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            role
          </span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
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
            <option value="orchestrator">orchestrator</option>
            <option value="skill-classifier">skill-classifier</option>
            <option value="tool-classifier">tool-classifier</option>
            <option value="worker">worker</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            since
          </span>
          <input
            type="text"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            placeholder="7d"
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
            min score
          </span>
          <input
            type="text"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            placeholder="0.8"
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
            dataset name (optional)
          </span>
          <input
            type="text"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
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
          onClick={handleExport}
          disabled={exportDataset.isPending}
          style={{
            padding: "7px 14px",
            borderRadius: 5,
            background: exportDataset.isPending ? "var(--canvas-3)" : "var(--ember-400)",
            color: exportDataset.isPending ? "var(--fg-3)" : "var(--fg-on-accent)",
            border: "none",
            fontSize: 12.5,
            fontWeight: 500,
            cursor: exportDataset.isPending ? "default" : "pointer",
          }}
        >
          {exportDataset.isPending ? "Building…" : "Build"}
        </button>
      </div>
      {exportDataset.data ? (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--border-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--state-healthy-fg)",
          }}
        >
          Wrote {exportDataset.data.examples_written} examples → {exportDataset.data.out_path}
          <span style={{ color: "var(--fg-4)", marginLeft: 8 }}>
            scanned {exportDataset.data.rows_scanned} · {exportDataset.data.duration_seconds.toFixed(2)}s
          </span>
        </div>
      ) : null}
      {exportDataset.isError ? (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "1px solid var(--border-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--state-down-fg)",
          }}
        >
          Export failed: {(exportDataset.error as Error).message}
        </div>
      ) : null}
    </Card>
  );
}
