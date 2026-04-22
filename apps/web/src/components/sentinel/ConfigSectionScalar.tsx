import { useState, type ReactNode } from "react";

import {
  Accordion,
  EnvChip,
  KV,
  NumberInput,
  ReadOnlyYaml,
  RestartNote,
  SectionCard,
  TextInput,
  TriBool,
} from "./configPrimitives";
import { CONFIG_FIELD_HINTS } from "./configSchema";
import type { SectionState } from "./configState";

/**
 * Schema-driven editor for any config section whose shape is a flat scalar
 * dict — with optional one-level-deep nested sub-blocks that render as
 * accordions. Types are inferred from the live values (string / number /
 * boolean / ${ENV}) so we don't need to declare a schema per section.
 *
 * List-of-scalars renders as a mono textarea (newline-separated). List-of-
 * objects falls through to read-only YAML — those sections (toolsets, agents,
 * morning_briefing.feeds) get bespoke editors.
 */
export function ConfigSectionScalar({
  section,
  state,
  setState,
  restartServices,
}: {
  section: string;
  state: SectionState<Record<string, unknown>>;
  setState: (
    updater: (s: SectionState<Record<string, unknown>>) => SectionState<Record<string, unknown>>,
  ) => void;
  restartServices: readonly string[];
}) {
  const v = state.values;
  const scalars: [string, unknown][] = [];
  const nested: [string, Record<string, unknown>][] = [];
  const opaque: [string, unknown][] = [];
  for (const [k, val] of Object.entries(v)) {
    if (isScalar(val) || isEnvString(val)) {
      scalars.push([k, val]);
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      nested.push([k, val as Record<string, unknown>]);
    } else {
      opaque.push([k, val]);
    }
  }

  const set = (path: readonly string[], val: unknown) =>
    setState((s) => setIn(s, path, val));

  return (
    <div>
      {scalars.length > 0 ? (
        <SectionCard>
          {scalars.map(([k, val]) => (
            <KV
              key={k}
              label={k}
              hint={CONFIG_FIELD_HINTS[`${section}.${k}`]}
              changed={!!state.dirty[k]}
              error={state.errors[k]}
            >
              <InferredField
                value={val}
                onChange={(next) => set([k], next)}
              />
            </KV>
          ))}
        </SectionCard>
      ) : null}

      {nested.map(([k, sub]) => (
        <NestedBlock
          key={k}
          section={section}
          path={[k]}
          name={k}
          value={sub}
          dirty={state.dirty}
          onSet={(p, val) => set([k, ...p], val)}
        />
      ))}

      {opaque.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <ReadOnlyYaml section={section} values={Object.fromEntries(opaque)} />
        </div>
      ) : null}

      {restartServices.length > 0 ? <RestartNote services={restartServices} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nested one-level block (renders as Accordion with scalar children)
// ---------------------------------------------------------------------------

function NestedBlock({
  section,
  path,
  name,
  value,
  dirty,
  onSet,
}: {
  section: string;
  path: readonly string[];
  name: string;
  value: Record<string, unknown>;
  dirty: Record<string, boolean>;
  onSet: (p: readonly string[], v: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const childScalars: [string, unknown][] = [];
  const childNested: [string, Record<string, unknown>][] = [];
  const childOpaque: [string, unknown][] = [];
  for (const [k, v] of Object.entries(value)) {
    if (isScalar(v) || isEnvString(v)) childScalars.push([k, v]);
    else if (v && typeof v === "object" && !Array.isArray(v))
      childNested.push([k, v as Record<string, unknown>]);
    else childOpaque.push([k, v]);
  }
  const fieldCount =
    childScalars.length + childNested.length + (childOpaque.length > 0 ? 1 : 0);
  const hintKey = (k: string) => `${section}.${[...path, k].join(".")}`;
  const dirtyKey = (k: string) => [...path, k].join(".");

  return (
    <Accordion
      title={name}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      count={fieldCount}
    >
      {childScalars.map(([k, v]) => (
        <KV
          key={k}
          label={k}
          hint={CONFIG_FIELD_HINTS[hintKey(k)]}
          changed={!!dirty[dirtyKey(k)]}
        >
          <InferredField value={v} onChange={(next) => onSet([k], next)} />
        </KV>
      ))}
      {childNested.map(([k, sub]) => (
        <NestedBlock
          key={k}
          section={section}
          path={[...path, k]}
          name={k}
          value={sub}
          dirty={dirty}
          onSet={(p, v) => onSet([k, ...p], v)}
        />
      ))}
      {childOpaque.length > 0 ? (
        <ReadOnlyYaml section={name} values={Object.fromEntries(childOpaque)} />
      ) : null}
    </Accordion>
  );
}

// ---------------------------------------------------------------------------
// Type-inferred field
// ---------------------------------------------------------------------------

function InferredField({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: unknown) => void;
}): ReactNode {
  if (isEnvString(value)) return <EnvChip varname={value as string} />;
  if (typeof value === "boolean" || value === null) {
    return (
      <TriBool
        value={typeof value === "boolean" ? value : null}
        onChange={(v) => onChange(v)}
      />
    );
  }
  if (typeof value === "number") {
    const step = Number.isInteger(value) ? 1 : 0.05;
    return (
      <NumberInput
        value={value}
        step={step}
        onChange={(v) => onChange(v)}
      />
    );
  }
  if (typeof value === "string") {
    return (
      <TextInput
        value={value}
        mono={looksMono(value)}
        onChange={(v) => onChange(v)}
      />
    );
  }
  if (Array.isArray(value) && value.every((x) => typeof x === "string")) {
    return (
      <ListEditor
        items={value as string[]}
        onChange={(next) => onChange(next)}
      />
    );
  }
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--fg-4)",
      }}
    >
      {Array.isArray(value) ? `[${value.length} items]` : "complex value"}
    </span>
  );
}

function ListEditor({
  items,
  onChange,
}: {
  items: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState(items.join("\n"));
  return (
    <textarea
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        );
      }}
      style={{
        width: "100%",
        minHeight: 70,
        padding: "6px 9px",
        background: "var(--canvas-3)",
        border: "1px solid var(--border-soft)",
        borderRadius: 4,
        color: "var(--fg-1)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        outline: "none",
        resize: "vertical",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isScalar(v: unknown): boolean {
  return (
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    (Array.isArray(v) && v.every((x) => typeof x === "string"))
  );
}

function isEnvString(v: unknown): boolean {
  return typeof v === "string" && /^\$\{[A-Z0-9_]+\}$/.test(v);
}

function looksMono(v: string): boolean {
  return (
    v.includes("/") ||
    v.includes(":") ||
    v.includes("_") ||
    v.startsWith("http") ||
    v.startsWith("bolt") ||
    v.match(/^[a-z]+[-_][a-z0-9]+/) !== null
  );
}

function setIn(
  s: SectionState<Record<string, unknown>>,
  path: readonly string[],
  val: unknown,
): SectionState<Record<string, unknown>> {
  const values = structuredClone(s.values);
  let node = values as Record<string, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i] as string;
    if (typeof node[k] !== "object" || node[k] === null) node[k] = {};
    node = node[k] as Record<string, unknown>;
  }
  node[path[path.length - 1] as string] = val;
  return { ...s, values, dirty: { ...s.dirty, [path.join(".")]: true } };
}

