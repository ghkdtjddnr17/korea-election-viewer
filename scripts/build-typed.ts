/**
 * Aggregates every per-office typed JSON under data/seoul/** into a single bundle
 * data/typed.json, so the app can `import` one file (output:'export'-safe, mirrors
 * the data/elections.json idiom) instead of 100+ static imports or build-time fs.
 *
 * An "office dir" is any directory that directly contains index.json:
 *   data/seoul/mayor                  (flat)
 *   data/seoul/edu                    (flat)
 *   data/seoul/gwanak/head            (flat)
 *   data/seoul/gwanak/council-pr      (flat)
 *   data/seoul/gwanak/council         (district — candidates live in 가/, 나/ ...)
 *   data/seoul/gwanak/metro           (district — candidates live in 1/, 2/ ...)
 *   data/seoul/dongjak/...            (same set)
 *
 * Candidate keys:
 *   flat     → "<number>"            (e.g. "1")
 *   district → "<dir>/<number>"      (e.g. "가/1", "1/2") — dir is the on-disk folder
 *
 * Run:  pnpm build:typed   (also runs as part of `pnpm build`)
 */

import * as fs from "fs";
import * as path from "path";
import { necPhoto } from "./nec-photos";

const DATA_ROOT = path.resolve(__dirname, "..", "data/seoul");
const OUT_FILE = path.resolve(__dirname, "..", "data/typed.json");
const PHOTOS_ROOT = path.resolve(__dirname, "..", "public/photos");

/**
 * Resolve portraits from the unified scheme public/photos/{officeKey}/{candKey}.{ext}
 * (written by scripts/fetch-photos.ts). Overrides any legacy index-entry photo path.
 */
function attachPhotos(officeKey: string, ob: OfficeBundle): void {
  const exts = ["jpg", "jpeg", "png", "webp"];
  for (const [candKey, cand] of Object.entries(ob.candidates)) {
    for (const ext of exts) {
      const rel = `${officeKey}/${candKey}.${ext}`;
      if (fs.existsSync(path.join(PHOTOS_ROOT, rel))) {
        cand.photo = `/photos/${rel}`;
        break;
      }
    }
  }
}

/** Overlay official NEC portraits (data/nec-photos.json) by region|name|기호. Wins over legacy. */
function applyNecPhotos(officeKey: string, ob: OfficeBundle): void {
  const region = officeKey.split("/")[0];
  for (const cand of Object.values(ob.candidates)) {
    const name = typeof cand.name === "string" ? cand.name : "";
    const num =
      typeof cand.number === "number"
        ? cand.number
        : parseInt(String(cand.number ?? "").replace(/[^\d]/g, "") || "0", 10);
    const p = necPhoto(region, name, num);
    if (p) cand.photo = p;
  }
}

type RawCandidate = Record<string, unknown> & {
  number?: number;
  education?: string[];
  educationRows?: string[];
  career?: string[];
  careerRows?: string[];
  photo?: string;
};

type OfficeBundle = {
  kind: "flat" | "district";
  index: unknown;
  matrix: string | null;
  candidates: Record<string, RawCandidate>;
};

function readJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, "utf8").normalize("NFC"));
}

/** edu ships educationRows/careerRows; everything else ships education/career. Unify. */
function normalizeCandidate(c: RawCandidate): RawCandidate {
  return {
    ...c,
    education: c.education ?? c.educationRows ?? [],
    career: c.career ?? c.careerRows ?? [],
  };
}

function isJsonFile(name: string): boolean {
  return /^\d+\.json$/.test(name);
}

/** Recursively find every directory that directly contains an index.json. */
function findOfficeDirs(dir: string, out: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (entries.some((e) => e.isFile() && e.name === "index.json")) {
    out.push(dir);
    // An office dir's subdirs hold district candidates, not nested offices — stop.
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) findOfficeDirs(path.join(dir, e.name), out);
  }
  return out;
}

/** Pull each candidate's portrait path out of the index roster, keyed like the bundle. */
function photoMap(index: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const idx = index as {
    candidates?: { number?: number | null; photo?: string }[];
    districts?: { name: string; candidates?: { number?: number; photo?: string }[] }[];
  };
  for (const e of idx.candidates ?? []) {
    if (e.number != null && e.photo) out[String(e.number)] = e.photo;
  }
  for (const g of idx.districts ?? []) {
    const dkey = g.name.replace("선거구", "").replace("제", "");
    for (const e of g.candidates ?? []) {
      if (e.number != null && e.photo) out[`${dkey}/${e.number}`] = e.photo;
    }
  }
  return out;
}

function buildOffice(officeDir: string): OfficeBundle {
  const index = readJson(path.join(officeDir, "index.json"));
  const matrixPath = path.join(officeDir, "matrix.json");
  const matrix = fs.existsSync(matrixPath)
    ? ((readJson(matrixPath) as { raw?: string }).raw ?? null)
    : null;

  const photos = photoMap(index);

  // Flat candidates: <number>.json directly in the office dir.
  // District candidates: <number>.json inside a single level of subdirs.
  const candidates: Record<string, RawCandidate> = {};
  let kind: "flat" | "district" = "flat";

  const add = (key: string, raw: RawCandidate) => {
    const cand = normalizeCandidate(raw);
    if (photos[key]) cand.photo = photos[key];
    candidates[key] = cand;
  };

  for (const entry of fs.readdirSync(officeDir, { withFileTypes: true })) {
    if (entry.isFile() && isJsonFile(entry.name)) {
      const num = entry.name.replace(/\.json$/, "");
      add(num, readJson(path.join(officeDir, entry.name)) as RawCandidate);
    } else if (entry.isDirectory()) {
      kind = "district";
      const subDir = path.join(officeDir, entry.name);
      const dirName = entry.name.normalize("NFC");
      for (const f of fs.readdirSync(subDir)) {
        if (!isJsonFile(f)) continue;
        const num = f.replace(/\.json$/, "");
        add(`${dirName}/${num}`, readJson(path.join(subDir, f)) as RawCandidate);
      }
    }
  }

  return { kind, index, matrix, candidates };
}

function main() {
  if (!fs.existsSync(DATA_ROOT)) {
    console.error("data/seoul not found:", DATA_ROOT);
    process.exit(1);
  }

  const officeDirs = findOfficeDirs(DATA_ROOT).sort();
  const bundle: Record<string, OfficeBundle> = {};

  for (const officeDir of officeDirs) {
    // key = path relative to data/, e.g. "seoul/gwanak/head"
    const key = path
      .relative(path.resolve(__dirname, "..", "data"), officeDir)
      .split(path.sep)
      .join("/")
      .normalize("NFC");
    bundle[key] = buildOffice(officeDir);
    attachPhotos(key, bundle[key]);
    applyNecPhotos(key, bundle[key]);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(bundle));

  console.log(`Wrote ${OUT_FILE}`);
  for (const [key, ob] of Object.entries(bundle)) {
    console.log(
      `  ${key} [${ob.kind}] · candidates=${Object.keys(ob.candidates).length} · matrix=${ob.matrix ? "y" : "n"}`
    );
  }
}

main();
