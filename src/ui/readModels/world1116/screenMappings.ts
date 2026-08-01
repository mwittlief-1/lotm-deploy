import type {
  World1116AvailabilityState,
  World1116Domain,
  World1116ReadModelSessionContract
} from "./types";

export type World1116ScreenId =
  | "realm-map"
  | "manor-overview"
  | "inner-council"
  | "fiscal-office"
  | "household-records"
  | "evidence-gaps";

export interface World1116ScreenMapping {
  screen: World1116ScreenId;
  domains: readonly World1116Domain[];
  stagingLabel: string;
  forbiddenClaim: string;
}

export const WORLD_1116_SCREEN_MAPPINGS: readonly World1116ScreenMapping[] = Object.freeze([
  {
    screen: "realm-map",
    domains: ["map", "manors", "residence"],
    stagingLabel: "Accepted 1116 map/manor evidence; residence remains candidate data.",
    forbiddenClaim: "Do not present residence or ownership as executed gameplay state."
  },
  {
    screen: "manor-overview",
    domains: ["manors", "openingResources", "productionCapacity"],
    stagingLabel: "Accepted opening evidence and capacity observations, with source disposition preserved.",
    forbiddenClaim: "Do not present candidate ownership, contracts, capacity, or balances as runtime truth."
  },
  {
    screen: "inner-council",
    domains: ["people", "houses", "offices"],
    stagingLabel: "Protected identities and static office/authority evidence.",
    forbiddenClaim: "Do not present office candidates as runtime appointments."
  },
  {
    screen: "fiscal-office",
    domains: ["openingResources", "productionCapacity", "offices", "gaps"],
    stagingLabel: "Opening resource/custody and production evidence for read-only UI development.",
    forbiddenClaim: "Do not imply an opening balance was booked or January 1116 execution occurred."
  },
  {
    screen: "household-records",
    domains: ["people", "houses", "unions", "residence"],
    stagingLabel: "Protected household records and candidate residence crosswalks.",
    forbiddenClaim: "Do not convert unresolved, excluded, or candidate records into active facts."
  },
  {
    screen: "evidence-gaps",
    domains: ["gaps"],
    stagingLabel: "Explicit cross-shard identity and reconciliation gaps.",
    forbiddenClaim: "Do not hide unresolved or excluded records."
  }
]);

export interface World1116ScreenAvailability {
  screen: World1116ScreenId;
  availability: World1116AvailabilityState;
  domains: Readonly<Record<string, World1116AvailabilityState>>;
  warnings: readonly string[];
  stagingLabel: string;
  forbiddenClaim: string;
}

const DOMAIN_METHODS = {
  map: (session: World1116ReadModelSessionContract) => session.map(),
  manors: (session: World1116ReadModelSessionContract) => session.manors(),
  people: (session: World1116ReadModelSessionContract) => session.people(),
  houses: (session: World1116ReadModelSessionContract) => session.houses(),
  unions: (session: World1116ReadModelSessionContract) => session.unions(),
  residence: (session: World1116ReadModelSessionContract) => session.residence(),
  offices: (session: World1116ReadModelSessionContract) => session.offices(),
  openingResources: (session: World1116ReadModelSessionContract) => session.openingResources(),
  productionCapacity: (session: World1116ReadModelSessionContract) => session.productionCapacity(),
  gaps: (session: World1116ReadModelSessionContract) => session.gaps()
} satisfies Record<World1116Domain, (session: World1116ReadModelSessionContract) => Promise<unknown>>;

export async function world1116ScreenAvailability(
  session: World1116ReadModelSessionContract,
  screen: World1116ScreenId
): Promise<World1116ScreenAvailability> {
  const mapping = WORLD_1116_SCREEN_MAPPINGS.find((candidate) => candidate.screen === screen);
  if (!mapping) throw new Error(`Unknown world 1116 screen mapping: ${screen}`);
  const results = await Promise.all(mapping.domains.map((domain) => DOMAIN_METHODS[domain](session)));
  const domainStates = Object.fromEntries(
    results.map((result, index) => [mapping.domains[index], result.availability])
  );
  const availability: World1116AvailabilityState = results.some(
    (result) => result.availability === "unavailable"
  )
    ? "unavailable"
    : results.some((result) => result.availability === "degraded")
      ? "degraded"
      : "available";

  return {
    screen,
    availability,
    domains: Object.freeze(domainStates),
    warnings: results.flatMap((result) => result.warnings),
    stagingLabel: mapping.stagingLabel,
    forbiddenClaim: mapping.forbiddenClaim
  };
}
