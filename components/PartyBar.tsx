import { getPartyColor } from "@/lib/party-colors";

export default function PartyBar({
  party,
  thick = false,
}: {
  party?: string;
  thick?: boolean;
}) {
  const c = getPartyColor(party);
  return (
    <div
      style={{ background: c.bg, width: thick ? 8 : 4 }}
      className="self-stretch rounded-sm"
      aria-hidden
    />
  );
}

export function PartyChip({ party }: { party?: string }) {
  if (!party) return null;
  const c = getPartyColor(party);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[12px] font-semibold tracking-tight whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {party}
    </span>
  );
}
