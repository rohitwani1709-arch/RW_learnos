import "server-only";
// In-memory sliding window. Works per server instance only; use a shared store (Redis/DB) for production.
const hits = new Map<string, number[]>();

export function allow(key: string, max = 10, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
