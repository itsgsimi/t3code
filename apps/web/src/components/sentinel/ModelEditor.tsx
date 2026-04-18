import { useState, type CSSProperties, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";

import { useCreateRegistryEntry, useUpdateRegistryEntry } from "../../sentinel/hooks";

/**
 * ModelEditor — llama.cpp config editor for a single model registry entry.
 * Opens as a centred modal. Used for both "add new" (key editable, POST)
 * and "edit existing" (key readonly, PATCH) flows. All fields are optional
 * except file; empty inputs are interpreted as "field not set" and the
 * backend removes them from the YAML entry.
 */
export function ModelEditor({
  mode,
  initialKey,
  initialEntry,
  onClose,
}: {
  mode: "add" | "edit";
  initialKey?: string;
  initialEntry?: Record<string, unknown>;
  onClose: () => void;
}) {
  const [key, setKey] = useState(initialKey ?? "");
  const [form, setForm] = useState<FormState>(() => fromEntry(initialEntry ?? {}));
  const createMut = useCreateRegistryEntry();
  const updateMut = useUpdateRegistryEntry();
  const mutation = mode === "add" ? createMut : updateMut;

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    const entry = toEntry(form);
    try {
      if (mode === "add") {
        if (!key.trim()) return;
        await createMut.mutateAsync({ key: key.trim(), entry });
      } else {
        if (!initialKey) return;
        await updateMut.mutateAsync({ key: initialKey, entry });
      }
      onClose();
    } catch {
      // error rendered inline
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0% 0 0 / 0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 24px",
        overflow: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          background: "var(--canvas-1)",
          border: "1px solid var(--border-default)",
          borderRadius: 8,
          boxShadow: "0 8px 24px oklch(0% 0 0 / 0.5), 0 1px 0 oklch(0% 0 0 / 0.35)",
        }}
      >
        <header
          className="flex items-center gap-3"
          style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-soft)" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 600,
              color: "var(--fg-1)",
              margin: 0,
            }}
          >
            {mode === "add" ? "Add model" : "Edit model"}
          </h2>
          {initialKey ? (
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-3)",
                background: "var(--canvas-3)",
                padding: "2px 7px",
                borderRadius: 3,
              }}
            >
              {initialKey}
            </code>
          ) : null}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer border-0 bg-transparent"
            style={{ color: "var(--fg-3)", padding: 4 }}
          >
            <X size={16} />
          </button>
        </header>

        <div style={{ padding: 18, maxHeight: "70vh", overflow: "auto" }}>
          {mode === "add" ? (
            <Section title="Identity">
              <Field label="registry key" hint="Unique ID — e.g. qwen3.6-35b-thinking" required>
                <TextInput value={key} onChange={setKey} placeholder="my-model-key" mono />
              </Field>
              <TextField
                label="display name"
                hint="Friendly label shown in UI"
                value={form.name}
                onChange={(v) => set("name", v)}
              />
              <TextField
                label="file"
                hint="Path under repo — e.g. models/Qwen3.6-35B.gguf"
                value={form.file}
                onChange={(v) => set("file", v)}
                mono
                required
              />
              <TextField
                label="provider"
                hint="llama.cpp · local · openai"
                value={form.provider}
                onChange={(v) => set("provider", v)}
              />
            </Section>
          ) : (
            <Section title="Identity">
              <TextField label="display name" value={form.name} onChange={(v) => set("name", v)} />
              <TextField
                label="file"
                value={form.file}
                onChange={(v) => set("file", v)}
                mono
                required
              />
              <TextField
                label="provider"
                value={form.provider}
                onChange={(v) => set("provider", v)}
              />
            </Section>
          )}

          <Section title="Runtime">
            <IntField
              label="port"
              hint="HTTP port — e.g. 6969"
              value={form.port}
              onChange={(v) => set("port", v)}
            />
            <IntField
              label="context_length"
              hint="Max tokens in the context window. Match this to --ctx-size on the server."
              value={form.context_length}
              onChange={(v) => set("context_length", v)}
            />
            <IntField
              label="gpu_layers"
              hint="--n-gpu-layers (999 = offload everything)"
              value={form.gpu_layers}
              onChange={(v) => set("gpu_layers", v)}
            />
            <BoolField
              label="no_mmap"
              hint="Critical on Strix Halo unified memory"
              value={form.no_mmap}
              onChange={(v) => set("no_mmap", v)}
            />
            <BoolField
              label="flash_attention"
              value={form.flash_attention}
              onChange={(v) => set("flash_attention", v)}
            />
            <BoolField
              label="always_on"
              value={form.always_on}
              onChange={(v) => set("always_on", v)}
            />
            <BoolField
              label="jinja"
              hint="--jinja chat template support"
              value={form.jinja}
              onChange={(v) => set("jinja", v)}
            />
          </Section>

          <Section title="Performance">
            <IntField
              label="batch_size"
              value={form.batch_size}
              onChange={(v) => set("batch_size", v)}
            />
            <IntField
              label="ubatch_size"
              value={form.ubatch_size}
              onChange={(v) => set("ubatch_size", v)}
            />
            <IntField label="threads" value={form.threads} onChange={(v) => set("threads", v)} />
            <IntField
              label="threads_batch"
              value={form.threads_batch}
              onChange={(v) => set("threads_batch", v)}
            />
            <IntField
              label="parallel"
              hint="Concurrent slots. 1 for thinking, 2 for MoE, 4 for small dense."
              value={form.parallel}
              onChange={(v) => set("parallel", v)}
            />
          </Section>

          <Section title="Cache">
            <SelectField
              label="cache_type_k"
              value={form.cache_type_k}
              onChange={(v) => set("cache_type_k", v)}
              options={["", "f16", "f32", "bf16", "q8_0", "q4_0", "q5_1"]}
            />
            <SelectField
              label="cache_type_v"
              value={form.cache_type_v}
              onChange={(v) => set("cache_type_v", v)}
              options={["", "f16", "f32", "bf16", "q8_0", "q4_0", "q5_1"]}
            />
          </Section>

          <Section title="Chat template & reasoning">
            <TextField
              label="chat_template_kwargs"
              hint='JSON string e.g. {"enable_thinking":true,"preserve_thinking":true}'
              value={form.chat_template_kwargs}
              onChange={(v) => set("chat_template_kwargs", v)}
              mono
            />
            <SelectField
              label="reasoning_format"
              value={form.reasoning_format}
              onChange={(v) => set("reasoning_format", v)}
              options={["", "none", "deepseek"]}
            />
          </Section>

          <Section title="Sampling">
            <BoolField
              label="allow_temperature"
              value={form.allow_temperature}
              onChange={(v) => set("allow_temperature", v)}
            />
            <FloatField label="top_p" value={form.top_p} onChange={(v) => set("top_p", v)} />
            <IntField label="top_k" value={form.top_k} onChange={(v) => set("top_k", v)} />
            <FloatField label="min_p" value={form.min_p} onChange={(v) => set("min_p", v)} />
            <FloatField
              label="repeat_penalty"
              value={form.repeat_penalty}
              onChange={(v) => set("repeat_penalty", v)}
            />
            <FloatField
              label="presence_penalty"
              value={form.presence_penalty}
              onChange={(v) => set("presence_penalty", v)}
            />
          </Section>

          {mutation.isError ? (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "var(--state-down-bg)",
                border: "1px solid var(--state-down-bg)",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--state-down-fg)",
              }}
            >
              {(mutation.error as Error).message}
            </div>
          ) : null}
        </div>

        <footer
          className="flex items-center gap-2"
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          <span
            style={{ flex: 1, fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}
          >
            {mode === "add"
              ? "Creates a new model_registry entry in config.yaml. Restart the target container for changes to take effect."
              : "Patches the model_registry entry in config.yaml. Empty fields clear the value."}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="cursor-pointer border-0"
            style={{
              padding: "6px 14px",
              borderRadius: 5,
              background: "var(--canvas-3)",
              color: "var(--fg-1)",
              border: "1px solid var(--border-soft)",
              fontSize: 12.5,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={mutation.isPending || (mode === "add" && !key.trim()) || !form.file.trim()}
            className="flex cursor-pointer items-center gap-2 border-0"
            style={{
              padding: "6px 14px",
              borderRadius: 5,
              background: mutation.isPending ? "var(--canvas-3)" : "var(--ember-400)",
              color: mutation.isPending ? "var(--fg-3)" : "var(--fg-on-accent)",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            {mode === "add" ? "Create" : "Save changes"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

/**
 * We keep all values as strings (even ints/floats) so empty inputs are
 * distinguishable from zero. toEntry() coerces to typed JSON before sending
 * to the backend.
 */
interface FormState {
  name: string;
  file: string;
  provider: string;
  port: string;
  context_length: string;
  gpu_layers: string;
  no_mmap: TriState;
  flash_attention: TriState;
  always_on: TriState;
  jinja: TriState;
  batch_size: string;
  ubatch_size: string;
  threads: string;
  threads_batch: string;
  parallel: string;
  cache_type_k: string;
  cache_type_v: string;
  chat_template_kwargs: string;
  reasoning_format: string;
  allow_temperature: TriState;
  top_p: string;
  top_k: string;
  min_p: string;
  repeat_penalty: string;
  presence_penalty: string;
}

type TriState = "" | "true" | "false";

function fromEntry(entry: Record<string, unknown>): FormState {
  const str = (k: string): string => {
    const v = entry[k];
    return v === undefined || v === null ? "" : String(v);
  };
  const tri = (k: string): TriState => {
    const v = entry[k];
    if (v === true) return "true";
    if (v === false) return "false";
    return "";
  };
  return {
    name: str("name"),
    file: str("file"),
    provider: str("provider"),
    port: str("port"),
    context_length: str("context_length"),
    gpu_layers: str("gpu_layers"),
    no_mmap: tri("no_mmap"),
    flash_attention: tri("flash_attention"),
    always_on: tri("always_on"),
    jinja: tri("jinja"),
    batch_size: str("batch_size"),
    ubatch_size: str("ubatch_size"),
    threads: str("threads"),
    threads_batch: str("threads_batch"),
    parallel: str("parallel"),
    cache_type_k: str("cache_type_k"),
    cache_type_v: str("cache_type_v"),
    chat_template_kwargs: str("chat_template_kwargs"),
    reasoning_format: str("reasoning_format"),
    allow_temperature: tri("allow_temperature"),
    top_p: str("top_p"),
    top_k: str("top_k"),
    min_p: str("min_p"),
    repeat_penalty: str("repeat_penalty"),
    presence_penalty: str("presence_penalty"),
  };
}

function toEntry(form: FormState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // strings
  for (const k of [
    "name",
    "file",
    "provider",
    "cache_type_k",
    "cache_type_v",
    "chat_template_kwargs",
    "reasoning_format",
  ] as const) {
    const v = form[k];
    if (v.trim() === "") {
      out[k] = null; // PATCH removes; POST server validates
    } else {
      out[k] = v;
    }
  }
  // ints
  for (const k of [
    "port",
    "context_length",
    "gpu_layers",
    "batch_size",
    "ubatch_size",
    "threads",
    "threads_batch",
    "parallel",
    "top_k",
  ] as const) {
    const v = form[k];
    if (v.trim() === "") {
      out[k] = null;
    } else {
      const n = Number(v);
      if (Number.isFinite(n) && Number.isInteger(n)) out[k] = n;
    }
  }
  // floats
  for (const k of ["top_p", "min_p", "repeat_penalty", "presence_penalty"] as const) {
    const v = form[k];
    if (v.trim() === "") {
      out[k] = null;
    } else {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
  }
  // tri-bools
  for (const k of [
    "no_mmap",
    "flash_attention",
    "always_on",
    "jinja",
    "allow_temperature",
  ] as const) {
    const v = form[k];
    out[k] = v === "true" ? true : v === "false" ? false : null;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Form primitives
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset style={sectionStyle}>
      <legend style={legendStyle}>{title}</legend>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px minmax(0, 1fr)",
          rowGap: 8,
          columnGap: 12,
        }}
      >
        {children}
      </div>
    </fieldset>
  );
}

const sectionStyle: CSSProperties = {
  border: "1px solid var(--border-soft)",
  borderRadius: 6,
  padding: "14px 16px",
  marginBottom: 12,
  background: "var(--canvas-1)",
};

const legendStyle: CSSProperties = {
  padding: "0 6px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--fg-2)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
  required?: boolean | undefined;
}) {
  return (
    <>
      <label
        className="flex flex-col"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--fg-2)",
          paddingTop: 6,
        }}
      >
        <span>
          {label}
          {required ? <span style={{ color: "var(--ember-400)" }}> *</span> : null}
        </span>
        {hint ? (
          <span style={{ color: "var(--fg-4)", fontSize: 10.5, marginTop: 2 }}>{hint}</span>
        ) : null}
      </label>
      <div>{children}</div>
    </>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  mono?: boolean | undefined;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "6px 8px",
        background: "var(--canvas-3)",
        border: "1px solid var(--border-soft)",
        borderRadius: 4,
        color: "var(--fg-1)",
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: 12,
        outline: "none",
      }}
    />
  );
}

function TextField({
  label,
  hint,
  value,
  onChange,
  mono,
  required,
}: {
  label: string;
  hint?: string | undefined;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean | undefined;
  required?: boolean | undefined;
}) {
  return (
    <Field label={label} hint={hint} required={required}>
      <TextInput value={value} onChange={onChange} mono={mono} />
    </Field>
  );
}

function IntField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string | undefined;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={numberInputStyle}
      />
    </Field>
  );
}

function FloatField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string | undefined;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={numberInputStyle}
      />
    </Field>
  );
}

const numberInputStyle: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  background: "var(--canvas-3)",
  border: "1px solid var(--border-soft)",
  borderRadius: 4,
  color: "var(--fg-1)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  outline: "none",
};

function BoolField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string | undefined;
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-1">
        {(["", "true", "false"] as const).map((v) => (
          <button
            key={v || "unset"}
            type="button"
            onClick={() => onChange(v)}
            className="cursor-pointer border-0"
            style={{
              padding: "5px 12px",
              borderRadius: 4,
              background: value === v ? "var(--canvas-4)" : "var(--canvas-3)",
              color: value === v ? "var(--fg-1)" : "var(--fg-3)",
              border: `1px solid ${value === v ? "var(--border-default)" : "var(--border-soft)"}`,
              fontSize: 11.5,
              fontFamily: "var(--font-mono)",
            }}
          >
            {v === "" ? "unset" : v}
          </button>
        ))}
      </div>
    </Field>
  );
}

function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string | undefined;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={numberInputStyle}>
        {options.map((o) => (
          <option key={o || "unset"} value={o}>
            {o || "— unset —"}
          </option>
        ))}
      </select>
    </Field>
  );
}
