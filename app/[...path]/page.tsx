import { notFound } from "next/navigation";
import { ELECTION, isOfficeEmpty } from "@/lib/election-data";
import Markdown from "@/components/Markdown";
import CandidateDetail from "@/components/CandidateDetail";
import OfficeView from "@/components/OfficeView";
import DistrictView from "@/components/DistrictView";
import TypedCandidateDetail from "@/components/TypedCandidateDetail";
import TypedOfficeView from "@/components/TypedOfficeView";
import TypedDistrictView from "@/components/TypedDistrictView";
import {
  getTypedOffice,
  typedOfficeKey,
  typedCandidateKey,
} from "@/lib/typed-data";
import { entriesFor } from "@/components/CompareMatrix";
import BallotView from "@/components/BallotView";
import { ballotFor } from "@/lib/locality-index";
import Link from "next/link";
import type { Office, Region, SubRegion } from "@/lib/types";

type Crumb = { label: string; href?: string };

// Default (true) in dev without output:'export'. Production build (output:'export')
// pre-generates all params from generateStaticParams below.

export async function generateStaticParams() {
  const params: { path: string[] }[] = [];
  for (const region of ELECTION.regions) {
    params.push({ path: [region.urlSlug] });
    for (const office of region.offices) {
      params.push({ path: [region.urlSlug, office.urlSlug] });
      for (const c of office.candidates) {
        params.push({ path: [region.urlSlug, office.urlSlug, c.urlSlug] });
      }
      for (const d of office.districts) {
        params.push({ path: [region.urlSlug, office.urlSlug, d.urlSlug] });
        for (const c of d.candidates) {
          params.push({
            path: [region.urlSlug, office.urlSlug, d.urlSlug, c.urlSlug],
          });
        }
      }
    }
    for (const sr of region.subregions) {
      params.push({ path: [region.urlSlug, sr.urlSlug] });
      for (const office of sr.offices) {
        params.push({ path: [region.urlSlug, sr.urlSlug, office.urlSlug] });
        for (const c of office.candidates) {
          params.push({
            path: [region.urlSlug, sr.urlSlug, office.urlSlug, c.urlSlug],
          });
        }
        for (const d of office.districts) {
          params.push({
            path: [region.urlSlug, sr.urlSlug, office.urlSlug, d.urlSlug],
          });
          for (const c of d.candidates) {
            params.push({
              path: [
                region.urlSlug,
                sr.urlSlug,
                office.urlSlug,
                d.urlSlug,
                c.urlSlug,
              ],
            });
          }
        }
      }
    }
  }
  params.push({ path: ["playbook"] });
  params.push({ path: ["schedule"] });
  return params;
}

export default async function CatchAll({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;

  if (path[0] === "playbook")
    return <DocPage doc={ELECTION.playbook} title="방법론 — 데이터 수집 플레이북" />;
  if (path[0] === "schedule")
    return <DocPage doc={ELECTION.memo} title="제9회 지방선거 — 일정·투표 안내" />;

  const region = ELECTION.regions.find((r) => r.urlSlug === path[0]);
  if (!region) notFound();

  if (path.length === 1) return <RegionPage region={region} />;

  const directOffice = region.offices.find((o) => o.urlSlug === path[1]);
  if (directOffice) {
    return resolveOffice(region, undefined, directOffice, path.slice(2));
  }
  const subregion = region.subregions.find((sr) => sr.urlSlug === path[1]);
  if (!subregion) notFound();
  if (path.length === 2) return <SubregionPage region={region} subregion={subregion} />;
  const subOffice = subregion.offices.find((o) => o.urlSlug === path[2]);
  if (!subOffice) notFound();
  return resolveOffice(region, subregion, subOffice, path.slice(3));
}

function resolveOffice(
  region: Region,
  subregion: SubRegion | undefined,
  office: Office,
  rest: string[]
) {
  const baseCrumbs: Crumb[] = [{ label: "홈", href: "/" }];
  baseCrumbs.push({ label: region.name, href: region.href });
  if (subregion) {
    baseCrumbs.push({ label: subregion.name, href: subregion.href });
  }
  baseCrumbs.push({ label: office.name, href: office.href });

  // Typed data, when present for this office, drives a richer render; otherwise the
  // System A markdown components handle it (e.g. 서울시의원비례 has no typed builder).
  const typed = getTypedOffice(
    typedOfficeKey([region.urlSlug, subregion?.urlSlug, office.urlSlug])
  );

  if (rest.length === 0) {
    const crumbs = baseCrumbs.slice(0, -1).concat([{ label: office.name }]);
    return typed ? (
      <TypedOfficeView office={office} typed={typed} breadcrumbs={crumbs} />
    ) : (
      <OfficeView office={office} breadcrumbs={crumbs} />
    );
  }

  const directCandidate = office.candidates.find((c) => c.urlSlug === rest[0]);
  if (directCandidate && rest.length === 1) {
    const crumbs = baseCrumbs.concat({ label: directCandidate.header.이름 });
    const tc = typed?.candidates[typedCandidateKey(Number(directCandidate.urlSlug))];
    return tc && typed ? (
      <TypedCandidateDetail
        candidate={tc}
        siblings={entriesFor(office.candidates, typed).map((e) => e.tc)}
        breadcrumbs={crumbs}
      />
    ) : (
      <CandidateDetail candidate={directCandidate} breadcrumbs={crumbs} />
    );
  }

  const district = office.districts.find((d) => d.urlSlug === rest[0]);
  if (!district) notFound();
  const districtCrumb: Crumb = { label: district.name, href: district.href };

  if (rest.length === 1) {
    const crumbs = baseCrumbs.concat({ label: district.name });
    return typed ? (
      <TypedDistrictView district={district} typed={typed} breadcrumbs={crumbs} />
    ) : (
      <DistrictView district={district} breadcrumbs={crumbs} />
    );
  }

  const candidate = district.candidates.find((c) => c.urlSlug === rest[1]);
  if (!candidate) notFound();
  const crumbs = baseCrumbs.concat([districtCrumb, { label: candidate.header.이름 }]);
  const tc =
    typed?.candidates[typedCandidateKey(Number(candidate.urlSlug), district.name)];
  return tc && typed ? (
    <TypedCandidateDetail
      candidate={tc}
      siblings={entriesFor(district.candidates, typed, district).map((e) => e.tc)}
      breadcrumbs={crumbs}
    />
  ) : (
    <CandidateDetail candidate={candidate} breadcrumbs={crumbs} />
  );
}

function RegionPage({ region }: { region: Region }) {
  const offices = ballotFor(region);
  const hasLocalities = region.subregions.length > 0;
  return (
    <div className="mx-auto max-w-4xl px-4 lg:px-6 py-8 lg:py-10">
      <nav className="text-xs text-muted mb-4 flex flex-wrap items-center gap-1.5">
        <Link href="/" className="hover:text-foreground">홈</Link>
        <span aria-hidden>›</span>
        <span>{region.name}</span>
      </nav>
      <h1 className="text-3xl lg:text-4xl font-black tracking-tight">{region.name}</h1>
      <p className="mt-2 text-muted">2026 지방선거 · {region.name} 후보 정보</p>

      <h2 className="mt-10 mb-3 text-sm font-bold uppercase tracking-widest text-muted">광역 선거</h2>
      <BallotView offices={offices} />

      {hasLocalities && (
        <>
          <div className="flex items-baseline gap-2 mt-12 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">자치구</h2>
            <span className="text-sm text-muted">— 내 동네 투표용지</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {region.subregions.map((sr) => {
              const empty = sr.offices.every(isOfficeEmpty);
              const races = sr.offices.filter((o) => !isOfficeEmpty(o)).length;
              return (
                <Link
                  key={sr.slug}
                  href={sr.href}
                  className={`surface-card p-3.5 transition-all ${
                    empty ? "opacity-40 pointer-events-none" : "hover:border-foreground hover:-translate-y-0.5"
                  }`}
                >
                  <div className="font-bold text-base tracking-tight">{sr.name}</div>
                  <div className="num text-[11px] text-muted mt-0.5">
                    {empty ? "자료 준비 중" : `투표 ${races}건`}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SubregionPage({
  region,
  subregion,
}: {
  region: Region;
  subregion: SubRegion;
}) {
  const offices = ballotFor(region, subregion);
  const active = offices.filter((o) => !o.empty).length;
  return (
    <div className="mx-auto max-w-4xl px-4 lg:px-6 py-8 lg:py-10">
      <nav className="text-xs text-muted mb-4 flex flex-wrap items-center gap-1.5">
        <Link href="/" className="hover:text-foreground">홈</Link>
        <span aria-hidden>›</span>
        <Link href={region.href} className="hover:text-foreground">{region.name}</Link>
        <span aria-hidden>›</span>
        <span>{subregion.name}</span>
      </nav>
      <div className="num text-[11px] uppercase tracking-widest text-muted font-bold">{region.name}</div>
      <h1 className="text-3xl lg:text-4xl font-black tracking-tight mt-1">{subregion.name} 투표용지</h1>
      <p className="mt-2 text-muted">
        {subregion.name} 유권자가 받는 <strong className="num text-foreground">{active}장</strong>의 투표 · 선거 순서
      </p>

      <div className="mt-8">
        <BallotView offices={offices} />
      </div>
    </div>
  );
}

function DocPage({ doc, title }: { doc: { raw: string; filename: string } | null; title: string }) {
  if (!doc) notFound();
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <nav className="text-xs text-muted mb-4">
        <Link href="/" className="hover:text-foreground">홈</Link>
      </nav>
      <h1 className="text-3xl font-black tracking-tight mb-2">{title}</h1>
      <div className="text-xs text-muted mb-8">{doc.filename}</div>
      <Markdown source={doc.raw} />
    </div>
  );
}
