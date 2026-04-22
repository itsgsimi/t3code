import type { SentinelEvalRun } from "../../../../sentinel/api";

export interface SuiteSummary {
  suite: string;
  history: SentinelEvalRun[];
  latest: SentinelEvalRun;
  prior: SentinelEvalRun | null;
  latestRate: number | null;
  priorRate: number | null;
  deltaPct: number | null;
  runCount: number;
}

export function passRate(run: SentinelEvalRun): number | null {
  if (typeof run.pass_rate === "number") return run.pass_rate;
  if (typeof run.cases_total === "number" && typeof run.cases_passed === "number" && run.cases_total > 0) {
    return run.cases_passed / run.cases_total;
  }
  return null;
}

export function buildSuiteSummaries(runs: readonly SentinelEvalRun[]): SuiteSummary[] {
  const byGroup = new Map<string, SentinelEvalRun[]>();
  for (const run of runs) {
    const key = run.suite ?? deriveSuiteFromFile(run.file);
    if (!key) continue;
    const list = byGroup.get(key) ?? [];
    list.push(run);
    byGroup.set(key, list);
  }
  const summaries: SuiteSummary[] = [];
  for (const [suite, list] of byGroup) {
    const sorted = list
      .slice()
      .sort((a, b) => Date.parse(b.mtime) - Date.parse(a.mtime));
    if (sorted.length === 0) continue;
    const latest = sorted[0]!;
    const prior = sorted[1] ?? null;
    const latestRate = passRate(latest);
    const priorRate = prior ? passRate(prior) : null;
    const deltaPct =
      latestRate != null && priorRate != null
        ? (latestRate - priorRate) * 100
        : null;
    summaries.push({
      suite,
      history: sorted.slice(0, 10).reverse(), // oldest→newest for sparkline
      latest,
      prior,
      latestRate,
      priorRate,
      deltaPct,
      runCount: sorted.length,
    });
  }
  summaries.sort((a, b) => Date.parse(b.latest.mtime) - Date.parse(a.latest.mtime));
  return summaries;
}

export function deriveSuiteFromFile(file: string): string {
  const name = file.split("/").pop() ?? file;
  return name.replace(/^\d{4}-\d{2}-\d{2}-\d+-/, "").replace(/\.json$/, "");
}

export function formatMtime(iso: string): string {
  try {
    const d = new Date(iso);
    return d
      .toISOString()
      .replace("T", " ")
      .replace(/:\d{2}\.\d+Z/, "Z");
  } catch {
    return iso;
  }
}
