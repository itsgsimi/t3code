import { useEffect, useState } from "react";

import {
  useSentinelAgentFile,
  useSentinelDeleteAgentFile,
  useSentinelWriteAgentFile,
} from "../../../../sentinel/hooks";
import { useConfirm } from "../../primitives";
import { Card } from "../_shared";
import { relativeFromTimestamp } from "../diagnostics/diagnosticsHelpers";

export function AgentFileEditor({
  path,
  onDeleted,
}: {
  path: string;
  onDeleted: () => void;
}) {
  const file = useSentinelAgentFile(path);
  const write = useSentinelWriteAgentFile();
  const del = useSentinelDeleteAgentFile();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<string>("");
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  useEffect(() => {
    if (file.data && file.data.path === path && loadedPath !== path) {
      setDraft(file.data.content);
      setLoadedPath(path);
    }
  }, [file.data, path, loadedPath]);

  const dirty = loadedPath === path && draft !== (file.data?.content ?? "");
  const saveLabel = write.isPending ? "Saving…" : dirty ? "Save" : "Saved";

  return (
    <Card>
      <div
        className="flex items-center gap-2"
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-soft)",
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
        }}
      >
        <span style={{ color: "var(--fg-2)", flex: 1 }}>agents/{path}</span>
        <span style={{ color: "var(--fg-4)", fontSize: 10.5 }}>
          {file.data ? `${file.data.size_bytes} B · ${relativeFromTimestamp(file.data.mtime)}` : ""}
        </span>
        <button
          type="button"
          onClick={() => write.mutate({ path, content: draft })}
          disabled={write.isPending || !dirty}
          style={{
            padding: "4px 10px",
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
        <button
          type="button"
          onClick={async () => {
            const ok = await confirm({
              title: `Delete agents/${path}?`,
              body: "This cannot be undone.",
              destructive: true,
              confirmLabel: "Delete",
            });
            if (ok) del.mutate(path, { onSuccess: onDeleted });
          }}
          disabled={del.isPending}
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            background: "var(--canvas-2)",
            color: "var(--state-down-fg)",
            border: "1px solid var(--border-soft)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
      {file.isLoading ? (
        <div style={{ padding: 16, color: "var(--fg-4)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          Loading…
        </div>
      ) : file.isError ? (
        <div style={{ padding: 16, color: "var(--state-down-fg)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          Failed to read file.
        </div>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          style={{
            display: "block",
            width: "100%",
            minHeight: 480,
            padding: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.55,
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
          Save failed: {(write.error as Error).message}
        </div>
      ) : null}
    </Card>
  );
}
