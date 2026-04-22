import { useState, type ReactNode } from "react";

import {
  useSentinelBuildFinetuneDataset,
  useSentinelPromoteFinetuneModel,
  useSentinelRegisterFinetuneModel,
} from "../../../../sentinel/hooks";
import type {
  FinetuneDataset,
  FinetuneRecipe,
  FinetuneRun,
} from "../../../../sentinel/api";
import type { DotState } from "../../shared";
import { Card, CardHead } from "../_shared";

export function FinetuneListCard({
  title,
  count,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  count: number;
  loading: boolean;
  error: string | null;
  empty: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHead>
        <span>{title}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            color: "var(--fg-4)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {loading ? "…" : String(count)}
        </span>
      </CardHead>
      {error ? (
        <div
          style={{
            padding: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--state-down-fg)",
          }}
        >
          {error}
        </div>
      ) : loading ? (
        <div style={{ padding: 14, fontSize: 12, color: "var(--fg-4)" }}>Loading…</div>
      ) : count === 0 ? (
        <div
          style={{
            padding: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-4)",
          }}
        >
          {empty}
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

export function DatasetRow({ dataset, last }: { dataset: FinetuneDataset; last: boolean }) {
  const manifest = dataset.manifest ?? {};
  const task = typeof manifest.task === "string" ? (manifest.task as string) : "—";
  const split =
    typeof manifest.validation_split === "number"
      ? `${Math.round((manifest.validation_split as number) * 100)}% val`
      : null;
  const isClassifier = typeof task === "string" && task.includes("classifier");
  const build = useSentinelBuildFinetuneDataset();
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      <div className="flex items-center gap-2" style={{ color: "var(--fg-1)" }}>
        <span>{dataset.name}</span>
        <span style={{ color: "var(--fg-4)", fontSize: 11 }}>· {task}</span>
        {split ? (
          <span style={{ color: "var(--fg-4)", fontSize: 11 }}>· {split}</span>
        ) : null}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            color: "var(--fg-3)",
          }}
        >
          {dataset.examples_count} example{dataset.examples_count === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() =>
            build.mutate({ dataset_name: dataset.name, classifier: isClassifier })
          }
          disabled={build.isPending}
          style={{
            padding: "3px 8px",
            borderRadius: 4,
            background: build.isPending ? "var(--canvas-3)" : "var(--canvas-2)",
            color: "var(--fg-1)",
            border: "1px solid var(--border-soft)",
            fontSize: 10.5,
            fontFamily: "var(--font-mono)",
            cursor: build.isPending ? "default" : "pointer",
          }}
          title={`sentinel finetune ${isClassifier ? "classifier" : "dataset"} build ${dataset.name}`}
        >
          {build.isPending ? "build…" : "build"}
        </button>
      </div>
      <div style={{ color: "var(--fg-4)", fontSize: 10.5, marginTop: 3 }}>{dataset.path}</div>
      {build.data ? (
        <div
          style={{
            fontSize: 10.5,
            color: "var(--state-healthy-fg)",
            marginTop: 3,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {build.data.message}
        </div>
      ) : null}
      {build.isError ? (
        <div style={{ fontSize: 10.5, color: "var(--state-down-fg)", marginTop: 3 }}>
          build failed — {(build.error as Error).message}
        </div>
      ) : null}
    </div>
  );
}

export function RecipeRow({ recipe, last }: { recipe: FinetuneRecipe; last: boolean }) {
  const r = recipe.recipe ?? {};
  const baseModel =
    typeof r.base_model_id === "string" ? (r.base_model_id as string) : undefined;
  const lr = typeof r.learning_rate === "number" ? (r.learning_rate as number) : undefined;
  const epochs =
    typeof r.num_train_epochs === "number" ? (r.num_train_epochs as number) : undefined;
  const summary = [
    baseModel ? `base ${baseModel}` : null,
    lr != null ? `lr ${lr}` : null,
    epochs != null ? `${epochs} epochs` : null,
  ]
    .filter((x): x is string => x !== null)
    .join(" · ");
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      <div style={{ color: "var(--fg-1)" }}>{recipe.name}</div>
      {summary ? (
        <div style={{ color: "var(--fg-3)", fontSize: 11, marginTop: 2 }}>{summary}</div>
      ) : null}
      <div style={{ color: "var(--fg-4)", fontSize: 10.5, marginTop: 3 }}>{recipe.path}</div>
    </div>
  );
}

export function TrainingRunRow({ run, last }: { run: FinetuneRun; last: boolean }) {
  const dot: DotState = run.latest_checkpoint ? "healthy" : "unknown";
  const [modelId, setModelId] = useState<string>("");
  const [ggufPath, setGgufPath] = useState<string>("");
  const [expanded, setExpanded] = useState<boolean>(false);
  const register = useSentinelRegisterFinetuneModel();
  const promote = useSentinelPromoteFinetuneModel();
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: last ? "none" : "1px solid var(--border-soft)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      <div className="flex items-center gap-2">
        <span className={`ds-dot ds-dot--${dot}`} aria-hidden />
        <span style={{ color: "var(--fg-1)" }}>{run.name}</span>
        <span style={{ color: "var(--fg-4)", fontSize: 11 }}>
          · {run.checkpoints.length} checkpoint
          {run.checkpoints.length === 1 ? "" : "s"}
        </span>
        {run.latest_checkpoint ? (
          <span style={{ color: "var(--fg-3)", fontSize: 11 }}>
            · latest {run.latest_checkpoint}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          style={{
            marginLeft: "auto",
            padding: "3px 8px",
            borderRadius: 4,
            background: "var(--canvas-2)",
            color: "var(--fg-1)",
            border: "1px solid var(--border-soft)",
            fontSize: 10.5,
            cursor: "pointer",
          }}
        >
          {expanded ? "hide" : "register / promote"}
        </button>
      </div>
      <div style={{ color: "var(--fg-4)", fontSize: 10.5, marginTop: 3 }}>{run.path}</div>
      {expanded ? (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            background: "var(--canvas-1)",
            borderRadius: 5,
            display: "grid",
            gridTemplateColumns: "minmax(160px, 1fr) minmax(220px, 2fr) auto auto",
            gap: 8,
            alignItems: "end",
          }}
        >
          <input
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="model_registry id (e.g. gemma-4-sft-v1)"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "5px 8px",
              borderRadius: 4,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              color: "var(--fg-1)",
            }}
          />
          <input
            type="text"
            value={ggufPath}
            onChange={(e) => setGgufPath(e.target.value)}
            placeholder="path to exported .gguf"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "5px 8px",
              borderRadius: 4,
              background: "var(--canvas-2)",
              border: "1px solid var(--border-soft)",
              color: "var(--fg-1)",
            }}
          />
          <button
            type="button"
            onClick={() =>
              register.mutate({ model_id: modelId.trim(), gguf: ggufPath.trim() })
            }
            disabled={register.isPending || !modelId.trim() || !ggufPath.trim()}
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              background:
                register.isPending || !modelId.trim() || !ggufPath.trim()
                  ? "var(--canvas-3)"
                  : "var(--canvas-2)",
              color: "var(--fg-1)",
              border: "1px solid var(--border-soft)",
              fontSize: 11,
              cursor: register.isPending ? "default" : "pointer",
            }}
          >
            {register.isPending ? "register…" : "register"}
          </button>
          <button
            type="button"
            onClick={() => promote.mutate({ model_id: modelId.trim() })}
            disabled={promote.isPending || !modelId.trim()}
            style={{
              padding: "5px 10px",
              borderRadius: 4,
              background:
                promote.isPending || !modelId.trim()
                  ? "var(--canvas-3)"
                  : "var(--ember-400)",
              color:
                promote.isPending || !modelId.trim()
                  ? "var(--fg-3)"
                  : "var(--fg-on-accent)",
              border: "none",
              fontSize: 11,
              fontWeight: 500,
              cursor: promote.isPending ? "default" : "pointer",
            }}
          >
            {promote.isPending ? "promote…" : "promote"}
          </button>
          {(register.data || register.isError || promote.data || promote.isError) ? (
            <div
              style={{
                gridColumn: "1 / -1",
                fontSize: 10.5,
                color: register.isError || promote.isError
                  ? "var(--state-down-fg)"
                  : "var(--state-healthy-fg)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {register.isError
                ? `register failed: ${(register.error as Error).message}`
                : register.data?.message ?? ""}
              {promote.isError
                ? ` · promote failed: ${(promote.error as Error).message}`
                : promote.data?.message
                  ? ` · ${promote.data.message}`
                  : ""}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
