import {
  useSentinelFinetuneDatasets,
  useSentinelFinetuneRecipes,
  useSentinelFinetuneRuns,
  useSentinelFinetuneStatus,
} from "../../../../sentinel/hooks";
import { Card, CardHead, EmptyCard, KV } from "../_shared";
import { BaseModelPicker } from "./BaseModelPicker";
import { FinetuneModeCard } from "./FinetuneModeCard";
import { TraceExportCard } from "./TraceExportCard";
import { SynthesizeCard } from "./SynthesizeCard";
import { TrainCard } from "./TrainCard";
import { RecipeEditorCard } from "./RecipeEditorCard";
import {
  DatasetRow,
  FinetuneListCard,
  RecipeRow,
  TrainingRunRow,
} from "./FinetuneListCard";

export function FineTuneTab() {
  const status = useSentinelFinetuneStatus();
  const datasets = useSentinelFinetuneDatasets();
  const recipes = useSentinelFinetuneRecipes();
  const runs = useSentinelFinetuneRuns();

  if (status.isError) {
    return (
      <EmptyCard>
        Can't reach /v1/finetune/status — {(status.error as Error).message}
      </EmptyCard>
    );
  }
  const s = status.data;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHead>Workspace</CardHead>
        <div
          style={{
            padding: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            color: "var(--fg-2)",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            columnGap: 28,
            rowGap: 0,
          }}
        >
          <KV label="target role" value={s?.target_role ?? "—"} />
          <KV label="target registry" value={s?.target_registry ?? "—"} />
          <KV label="workspace dir" value={s?.workspace_dir ?? "—"} />
          <KV label="default dataset" value={s?.default_dataset_name ?? "—"} />
          <KV label="default recipe" value={s?.default_recipe_name ?? "—"} />
          <KV label="python bin" value={s?.python_bin ?? "—"} />
        </div>
        <BaseModelPicker
          currentId={s?.base_model_id ?? ""}
          currentPath={s?.base_model_path ?? ""}
        />
      </Card>

      <FinetuneModeCard />

      <TraceExportCard />

      <SynthesizeCard />

      <TrainCard />

      <RecipeEditorCard />

      <FinetuneListCard
        title="Datasets"
        count={datasets.data?.datasets.length ?? 0}
        loading={datasets.isLoading}
        error={datasets.isError ? (datasets.error as Error).message : null}
        empty="No datasets yet — scaffold one via `uv run sentinel finetune dataset init`."
      >
        {(datasets.data?.datasets ?? []).map((d, i, arr) => (
          <DatasetRow key={d.name} dataset={d} last={i === arr.length - 1} />
        ))}
      </FinetuneListCard>

      <FinetuneListCard
        title="Recipes"
        count={recipes.data?.recipes.length ?? 0}
        loading={recipes.isLoading}
        error={recipes.isError ? (recipes.error as Error).message : null}
        empty="No recipes yet — scaffold via `uv run sentinel finetune recipe render`."
      >
        {(recipes.data?.recipes ?? []).map((r, i, arr) => (
          <RecipeRow key={r.name} recipe={r} last={i === arr.length - 1} />
        ))}
      </FinetuneListCard>

      <FinetuneListCard
        title="Training runs"
        count={runs.data?.runs.length ?? 0}
        loading={runs.isLoading}
        error={runs.isError ? (runs.error as Error).message : null}
        empty="No training runs recorded yet. Kick one with `uv run sentinel finetune train`."
      >
        {(runs.data?.runs ?? []).map((r, i, arr) => (
          <TrainingRunRow key={r.name} run={r} last={i === arr.length - 1} />
        ))}
      </FinetuneListCard>
    </div>
  );
}
