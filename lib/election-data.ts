import raw from "../data/elections.json";
import type {
  Candidate,
  District,
  ElectionData,
  Office,
  Region,
  SubRegion,
} from "./types";

export const ELECTION = raw as unknown as ElectionData;

export function findRegion(slug: string): Region | undefined {
  return ELECTION.regions.find((r) => r.slug === slug);
}

export function findOffice(
  regionSlug: string,
  next: string,
  next2?: string
): {
  region?: Region;
  subregion?: SubRegion;
  office?: Office;
} {
  const region = findRegion(regionSlug);
  if (!region) return {};
  // Try as direct office
  const directOffice = region.offices.find((o) => o.slug === next);
  if (directOffice) return { region, office: directOffice };
  // Try as subregion
  const subregion = region.subregions.find((sr) => sr.slug === next);
  if (subregion) {
    if (next2) {
      const office = subregion.offices.find((o) => o.slug === next2);
      return { region, subregion, office };
    }
    return { region, subregion };
  }
  return { region };
}

export function findCandidate(
  office: Office | District,
  slug: string
): Candidate | undefined {
  return office.candidates.find((c) => c.slug === slug);
}

export function findDistrict(
  office: Office,
  slug: string
): District | undefined {
  return office.districts.find((d) => d.slug === slug);
}

export function allOffices(): Array<{
  region: Region;
  subregion?: SubRegion;
  office: Office;
}> {
  const out: Array<{ region: Region; subregion?: SubRegion; office: Office }> =
    [];
  for (const region of ELECTION.regions) {
    for (const office of region.offices) out.push({ region, office });
    for (const subregion of region.subregions) {
      for (const office of subregion.offices)
        out.push({ region, subregion, office });
    }
  }
  return out;
}

export function isOfficeEmpty(office: Office): boolean {
  return (
    office.candidates.length === 0 &&
    office.districts.every((d) => d.candidates.length === 0) &&
    !office.index &&
    !office.matrix
  );
}
