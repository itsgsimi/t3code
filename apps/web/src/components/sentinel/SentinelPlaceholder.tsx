/**
 * Placeholder for sections the design didn't fully build in the first pass.
 * Matches the language from the design bundle — warm but practical, no marketing.
 */
export function SentinelPlaceholder({
  title,
  body,
  nextAction,
}: {
  title: string;
  body: string;
  nextAction?: string;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div
        className="max-w-lg"
        style={{
          background: "var(--canvas-2)",
          border: "1px solid var(--border-soft)",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Not built yet
        </p>
        <h2 className="ds-h2" style={{ marginBottom: 8, fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        <p className="ds-body" style={{ color: "var(--fg-2)", lineHeight: 1.6 }}>
          {body}
        </p>
        {nextAction ? (
          <p
            className="ds-mono"
            style={{
              marginTop: 16,
              color: "var(--fg-3)",
              fontSize: 12,
            }}
          >
            {nextAction}
          </p>
        ) : null}
      </div>
    </div>
  );
}
