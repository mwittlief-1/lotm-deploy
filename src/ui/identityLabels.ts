import type {
  BoundedHouseDossierSummary,
  HouseDossierSummary,
  KnownHouseSummary,
  PersonCardRegistry,
  PersonCardView,
  RunState
} from "../sim/types";

type HouseDossierRecord = HouseDossierSummary | BoundedHouseDossierSummary;

type PersonSecondaryIdentifierFallback = {
  age?: number | null;
  defaultLabel?: string | null;
  houseId?: string | null;
  houseName?: string | null;
  residenceManorId?: string | null;
};

type HouseSecondaryIdentifierOptions = {
  dossier?: HouseDossierRecord | Record<string, unknown> | null;
  houseName?: string | null;
  knownHouse?: KnownHouseSummary | Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function formatManorLabel(manorId: string | null): string {
  if (!manorId) return "Unmapped";
  const match = manorId.match(/hx_(\d+)/);
  return match ? `Hx ${match[1]}` : manorId;
}

function readPersonCardRegistry(previewState: RunState | null | undefined): PersonCardRegistry | null {
  const registry = asRecord((previewState as any)?.person_card_registry);
  if (!registry) return null;
  if (readString(registry.schema_version) !== "person_card_registry_v1") return null;
  if (!Array.isArray(registry.person_ids)) return null;
  return registry as PersonCardRegistry;
}

function readPersonCardView(
  previewState: RunState | null | undefined,
  personId: string | null | undefined
): PersonCardView | null {
  const targetPersonId = readString(personId);
  if (!targetPersonId) return null;
  const registry = readPersonCardRegistry(previewState);
  const record = registry?.entries_by_person_id?.[targetPersonId];
  return record && typeof record === "object" ? record : null;
}

function readKnownHouseSummary(
  previewState: RunState | null | undefined,
  houseId: string | null | undefined
): KnownHouseSummary | null {
  const targetHouseId = readString(houseId);
  if (!targetHouseId) return null;
  const rows = Array.isArray((previewState as any)?.known_houses) ? ((previewState as any).known_houses as unknown[]) : [];
  const match = rows.find((entry) => readString((entry as any)?.house_id) === targetHouseId);
  return match && typeof match === "object" ? (match as KnownHouseSummary) : null;
}

function readHouseDossierSummary(
  previewState: RunState | null | undefined,
  houseId: string | null | undefined
): HouseDossierRecord | null {
  const targetHouseId = readString(houseId);
  if (!targetHouseId) return null;
  const rows = Array.isArray((previewState as any)?.house_dossiers)
    ? ((previewState as any).house_dossiers as unknown[])
    : Array.isArray((previewState as any)?.house?.house_dossiers)
      ? ((previewState as any).house.house_dossiers as unknown[])
      : [];
  const match = rows.find((entry) => readString((entry as any)?.house_id) === targetHouseId);
  return match && typeof match === "object" ? (match as HouseDossierRecord) : null;
}

function houseDisplayName(
  previewState: RunState | null | undefined,
  houseId: string | null | undefined,
  fallbackName?: string | null
): string | null {
  const targetHouseId = readString(houseId);
  const fallback = readString(fallbackName);
  if (!targetHouseId && !fallback) return null;

  const previewRecord = asRecord(previewState);
  const playerHouseId = readString(previewRecord?.player_house_id);
  const houses = asRecord(previewRecord?.houses);
  const houseRecord = targetHouseId ? asRecord(houses?.[targetHouseId]) : null;
  const explicitName =
    readString(houseRecord?.house_name) ??
    readString(houseRecord?.name) ??
    readString(houseRecord?.houseName) ??
    fallback;

  if (explicitName && explicitName !== targetHouseId) {
    return explicitName.startsWith("House ") || explicitName === "Player house" ? explicitName : `House ${explicitName}`;
  }
  if (playerHouseId && targetHouseId === playerHouseId) return "Player house";
  return targetHouseId ?? (fallback ? `House ${fallback}` : null);
}

export function buildPersonSecondaryIdentifier(
  previewState: RunState | null | undefined,
  personId: string | null | undefined,
  fallback: PersonSecondaryIdentifierFallback = {}
): string | null {
  const record = readPersonCardView(previewState, personId);
  const age = record?.age ?? readNumber(fallback.age);
  const houseLabel = houseDisplayName(
    previewState,
    record?.current_house_id ?? fallback.houseId ?? null,
    record?.current_house_name ?? fallback.houseName ?? null
  );
  const residenceManorId = readString(record?.residence_binding?.residence_manor_id) ?? readString(fallback.residenceManorId);

  const parts = [
    age !== null ? `Age ${age}` : null,
    houseLabel,
    residenceManorId ? `Resides ${formatManorLabel(residenceManorId)}` : null
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  if (parts.length > 0) return parts.join(" · ");
  if (record) return record.alive ? "Alive" : "Deceased";

  const defaultLabel = readString(fallback.defaultLabel);
  return defaultLabel ?? null;
}

export function buildHouseSecondaryIdentifier(
  previewState: RunState | null | undefined,
  houseId: string | null | undefined,
  options: HouseSecondaryIdentifierOptions = {}
): string | null {
  const knownHouse = asRecord(options.knownHouse) ?? asRecord(readKnownHouseSummary(previewState, houseId));
  const dossier = asRecord(options.dossier) ?? asRecord(readHouseDossierSummary(previewState, houseId));
  const tierLabel = readString(knownHouse?.tier) ?? readString(dossier?.tier);
  const headLabel = readString(knownHouse?.head_name);
  const anchorManorId = readString(asRecord(dossier?.holdings_footprint)?.anchor_manor_id);

  const parts = [
    tierLabel,
    headLabel ? `Head ${headLabel}` : null,
    anchorManorId ? `Anchor ${formatManorLabel(anchorManorId)}` : null
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  if (parts.length > 0) return parts.join(" · ");

  const houseLabel = houseDisplayName(previewState, houseId, options.houseName ?? null);
  return houseLabel && houseLabel !== readString(houseId) ? houseLabel : null;
}
