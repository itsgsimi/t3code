import { useState, type CSSProperties, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { useCreateRegistryEntry, useUpdateRegistryEntry } from "../../sentinel/hooks";
import { DetailSheet } from "./DetailSheet";

/**
 * ModelEditor — llama.cpp config editor for a single model registry entry.
 * Renders as a right-side DetailSheet (takes the Beardy slot). Used for both
 * "add new" (key editable, POST) and "edit existing" (key readonly, PATCH)
 * flows. All fields are optional except file; empty inputs are interpreted
 * as "field not set" and the backend removes them from the YAML entry.
 */
export function ModelEditor({
  open,
  mode,
  initialKey,
  initialEntry,
  onClose,
}: {
  open: boolean;
  mode: "add" | "edit";
  initialKey?: string | undefined;
  initialEntry?: Record<string, unknown> | undefined;
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

  const saveDisabled = mutation.isPending || (mode === "add" && !key.trim()) || !form.file.trim();

  return (
    <DetailSheet
      open={open}
      title={mode === "add" ? "Add model" : (initialKey ?? "Edit model")}
      eyebrow={mode === "add" ? "new registry entry" : "model_registry"}
      onClose={onClose}
      width={480}
      footer={
        <div className="flex items-center gap-2">
          <span
            style={{ flex: 1, fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}
          >
            {mode === "add"
              ? "Creates a new entry in config.yaml. Restart the container to apply."
              : "Patches the entry in config.yaml. Empty fields clear the value."}
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
            disabled={saveDisabled}
            className="flex cursor-pointer items-center gap-2 border-0"
            style={{
              padding: "6px 14px",
              borderRadius: 5,
              background: saveDisabled ? "var(--canvas-3)" : "var(--ember-400)",
              color: saveDisabled ? "var(--fg-3)" : "var(--fg-on-accent)",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            {mode === "add" ? "Create" : "Save changes"}
          </button>
        </div>
      }
    >
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
          <SelectField
            label="kind"
            hint="runtime = served via llama-server · base = raw base model for fine-tuning"
            value={form.kind}
            onChange={(v) => set("kind", v)}
            options={["", "runtime", "base"]}
          />
          <SelectField
            label="base_family"
            hint="Architectural family — used by fine-tune pipeline"
            value={form.base_family}
            onChange={(v) => set("base_family", v)}
            options={["", "qwen3.5", "qwen3.6", "gemma-4", "other"]}
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
          <SelectField
            label="kind"
            value={form.kind}
            onChange={(v) => set("kind", v)}
            options={["", "runtime", "base"]}
          />
          <SelectField
            label="base_family"
            value={form.base_family}
            onChange={(v) => set("base_family", v)}
            options={["", "qwen3.5", "qwen3.6", "gemma-4", "other"]}
          />
        </Section>
      )}

      <Section title="Runtime">
        <IntField
          label="port"
          hint="HTTP port llama-server listens on (host-mode network, unique per role)"
          value={form.port}
          onChange={(v) => set("port", v)}
        />
        <IntField
          label="context_length"
          hint="Max tokens in the context window. Match --ctx-size on the server. 65536 is a safe default for 8 B-35 B models on Strix Halo."
          value={form.context_length}
          onChange={(v) => set("context_length", v)}
        />
        <IntField
          label="gpu_layers"
          hint="--n-gpu-layers. 999 = offload everything. Lower only if you're running alongside a dense model that also needs VRAM."
          value={form.gpu_layers}
          onChange={(v) => set("gpu_layers", v)}
        />
        <BoolField
          label="no_mmap  (APU)"
          hint="CRITICAL on Strix Halo unified memory. Leave this on — mmap on UMA causes random OOMs mid-gen."
          value={form.no_mmap}
          onChange={(v) => set("no_mmap", v)}
        />
        <BoolField
          label="flash_attention"
          hint="Enable -fa. Strong tok/s win on Strix Halo. Leave on unless a model refuses to load with it."
          value={form.flash_attention}
          onChange={(v) => set("flash_attention", v)}
        />
        <BoolField
          label="always_on"
          hint="Container autostarts when `sentinel llm up` runs. Turn off for occasional-use or experimental models."
          value={form.always_on}
          onChange={(v) => set("always_on", v)}
        />
        <BoolField
          label="jinja"
          hint="--jinja Jinja2 chat-template support. Required for Qwen3+ / Gemma chat format. Leave on."
          value={form.jinja}
          onChange={(v) => set("jinja", v)}
        />
      </Section>

      <Section title="Performance">
        <IntField
          label="batch_size"
          hint="Prompt prefill tokens per step. 2048 works well on Strix Halo; raise only if PP tok/s plateaus early."
          value={form.batch_size}
          onChange={(v) => set("batch_size", v)}
        />
        <IntField
          label="ubatch_size"
          hint="Physical GPU micro-batch. Usually = batch_size on Strix Halo (no split). Lower if you see VRAM pressure."
          value={form.ubatch_size}
          onChange={(v) => set("ubatch_size", v)}
        />
        <IntField
          label="threads"
          hint="CPU threads for generation. 8 is a good Strix Halo default (half of 16-core count)."
          value={form.threads}
          onChange={(v) => set("threads", v)}
        />
        <IntField
          label="threads_batch"
          hint="CPU threads during prefill (batch). 2× threads is typical."
          value={form.threads_batch}
          onChange={(v) => set("threads_batch", v)}
        />
        <IntField
          label="parallel"
          hint="Concurrent inference slots. 1 for thinking/deep-think (exclusive context), 2 for MoE, 4 for small classifiers."
          value={form.parallel}
          onChange={(v) => set("parallel", v)}
        />
      </Section>

      <Section title="Cache">
        <SelectField
          label="cache_type_k"
          hint="KV cache quant for keys. q8_0 is the Strix Halo sweet spot — halves cache memory with near-zero quality loss."
          value={form.cache_type_k}
          onChange={(v) => set("cache_type_k", v)}
          options={["", "f16", "f32", "bf16", "q8_0", "q4_0", "q5_1"]}
        />
        <SelectField
          label="cache_type_v"
          hint="KV cache quant for values. Use q8_0 to match keys. Lower (q4_0 / q5_1) trades noticeable quality for more headroom."
          value={form.cache_type_v}
          onChange={(v) => set("cache_type_v", v)}
          options={["", "f16", "f32", "bf16", "q8_0", "q4_0", "q5_1"]}
        />
      </Section>

      <Section title="Chat template & reasoning">
        <TextField
          label="chat_template_kwargs"
          hint='JSON passed through to the chat template. Qwen3 thinking: {"enable_thinking":true}'
          value={form.chat_template_kwargs}
          onChange={(v) => set("chat_template_kwargs", v)}
          mono
        />
        <SelectField
          label="reasoning_format"
          hint="How thinking-model output is emitted. 'none' = raw, 'deepseek' = <think>…</think> tags. Leave empty for auto-detect."
          value={form.reasoning_format}
          onChange={(v) => set("reasoning_format", v)}
          options={["", "none", "deepseek"]}
        />
      </Section>

      <Section title="Sampling">
        <BoolField
          label="allow_temperature"
          hint="When false, server forces temp=0 (deterministic). Turn off only for classifier roles where you want greedy decode."
          value={form.allow_temperature}
          onChange={(v) => set("allow_temperature", v)}
        />
        <FloatField
          label="top_p"
          hint="Nucleus sampling threshold. 0.95 is the common default; lower (0.8) tightens output."
          value={form.top_p}
          onChange={(v) => set("top_p", v)}
        />
        <IntField
          label="top_k"
          hint="Top-k sampling. 20-64 is typical; 0 disables."
          value={form.top_k}
          onChange={(v) => set("top_k", v)}
        />
        <FloatField
          label="min_p"
          hint="Minimum token probability relative to top. 0 disables. 0.05 is a conservative default."
          value={form.min_p}
          onChange={(v) => set("min_p", v)}
        />
        <FloatField
          label="repeat_penalty"
          hint="1.0 = off. 1.1-1.3 discourages loops in long generations."
          value={form.repeat_penalty}
          onChange={(v) => set("repeat_penalty", v)}
        />
        <FloatField
          label="presence_penalty"
          hint="Penalty for reusing any token already seen. 0-1.5 typical."
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
    </DetailSheet>
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
  kind: string;
  base_family: string;
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
    kind: str("kind"),
    base_family: str("base_family"),
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
  for (const k of [
    "name",
    "file",
    "provider",
    "kind",
    "base_family",
    "cache_type_k",
    "cache_type_v",
    "chat_template_kwargs",
    "reasoning_format",
  ] as const) {
    const v = form[k];
    if (v.trim() === "") {
      out[k] = null;
    } else {
      out[k] = v;
    }
  }
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
  for (const k of ["top_p", "min_p", "repeat_penalty", "presence_penalty"] as const) {
    const v = form[k];
    if (v.trim() === "") {
      out[k] = null;
    } else {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
  }
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
          gridTemplateColumns: "160px minmax(0, 1fr)",
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
  padding: "12px 14px",
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
          <span style={{ color: "var(--fg-4)", fontSize: 10, marginTop: 2 }}>{hint}</span>
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
              padding: "5px 10px",
              borderRadius: 4,
              background: value === v ? "var(--canvas-4)" : "var(--canvas-3)",
              color: value === v ? "var(--fg-1)" : "var(--fg-3)",
              border: `1px solid ${value === v ? "var(--border-default)" : "var(--border-soft)"}`,
              fontSize: 11,
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
