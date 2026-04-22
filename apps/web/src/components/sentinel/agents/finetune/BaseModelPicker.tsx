import { useEffect, useMemo, useState } from "react";

import {
  useSentinelLocalModels,
  useSetFinetuneBaseModel,
} from "../../../../sentinel/hooks";

export function BaseModelPicker({
  currentId,
  currentPath,
}: {
  currentId: string;
  currentPath: string;
}) {
  const localModels = useSentinelLocalModels();
  const setBase = useSetFinetuneBaseModel();
  const [selected, setSelected] = useState<string>("");

  const options = useMemo(() => {
    const entries = localModels.data?.entries ?? [];
    return entries.filter((e) => e.kind === "hf-dir");
  }, [localModels.data]);

  useEffect(() => {
    if (!selected && currentPath) {
      setSelected(currentPath);
    }
  }, [currentPath, selected]);

  const handleSave = () => {
    const hit = options.find((o) => o.path === selected);
    if (!hit) return;
    setBase.mutate({ baseModelId: hit.name, baseModelPath: hit.path });
  };

  const dirty = selected !== "" && selected !== currentPath;
  const disabled = !dirty || setBase.isPending || localModels.isLoading;

  return (
    <div
      style={{
        padding: "0 16px 16px",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        color: "var(--fg-2)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--fg-4)" }}>base model</div>
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={localModels.isLoading}
          style={{
            flex: 1,
            background: "var(--canvas-2)",
            color: "var(--fg-1)",
            border: "1px solid var(--border-default)",
            borderRadius: 4,
            padding: "4px 6px",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          {currentId && !options.some((o) => o.path === currentPath) ? (
            <option value={currentPath}>{currentId} (current, not in models/)</option>
          ) : null}
          {options.map((o) => (
            <option key={o.path} value={o.path}>
              {o.name} · {o.kind}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            border: "1px solid var(--border-default)",
            background: disabled ? "var(--canvas-3)" : "var(--ember-400)",
            color: disabled ? "var(--fg-4)" : "var(--fg-on-accent)",
            cursor: disabled ? "default" : "pointer",
            fontSize: 11.5,
            fontFamily: "var(--font-mono)",
          }}
        >
          {setBase.isPending ? "saving…" : "save"}
        </button>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--fg-4)" }}>
        path: {selected || currentPath || "—"}
      </div>
      {setBase.isError ? (
        <div style={{ color: "var(--state-down-fg)", fontSize: 11 }}>
          {(setBase.error as Error).message}
        </div>
      ) : null}
      {setBase.isSuccess ? (
        <div style={{ color: "var(--fg-3)", fontSize: 11 }}>
          saved — new recipes will pick up this base. Existing recipes keep their own.
        </div>
      ) : null}
    </div>
  );
}
