/**
 * Official candidate portraits from the NEC (중앙선거관리위원회) candidate-search popup.
 *
 * The 후보자 검색 popup POSTs a 후보자명 to popup_search_candidate.xhtml and returns an
 * HTML list whose every item carries the full CDN photo URL + huboId + 기호/정당/주소:
 *   fn_ClickPhoto('http://cdn.nec.go.kr/photo_20260603/Gsg1100/Hb100157144/gicho/100157144.JPG')
 *
 * We search by name (cached/deduped), match each of our candidates to the right result
 * by name + region(주소) + 기호 + 정당, download the JPG to public/photos/nec/{huboId}.jpg,
 * and write data/nec-photos.json (key → photo path) that build-data/build-typed apply.
 *
 * 비례(정당 엔티티)는 인물 사진이 없으므로 스킵 → 기하학 마크 폴백.
 *
 * Run:  pnpm build:nec-photos   (then build:data/build:typed to attach)
 */

import * as fs from "fs";
import * as path from "path";
import { regionSlug } from "../lib/slug-map";
import type { Candidate, ElectionData, Office } from "../lib/types";

const ELECTION_ID = "0020260603";
const SEARCH_URL = "http://info.nec.go.kr/bizcommon/popup/popup_search_candidate.xhtml";
const BUNDLE = path.resolve(__dirname, "..", "data/elections.json");
const OUT_DIR = path.resolve(__dirname, "..", "public/photos/nec");
const MANIFEST = path.resolve(__dirname, "..", "data/nec-photos.json");
const UA = "korea-election-viewer/1.0 (+https://github.com/ghkdtjddnr17/korea-election-viewer)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const leadNum = (s?: string): number => parseInt((s ?? "").replace(/[^\d]/g, "") || "0", 10);

type Item = { huboId: string; photoUrl: string; sign: string; party: string; name: string; addr: string };

function parseResults(html: string): Item[] {
  const items: Item[] = [];
  const anchors = [...html.matchAll(/fn_detailHbjPopUp\('[^']*',\s*'(\d+)'\)/g)];
  let prev = 0;
  for (const a of anchors) {
    const end = (a.index ?? 0) + a[0].length;
    const chunk = html.slice(prev, end);
    prev = end;
    const photo = chunk.match(/fn_ClickPhoto\('([^']+)'\)/);
    const sign = chunk.match(/class="bg sign"[^>]*>\s*기호\s*([0-9A-Za-z가-힣-]+)/);
    const party = chunk.match(/class="bg part"[^>]*>\s*([^<]+?)\s*</);
    const name = chunk.match(/class="dd name"[^>]*>\s*<b>\s*([^<]+?)\s*<\/b>/);
    const addr = chunk.match(/class="adrs"[^>]*>\s*([^<]+?)\s*</);
    items.push({
      huboId: a[1],
      photoUrl: photo?.[1] ?? "",
      sign: sign?.[1] ?? "",
      party: party?.[1]?.trim() ?? "",
      name: name?.[1]?.trim() ?? "",
      addr: addr?.[1]?.trim() ?? "",
    });
  }
  return items;
}

async function search(name: string): Promise<Item[]> {
  const body = new URLSearchParams({ electionId: ELECTION_ID, searchName: name });
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  return parseResults(await res.text());
}

function pickItem(items: Item[], name: string, signNum: number, party: string, regionName: string): Item | null {
  const byName = items.filter((it) => it.name === name && it.photoUrl);
  if (byName.length === 0) return null;
  if (byName.length === 1) return byName[0];
  const inRegion = byName.filter((it) => it.addr.startsWith(regionName));
  const pool = inRegion.length ? inRegion : byName;
  if (pool.length === 1) return pool[0];
  const bySign = signNum ? pool.filter((it) => leadNum(it.sign) === signNum) : [];
  const poolB = bySign.length ? bySign : pool;
  if (poolB.length === 1) return poolB[0];
  const byParty = party ? poolB.filter((it) => it.party === party) : [];
  return byParty[0] ?? poolB[0] ?? null;
}

async function download(url: string, outBase: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*" } });
  if (!res.ok) throw new Error(`img HTTP ${res.status}`);
  const ext = /\.png/i.test(url) ? "png" : "jpg";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error("too small (likely placeholder)");
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  fs.writeFileSync(`${outBase}.${ext}`, buf);
  return `${ext}`;
}

type Target = { regionName: string; key: string; name: string; signNum: number; party: string };

function collectTargets(data: ElectionData): Target[] {
  const out: Target[] = [];
  const isPr = (o: Office) => o.kind === "광역의원비례" || o.kind === "기초의원비례";
  const add = (regionName: string, c: Candidate) => {
    const name = (c.header.이름 ?? "").trim();
    if (!/^[가-힣]{2,}$/.test(name)) return; // 인물명만 (비례 정당명·빈값 제외)
    const signNum = leadNum(c.header.기호);
    out.push({
      regionName,
      key: `${regionSlug(regionName)}|${name}|${signNum}`,
      name,
      signNum,
      party: (c.header.정당 ?? "").trim(),
    });
  };
  for (const r of data.regions) {
    const offs = [...r.offices, ...r.subregions.flatMap((s) => s.offices)];
    for (const o of offs) {
      if (isPr(o)) continue;
      o.candidates.forEach((c) => add(r.name, c));
      o.districts.forEach((d) => d.candidates.forEach((c) => add(r.name, c)));
    }
  }
  return out;
}

function existingExt(outBase: string): string | null {
  if (fs.existsSync(`${outBase}.jpg`)) return "jpg";
  if (fs.existsSync(`${outBase}.png`)) return "png";
  return null;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(BUNDLE, "utf8")) as ElectionData;
  const targets = collectTargets(data);
  const uniqueNames = [...new Set(targets.map((t) => t.name))];
  console.log(`인물 후보 ${targets.length}명 · 고유 이름 ${uniqueNames.length}건 검색`);

  // 1) search each unique name once (deduped)
  const cache = new Map<string, Item[]>();
  let si = 0;
  for (const name of uniqueNames) {
    si++;
    try {
      cache.set(name, await search(name));
    } catch (e) {
      cache.set(name, []);
      console.warn(`  ! 검색 실패 ${name}: ${(e as Error).message}`);
    }
    if (si % 25 === 0) console.log(`  …검색 ${si}/${uniqueNames.length}`);
    await sleep(180);
  }

  // 2) match each target → huboId + photo URL (dedupe downloads by huboId)
  const keyToHubo = new Map<string, string>();
  const toDownload = new Map<string, string>(); // huboId -> url
  const misses: string[] = [];
  for (const t of targets) {
    const item = pickItem(cache.get(t.name) ?? [], t.name, t.signNum, t.party, t.regionName);
    if (!item) { misses.push(`${t.regionName}/${t.name}(${t.signNum})`); continue; }
    keyToHubo.set(t.key, item.huboId);
    toDownload.set(item.huboId, item.photoUrl);
  }

  // 3) download photos → record actual ext per huboId
  const huboExt = new Map<string, string>();
  let dlErr = 0, di = 0;
  for (const [huboId, url] of toDownload) {
    di++;
    const outBase = path.join(OUT_DIR, huboId);
    const have = existingExt(outBase);
    if (have) { huboExt.set(huboId, have); continue; }
    try {
      huboExt.set(huboId, await download(url, outBase));
    } catch (e) {
      dlErr++;
      console.warn(`  ! 다운로드 실패 ${huboId}: ${(e as Error).message}`);
    }
    if (di % 25 === 0) console.log(`  …다운로드 ${di}/${toDownload.size}`);
    await sleep(120);
  }

  // 4) manifest: candidate key → photo path (only where the file actually landed)
  const manifest: Record<string, string> = {};
  for (const [key, huboId] of keyToHubo) {
    const ext = huboExt.get(huboId);
    if (ext) manifest[key] = `/photos/nec/${huboId}.${ext}`;
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0));
  console.log(`\n매칭 ${keyToHubo.size}/${targets.length} · 사진 ${huboExt.size}건(오류 ${dlErr}) · 미매칭 ${misses.length}`);
  if (misses.length) console.log(`미매칭(폴백 마크): ${misses.slice(0, 40).join(", ")}${misses.length > 40 ? " …" : ""}`);
  console.log(`\n→ data/nec-photos.json 저장. 'pnpm build:data && pnpm build:typed'로 반영.`);
}

main();
