/**
 * Best-effort candidate portraits via the Korean Wikipedia pageimages API
 * (CC-licensed Wikimedia Commons thumbnails). For every candidate in data/typed.json
 * it queries ko.wikipedia by name and, if the page carries an infobox image,
 * downloads it to the unified scheme:
 *
 *   public/photos/{officeKey}/{candKey}.{ext}
 *       e.g. public/photos/seoul/mayor/1.jpg
 *            public/photos/seoul/gwanak/council/가/1.jpg
 *
 * build-typed.ts (attachPhotos) then wires these onto candidates.
 *
 * Coverage is partial by nature: prominent races (시장·교육감·구청장) resolve well;
 * most 구·시의원 후보 have no Wikipedia page → the UI falls back to the geometric mark.
 *
 * ⚠️ Name-only matching can hit a same-name article. Treat results as needing a
 *    human spot-check; delete any wrong file under public/photos/ and re-run.
 *
 * Run:  pnpm build:photos   (then re-run pnpm build:typed to pick up new files)
 */

import * as fs from "fs";
import * as path from "path";

const BUNDLE = path.resolve(__dirname, "..", "data/typed.json");
const PHOTOS_ROOT = path.resolve(__dirname, "..", "public/photos");
const UA = "korea-election-viewer/1.0 (+https://github.com/ghkdtjddnr17/korea-election-viewer)";

type Cand = { number?: number; name?: string };
type Office = { kind: string; candidates: Record<string, Cand> };
type Bundle = Record<string, Office>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function wikiThumb(name: string): Promise<string | null> {
  const url =
    "https://ko.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages" +
    "&piprop=thumbnail&pithumbsize=480&redirects=1&titles=" +
    encodeURIComponent(name);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`api HTTP ${res.status}`);
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { missing?: string; thumbnail?: { source?: string } }> };
  };
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || "missing" in page) return null;
  return page.thumbnail?.source ?? null;
}

async function download(url: string, outBase: string): Promise<{ ext: string; bytes: number }> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*" } });
  if (!res.ok) throw new Error(`img HTTP ${res.status}`);
  const ext = /\.png(?:\/|$|\?)/i.test(url) ? "png" : /\.webp/i.test(url) ? "webp" : "jpg";
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  fs.writeFileSync(`${outBase}.${ext}`, buf);
  return { ext, bytes: buf.length };
}

function alreadyHave(outBase: string): boolean {
  return ["jpg", "jpeg", "png", "webp"].some((e) => fs.existsSync(`${outBase}.${e}`));
}

async function main() {
  if (!fs.existsSync(BUNDLE)) {
    console.error("data/typed.json not found — run `pnpm build:typed` first.");
    process.exit(1);
  }
  const bundle = JSON.parse(fs.readFileSync(BUNDLE, "utf8")) as Bundle;

  let found = 0, missing = 0, skipped = 0, errored = 0, total = 0;
  const hits: string[] = [];

  for (const [officeKey, office] of Object.entries(bundle)) {
    // 비례 = 정당 엔티티(인물 아님) → 사진 스킵
    if (officeKey.endsWith("council-pr")) continue;

    for (const [candKey, cand] of Object.entries(office.candidates)) {
      const name = (cand.name ?? "").trim();
      if (!name) continue;
      total++;
      const outBase = path.join(PHOTOS_ROOT, officeKey, candKey);
      if (alreadyHave(outBase)) { skipped++; continue; }

      try {
        const thumb = await wikiThumb(name);
        if (!thumb) { missing++; }
        else {
          const { ext, bytes } = await download(thumb, outBase);
          found++;
          hits.push(`${officeKey}/${candKey} ${name} (${(bytes / 1024).toFixed(0)}KB .${ext})`);
        }
      } catch (err) {
        errored++;
        console.warn(`  ! ${officeKey}/${candKey} ${name} — ${(err as Error).message}`);
      }
      await sleep(140); // be polite to the API
    }
  }

  console.log(`\n사진 수집 완료 — 후보 ${total}명 중`);
  console.log(`  ✓ 신규 ${found}  · 기존 ${skipped}  · 없음 ${missing}  · 오류 ${errored}`);
  if (hits.length) {
    console.log(`\n신규 다운로드 (검증 필요 — 동명이인 주의):`);
    for (const h of hits) console.log(`  + ${h}`);
  }
  console.log(`\n→ 'pnpm build:typed' 다시 실행하면 번들에 사진이 반영됩니다.`);
}

main();
