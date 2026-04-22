import { useEffect, useState } from "react";

import {
  useSentinelRecipeFile,
  useSentinelRecipesList,
  useSentinelWriteRecipeFile,
} from "../../../../sentinel/hooks";
import { Card, CardHead } from "../_shared";

export function RecipeEditorCard() {
  const list = useSentinelRecipesList();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const file = useSentinelRecipeFile(selectedPath);
  const write = useSentinelWriteRecipeFile();
  const [draft, setDraft] = useState<string>("");
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  const recipes = list.data?.recipes ?? [];
  useEffect(() => {
    if (!selectedPath && recipes.length > 0) {
      setSelectedPath(recipes[0]!.name);
    }
  }, [selectedPath, recipes]);

  useEffect(() => {
    if (file.data && file.data.path === selectedPath && loadedPath !== selectedPath) {
      setDraft(file.data.content);
      setLoadedPath(selectedPath);
    }
  }, [file.data, selectedPath, loadedPath]);

  const dirty = loadedPath === selectedPath && draft !== (file.data?.content ?? "");
  const saveLabel = write.isPending ? "Saving…" : dirty ? "Save" : "Saved";

  return (
    <Card>
      <CardHead>
        <span>Recipes</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10.5,
            color: "var(--fg-4)",
          }}
        >
          finetune/recipes/*.yaml
        </span>
      </CardHead>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "minmax(200px, 240px) minmax(0, 1fr)" }}
      >
        <div style={{ borderRight: "1px solid var(--border-soft)" }}>
          {list.isLoading ? (
            <div
              style={{ padding: 14, color: "var(--fg-4)", fontSize: 12, fontFamily: "var(--font-mono)" }}
            >
              Loading…
            </div>
          ) : recipes.length === 0 ? (
            <div
              style={{ padding: 14, color: "var(--fg-3)", fontSize: 12, fontFamily: "var(--font-mono)" }}
            >
              No recipes yet.
            </div>
          ) : (
            recipes.map((r) => {
              const selected = selectedPath === r.name;
              return (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => setSelectedPath(r.name)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 14px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    color: selected ? "var(--fg-1)" : "var(--fg-3)",
                    background: selected ? "var(--canvas-3)" : "transparent",
                    border: "none",
                    borderLeft: selected
                      ? "2px solid var(--ember-400)"
                      : "2px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  {r.name}
                  <span style={{ color: "var(--fg-4)", marginLeft: 8, fontSize: 10 }}>
                    {(r.size_bytes / 1024).toFixed(1)} KB
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div>
          {selectedPath ? (
            <div>
              <div
                className="flex items-center gap-2"
                style={{
                  padding: "8px 14px",
                  borderBottom: "1px solid var(--border-soft)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                }}
              >
                <span style={{ color: "var(--fg-2)", flex: 1 }}>{selectedPath}</span>
                <button
                  type="button"
                  onClick={() =>
                    write.mutate({ path: selectedPath, content: draft })
                  }
                  disabled={write.isPending || !dirty}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 4,
                    background: dirty ? "var(--ember-400)" : "var(--canvas-3)",
                    color: dirty ? "var(--fg-on-accent)" : "var(--fg-3)",
                    border: "none",
                    fontSize: 11,
                    cursor: dirty ? "pointer" : "default",
                  }}
                >
                  {saveLabel}
                </button>
              </div>
              {file.isLoading ? (
                <div style={{ padding: 14, color: "var(--fg-4)", fontSize: 12 }}>
                  Loading…
                </div>
              ) : file.isError ? (
                <div style={{ padding: 14, color: "var(--state-down-fg)", fontSize: 12 }}>
                  Failed to read recipe.
                </div>
              ) : (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  spellCheck={false}
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: 320,
                    padding: 12,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    background: "var(--canvas-1)",
                    color: "var(--fg-1)",
                    border: "none",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              )}
              {write.isError ? (
                <div
                  style={{
                    padding: "6px 14px",
                    borderTop: "1px solid var(--border-soft)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--state-down-fg)",
                  }}
                >
                  {(write.error as Error).message}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ padding: 14, fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
              Pick a recipe from the list.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
