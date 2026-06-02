/**
 * Lookup over data/nec-photos.json (written by fetch-nec-photos.ts), shared by
 * build-data.ts (System A) and build-typed.ts so both attach the same NEC portrait.
 *
 * Primary key  = `${regionSlug}|${name}|${기호번호}` (exact).
 * Fallback key = `${regionSlug}|${name}` — covers candidates whose System A 기호 is
 *   missing (0) while typed carries the real number, so the two pipelines still agree.
 *   Disabled for any name that collides within a region (so a wrong face never shows).
 */

import * as fs from "fs";
import * as path from "path";

let cache: { primary: Record<string, string>; fallback: Map<string, string> } | null = null;

function load() {
  if (cache) return cache;
  const p = path.resolve(__dirname, "..", "data/nec-photos.json");
  const primary: Record<string, string> = fs.existsSync(p)
    ? (JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, string>)
    : {};
  const fallback = new Map<string, string>();
  const poisoned = new Set<string>();
  for (const [k, v] of Object.entries(primary)) {
    const [region, name] = k.split("|");
    const fk = `${region}|${name}`;
    if (poisoned.has(fk)) continue;
    const existing = fallback.get(fk);
    if (existing && existing !== v) {
      fallback.delete(fk);
      poisoned.add(fk); // same name twice in a region → ambiguous, drop fallback
    } else {
      fallback.set(fk, v);
    }
  }
  cache = { primary, fallback };
  return cache;
}

export function necPhoto(regionSlug: string, name: string, num: number): string | undefined {
  if (!name) return undefined;
  const { primary, fallback } = load();
  return primary[`${regionSlug}|${name}|${num}`] ?? fallback.get(`${regionSlug}|${name}`);
}
