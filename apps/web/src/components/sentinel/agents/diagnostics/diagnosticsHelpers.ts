export function relativeFromTimestamp(ts: string): string {
  // The backend emits "YYYY-MM-DD HH:MM:SS.sss" without a timezone — assume
  // local time (the API + UI run on the same host for Sentinel).
  const parsed = Date.parse(ts.includes("T") ? ts : ts.replace(" ", "T"));
  if (!Number.isFinite(parsed)) return ts;
  const delta = Date.now() - parsed;
  if (delta < 0) return "just now";
  const secs = Math.floor(delta / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 36) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
