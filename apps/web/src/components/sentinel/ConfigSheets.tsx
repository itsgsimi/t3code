import { useState } from "react";
import { Save } from "lucide-react";

import {
  KV,
  NumberInput,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  SheetSection,
  SmartText,
  TextInput,
  TriBool,
} from "./configPrimitives";
import type { McpServer } from "./ConfigSectionMcp";
import type { MemoryValues } from "./ConfigSectionMemory";

/**
 * DetailSheet form bodies — the content that fills the right rail when the
 * user opens a nested config item. Each form manages its own draft state,
 * commits via onSave, and closes via onClose.
 */

// ---------------------------------------------------------------------------
// dream.prune
// ---------------------------------------------------------------------------

export function PruneForm({
  node,
  onSave,
  onClose,
}: {
  node: MemoryValues["dream"]["prune"];
  onSave: (patch: MemoryValues["dream"]["prune"]) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState(node);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));
  return (
    <>
      <SheetSection title="Prune policy">
        <KV label="min_age_days" hint="Facts younger than this are never pruned.">
          <NumberInput value={f.min_age_days} onChange={(v) => set("min_age_days", v)} />
        </KV>
        <KV
          label="decay_threshold"
          hint="Facts with decay score below this are eligible. 0–1."
        >
          <NumberInput
            value={f.decay_threshold}
            step={0.05}
            onChange={(v) => set("decay_threshold", v)}
          />
        </KV>
        <KV
          label="max_candidates"
          hint="Ceiling per dream run. Soft limit; dream may stop earlier."
        >
          <NumberInput value={f.max_candidates} onChange={(v) => set("max_candidates", v)} />
        </KV>
      </SheetSection>
      <SheetFooter onClose={onClose} onSave={() => onSave(f)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// dream.discord
// ---------------------------------------------------------------------------

export function DiscordForm({
  node,
  onSave,
  onClose,
}: {
  node: MemoryValues["dream"]["discord"];
  onSave: (patch: MemoryValues["dream"]["discord"]) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState(node);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));
  return (
    <>
      <SheetSection title="Dream reports → Discord">
        <KV label="enabled">
          <TriBool value={f.enabled} onChange={(v) => set("enabled", v)} />
        </KV>
        <KV label="report_channel_id" hint="Numeric Discord channel ID.">
          <NumberInput
            value={f.report_channel_id}
            onChange={(v) => set("report_channel_id", v)}
          />
        </KV>
        <KV
          label="webhook_url (optional)"
          hint="Overrides the bot if set. Paste the webhook."
        >
          <SmartText
            value={f.webhook_url ?? ""}
            onChange={(v) => set("webhook_url", v)}
          />
        </KV>
      </SheetSection>
      <SheetFooter onClose={onClose} onSave={() => onSave(f)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// mcp item (edit or add)
// ---------------------------------------------------------------------------

export function McpItemForm({
  isNew,
  name: initialName,
  item,
  onSave,
  onClose,
}: {
  isNew: boolean;
  name?: string | undefined;
  item?: McpServer | undefined;
  onSave: (name: string, form: McpServer) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [form, setForm] = useState<McpServer>(
    item ?? {
      transport: "streamable-http",
      hostname: "localhost",
      port: 8080,
      endpoint: "/mcp",
      description: "",
      always_on: false,
      eval_safe: true,
    },
  );
  const set = <K extends keyof McpServer>(k: K, v: McpServer[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <SheetSection title="Identity">
        {isNew ? (
          <KV label="name" hint="Unique key under mcp_servers" required>
            <TextInput mono value={name} onChange={setName} />
          </KV>
        ) : null}
        <KV label="description">
          <TextInput
            value={form.description ?? ""}
            onChange={(v) => set("description", v)}
          />
        </KV>
      </SheetSection>

      <SheetSection title="Transport">
        <KV label="transport">
          <SelectField
            value={form.transport}
            onChange={(v) => set("transport", v)}
            options={["stdio", "streamable-http", "sse", "http"]}
          />
        </KV>
        {form.transport === "stdio" ? (
          <>
            <KV label="command" hint='e.g. "docker"'>
              <TextInput
                mono
                value={form.command ?? ""}
                onChange={(v) => set("command", v)}
              />
            </KV>
            <KV label="args" hint="JSON array — passed verbatim.">
              <TextInput
                mono
                value={form.args ?? "[]"}
                onChange={(v) => set("args", v)}
              />
            </KV>
          </>
        ) : (
          <>
            <KV label="hostname">
              <TextInput
                mono
                value={form.hostname ?? ""}
                onChange={(v) => set("hostname", v)}
              />
            </KV>
            <KV label="port">
              <NumberInput value={form.port ?? null} onChange={(v) => set("port", v)} />
            </KV>
            <KV label="endpoint">
              <TextInput
                mono
                value={form.endpoint ?? ""}
                onChange={(v) => set("endpoint", v)}
              />
            </KV>
          </>
        )}
      </SheetSection>

      <SheetSection title="Behaviour">
        <KV label="always_on" hint="Connect on startup; otherwise lazy.">
          <TriBool value={form.always_on} onChange={(v) => set("always_on", v)} />
        </KV>
        <KV
          label="eval_safe"
          hint="Set false for servers that touch real-world devices."
        >
          <TriBool value={form.eval_safe} onChange={(v) => set("eval_safe", v)} />
        </KV>
      </SheetSection>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <div
          style={{
            flex: 1,
            fontSize: 10.5,
            color: "var(--fg-4)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Saves into config.yaml · mcp_servers. Restart the API to reconnect.
        </div>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton
          onClick={() => onSave(name, form)}
          disabled={isNew && !name.trim()}
          Icon={Save}
        >
          {isNew ? "Create" : "Save changes"}
        </PrimaryButton>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared footer for simple sheets
// ---------------------------------------------------------------------------

function SheetFooter({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
      <div style={{ flex: 1 }} />
      <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
      <PrimaryButton onClick={onSave} Icon={Save}>
        Save changes
      </PrimaryButton>
    </div>
  );
}
