import { useEffect, useState, type ReactNode } from "react";
import { XCircle } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

export type JobProgressProps = {
  title: string;
  /** Start timestamp in ISO-8601 or epoch ms. Enables elapsed counter. */
  startedAt?: string | number | null;
  /** 0..1 for determinate mode; omit for indeterminate. */
  progress?: number | null;
  /** Status chip text. */
  status?: string;
  /** Optional detail/body (log line, current step, etc). */
  detail?: ReactNode;
  onCancel?: () => void;
  cancelDisabled?: boolean;
  cancelLabel?: string;
};

/**
 * Shared progress card for long-running Sentinel jobs (eval runs,
 * fine-tune training, model downloads). Shows title, elapsed timer,
 * optional determinate progress, and a cancel button.
 *
 * Determinate: pass `progress` ∈ [0, 1]. Bar fills.
 * Indeterminate: omit `progress`. Spinner shown.
 */
export function JobProgress({
  title,
  startedAt,
  progress,
  status,
  detail,
  onCancel,
  cancelDisabled,
  cancelLabel,
}: JobProgressProps) {
  const elapsed = useElapsed(startedAt ?? null);
  const pct = progress != null ? Math.max(0, Math.min(1, progress)) : null;

  return (
    <div
      style={{
        background: "var(--canvas-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div className="flex items-center gap-2">
        {pct === null ? <Spinner className="size-3.5" /> : null}
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--fg-1)",
          }}
        >
          {title}
        </div>
        {status ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            {status}
          </span>
        ) : null}
        <div className="flex-1" />
        {elapsed !== null ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            {formatElapsed(elapsed)}
          </span>
        ) : null}
      </div>

      {pct !== null ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct * 100)}
          style={{
            height: 4,
            background: "var(--canvas-3)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct * 100}%`,
              height: "100%",
              background: "var(--ember-400)",
              transition: "width 250ms ease-out",
            }}
          />
        </div>
      ) : null}

      {detail ? (
        <div style={{ fontSize: 11.5, color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>
          {detail}
        </div>
      ) : null}

      {onCancel ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="xs"
            onClick={onCancel}
            disabled={cancelDisabled}
          >
            <XCircle />
            {cancelLabel ?? "Cancel"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function useElapsed(startedAt: string | number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  const start = parseStart(startedAt);

  useEffect(() => {
    if (start === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [start]);

  if (start === null) return null;
  return Math.max(0, Math.floor((now - start) / 1000));
}

function parseStart(val: string | number | null): number | null {
  if (val === null) return null;
  if (typeof val === "number") return val;
  const n = Date.parse(val);
  return Number.isNaN(n) ? null : n;
}

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}
