import {
  KV,
  NumberInput,
  ReadOnlyYaml,
  RestartNote,
  SectionCard,
  TextInput,
} from "./configPrimitives";
import type { SectionState } from "./configState";

export interface ApiServerValues {
  host: string;
  port: number | null;
}

export function ConfigSectionApiServer({
  state,
  setState,
}: {
  state: SectionState<ApiServerValues>;
  setState: (updater: (s: SectionState<ApiServerValues>) => SectionState<ApiServerValues>) => void;
}) {
  const v = state.values;
  const set = <K extends keyof ApiServerValues>(k: K, val: ApiServerValues[K]) =>
    setState((s) => ({
      ...s,
      values: { ...s.values, [k]: val },
      dirty: { ...s.dirty, [k]: true },
    }));

  return (
    <div>
      <SectionCard>
        <KV
          label="host"
          hint="Bind address. Keep 127.0.0.1 for LAN-only."
          changed={!!state.dirty.host}
          required
          error={state.errors.host}
        >
          <TextInput value={v.host} onChange={(x) => set("host", x)} mono />
        </KV>
        <KV
          label="port"
          hint="HTTP port — Sentinel defaults to 6967."
          changed={!!state.dirty.port}
          required
          error={state.errors.port}
        >
          <NumberInput value={v.port} onChange={(x) => set("port", x)} />
        </KV>
      </SectionCard>

      <RestartNote services={["api"]} />
      <ReadOnlyYaml section="api_server" values={v} />
    </div>
  );
}
