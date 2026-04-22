import { useEffect, useMemo, useState } from "react";

import type { AgentEntry, AgentFileEntry } from "../../../../sentinel/api";

interface AgentTreeFolder {
  folders: Map<string, AgentTreeFolder>;
  files: AgentFileEntry[];
}

export function buildAgentTree(agentName: string, files: AgentFileEntry[]): AgentTreeFolder {
  const root: AgentTreeFolder = { folders: new Map(), files: [] };
  const prefix = `${agentName}/`;
  for (const f of files) {
    const rel = f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path;
    const parts = rel.split("/");
    let cursor = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const dir = parts[i] ?? "";
      let next = cursor.folders.get(dir);
      if (!next) {
        next = { folders: new Map(), files: [] };
        cursor.folders.set(dir, next);
      }
      cursor = next;
    }
    cursor.files.push(f);
  }
  return root;
}

export function AgentTreeNode({
  agent,
  selectedPath,
  onSelect,
}: {
  agent: AgentEntry;
  selectedPath: string | null;
  onSelect: (p: string) => void;
}) {
  const tree = useMemo(() => buildAgentTree(agent.name, agent.files), [agent]);
  return (
    <div style={{ borderBottom: "1px solid var(--border-soft)" }}>
      <div
        style={{
          padding: "8px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--fg-2)",
          background: "var(--canvas-1)",
        }}
      >
        {agent.name}/
      </div>
      <AgentTreeFolderView
        folder={tree}
        depth={1}
        selectedPath={selectedPath}
        onSelect={onSelect}
      />
    </div>
  );
}

export function AgentTreeFolderView({
  folder,
  depth,
  selectedPath,
  onSelect,
}: {
  folder: AgentTreeFolder;
  depth: number;
  selectedPath: string | null;
  onSelect: (p: string) => void;
}) {
  const folderNames = Array.from(folder.folders.keys()).sort();
  return (
    <>
      {folderNames.map((name) => {
        const child = folder.folders.get(name);
        if (!child) return null;
        return (
          <AgentTreeCollapsibleFolder
            key={name}
            name={name}
            folder={child}
            depth={depth}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        );
      })}
      {folder.files.map((f) => (
        <AgentTreeFileRow
          key={f.path}
          file={f}
          depth={depth}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function AgentTreeCollapsibleFolder({
  name,
  folder,
  depth,
  selectedPath,
  onSelect,
}: {
  name: string;
  folder: AgentTreeFolder;
  depth: number;
  selectedPath: string | null;
  onSelect: (p: string) => void;
}) {
  const containsSelected = useMemo(() => {
    if (!selectedPath) return false;
    const stack: AgentTreeFolder[] = [folder];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (cur.files.some((f) => f.path === selectedPath)) return true;
      for (const child of cur.folders.values()) stack.push(child);
    }
    return false;
  }, [folder, selectedPath]);
  const [open, setOpen] = useState(containsSelected);
  useEffect(() => {
    if (containsSelected) setOpen(true);
  }, [containsSelected]);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: `5px 14px 5px ${10 + depth * 12}px`,
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--fg-2)",
          background: "transparent",
          border: "none",
          borderLeft: "2px solid transparent",
          cursor: "pointer",
        }}
      >
        <span style={{ color: "var(--fg-4)", marginRight: 6 }}>{open ? "▾" : "▸"}</span>
        <span>{name}/</span>
      </button>
      {open ? (
        <AgentTreeFolderView
          folder={folder}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ) : null}
    </div>
  );
}

export function AgentTreeFileRow({
  file,
  depth,
  selectedPath,
  onSelect,
}: {
  file: AgentFileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (p: string) => void;
}) {
  const selected = selectedPath === file.path;
  return (
    <button
      type="button"
      onClick={() => onSelect(file.path)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: `6px 14px 6px ${14 + depth * 12}px`,
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        color: selected ? "var(--fg-1)" : "var(--fg-3)",
        background: selected ? "var(--canvas-3)" : "transparent",
        border: "none",
        borderLeft: selected ? "2px solid var(--ember-400)" : "2px solid transparent",
        cursor: "pointer",
      }}
    >
      <span>{file.name}</span>
      <span style={{ color: "var(--fg-4)", fontSize: 10, marginLeft: 8 }}>
        {formatBytes(file.size_bytes)}
      </span>
    </button>
  );
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}
