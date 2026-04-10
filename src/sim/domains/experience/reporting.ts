import { buildBoundedRegistryManifest, RUN_STATE_SCHEMA_VERSION } from "../../stateSchema";
import type { RunSnapshot, RunState, TurnReport } from "../../types";
import { deepCopy } from "../../util";
import { buildAiRailDebugPacket } from "../ai/debug";
import { buildCourtDelegationView } from "../court/delegationRegistry";
import { buildEconomyMaintenanceView } from "../economy/maintenance";
import { buildEconomyObligationsView } from "./obligationsView";
import { buildEconomyPricingView } from "./pricingView";
import { buildGrantAcquisitionExperienceSurfaces } from "../people/grantAcquisitionRegistry";
import { buildKnownHouseExperienceSurfaces } from "../people/knownHouseSummaries";
import { ensureResidenceManorBindings } from "../people/residenceManorRegistry";
import { buildSuccessionExperienceSurfaces } from "../people/successionSummaries";
import { buildBoundedMapViewSnapshot, buildBoundedWorldTopologyView } from "../world";

export function boundedSnapshot(state: RunState): RunSnapshot {
  const experienceSurfaces = buildKnownHouseExperienceSurfaces(state);
  const successionSurfaces = buildSuccessionExperienceSurfaces(state);
  const grantAcquisitionSurfaces = buildGrantAcquisitionExperienceSurfaces(state);
  const residenceSurfaces = ensureResidenceManorBindings(state);
  const delegationView = buildCourtDelegationView(state);
  const worldTopologyView = buildBoundedWorldTopologyView();
  const mapViewSnapshot = buildBoundedMapViewSnapshot();
  const snapshot = deepCopy({
    state_schema_version: state.state_schema_version ?? RUN_STATE_SCHEMA_VERSION,
    bounded_registry_manifest: buildBoundedRegistryManifest(),
    turn_index: state.turn_index,
    manor: state.manor,
    house: state.house,
    relationships: state.relationships,
    people: (state as any).people,
    houses: (state as any).houses,
    player_house_id: (state as any).player_house_id,
    kinship_edges: (state as any).kinship_edges ?? (state as any).kinship,
    economy: (state as any).economy,
    economy_maintenance_view: buildEconomyMaintenanceView(state),
    economy_obligations_view: buildEconomyObligationsView(state),
    economy_pricing_view: buildEconomyPricingView(state),
    court_delegation_view: delegationView,
    portfolio: (state as any).portfolio,
    world_topology_view: worldTopologyView,
    map_view_snapshot: mapViewSnapshot,
    known_houses: experienceSurfaces.known_houses,
    house_dossiers: experienceSurfaces.house_dossiers,
    flags: state.flags,
    game_over: state.game_over ?? null
  }) as unknown as RunSnapshot;
  if ((state as any).beliefs) {
    Object.defineProperty(snapshot, "beliefs", {
      value: deepCopy((state as any).beliefs),
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
  Object.defineProperty(snapshot, "ai_rail_debug_packet", {
    value: deepCopy(buildAiRailDebugPacket(state)),
    enumerable: false,
    writable: true,
    configurable: true
  });
  (snapshot.house as any).court_delegation_view = deepCopy(delegationView);
  Object.defineProperty(snapshot, "succession_line_summary", {
    value: deepCopy(successionSurfaces.succession_line_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "claimant_summary", {
    value: deepCopy(successionSurfaces.claimant_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "succession_line_summary", {
    value: deepCopy(successionSurfaces.succession_line_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "claimant_summary", {
    value: deepCopy(successionSurfaces.claimant_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "grant_eligibility", {
    value: deepCopy(grantAcquisitionSurfaces.grant_eligibility),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "grant_source_registry", {
    value: deepCopy(grantAcquisitionSurfaces.grant_source_registry),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "grant_dossier_summaries", {
    value: deepCopy(grantAcquisitionSurfaces.grant_dossier_summaries),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "acquisition_prospects_window", {
    value: deepCopy(grantAcquisitionSurfaces.acquisition_prospects_window),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "grant_eligibility", {
    value: deepCopy(grantAcquisitionSurfaces.grant_eligibility),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "grant_source_registry", {
    value: deepCopy(grantAcquisitionSurfaces.grant_source_registry),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "grant_dossier_summaries", {
    value: deepCopy(grantAcquisitionSurfaces.grant_dossier_summaries),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "acquisition_prospects_window", {
    value: deepCopy(grantAcquisitionSurfaces.acquisition_prospects_window),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "residence_selector_summary", {
    value: deepCopy(residenceSurfaces.selector_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot, "residence_distance_hooks", {
    value: deepCopy(residenceSurfaces.distance_hooks),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "residence_selector_summary", {
    value: deepCopy(residenceSurfaces.selector_summary),
    enumerable: false,
    writable: true,
    configurable: true
  });
  Object.defineProperty(snapshot.house as object, "residence_distance_hooks", {
    value: deepCopy(residenceSurfaces.distance_hooks),
    enumerable: false,
    writable: true,
    configurable: true
  });
  for (const personId of residenceSurfaces.selector_summary.person_ids) {
    const entry = residenceSurfaces.selector_summary.entries_by_person_id[personId] ?? null;
    const hook = residenceSurfaces.distance_hooks.entries_by_person_id[personId] ?? null;
    const snapshotPerson = (snapshot as any).people?.[personId] ?? null;
    if (snapshotPerson) {
      Object.defineProperty(snapshotPerson, "residence_manor_id", {
        value: entry?.residence_manor_id ?? null,
        enumerable: false,
        writable: true,
        configurable: true
      });
      Object.defineProperty(snapshotPerson, "residence_selector_contexts", {
        value: entry?.selector_contexts ?? [],
        enumerable: false,
        writable: true,
        configurable: true
      });
      Object.defineProperty(snapshotPerson, "residence_distance_hook", {
        value: hook,
        enumerable: false,
        writable: true,
        configurable: true
      });
    }
  }
  const headId = (snapshot.house as any)?.head?.id;
  if (typeof headId === "string" && (snapshot.house as any)?.head) {
    const entry = residenceSurfaces.selector_summary.entries_by_person_id[headId] ?? null;
    const hook = residenceSurfaces.distance_hooks.entries_by_person_id[headId] ?? null;
    Object.defineProperty((snapshot.house as any).head, "residence_manor_id", {
      value: entry?.residence_manor_id ?? null,
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty((snapshot.house as any).head, "residence_selector_contexts", {
      value: entry?.selector_contexts ?? [],
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty((snapshot.house as any).head, "residence_distance_hook", {
      value: hook,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
  const spouseId = (snapshot.house as any)?.spouse?.id;
  if (typeof spouseId === "string" && (snapshot.house as any)?.spouse) {
    const entry = residenceSurfaces.selector_summary.entries_by_person_id[spouseId] ?? null;
    const hook = residenceSurfaces.distance_hooks.entries_by_person_id[spouseId] ?? null;
    Object.defineProperty((snapshot.house as any).spouse, "residence_manor_id", {
      value: entry?.residence_manor_id ?? null,
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty((snapshot.house as any).spouse, "residence_selector_contexts", {
      value: entry?.selector_contexts ?? [],
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty((snapshot.house as any).spouse, "residence_distance_hook", {
      value: hook,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
  for (const child of (snapshot.house as any)?.children ?? []) {
    const childId = typeof child?.id === "string" ? child.id : null;
    if (!childId) continue;
    const entry = residenceSurfaces.selector_summary.entries_by_person_id[childId] ?? null;
    const hook = residenceSurfaces.distance_hooks.entries_by_person_id[childId] ?? null;
    Object.defineProperty(child, "residence_manor_id", {
      value: entry?.residence_manor_id ?? null,
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty(child, "residence_selector_contexts", {
      value: entry?.selector_contexts ?? [],
      enumerable: false,
      writable: true,
      configurable: true
    });
    Object.defineProperty(child, "residence_distance_hook", {
      value: hook,
      enumerable: false,
      writable: true,
      configurable: true
    });
  }
  return snapshot;
}

export function computeTopDrivers(report: TurnReport, before: RunState, after: RunState): string[] {
  const drivers: Array<{ label: string; score: number; text: string }> = [];

  const bushelDiff = after.manor.bushels_stored - before.manor.bushels_stored;
  const unrestDiff = after.manor.unrest - before.manor.unrest;
  const coinDiff = after.manor.coin - before.manor.coin;
  const arrearsCoinDiff = after.manor.obligations.arrears.coin - before.manor.obligations.arrears.coin;
  const arrearsBushelDiff = after.manor.obligations.arrears.bushels - before.manor.obligations.arrears.bushels;

  drivers.push({
    label: "Food",
    score: Math.abs(bushelDiff),
    text: `Food: prod +${report.production_bushels}, cons -${report.consumption_bushels}, spoil -${report.spoilage.loss_bushels}, net ${bushelDiff >= 0 ? "+" : ""}${bushelDiff}.`
  });
  drivers.push({
    label: "Unrest",
    score: Math.abs(unrestDiff),
    text: `Unrest: net ${unrestDiff >= 0 ? "+" : ""}${unrestDiff} (threshold dispossession at 100).`
  });
  drivers.push({
    label: "Obligations",
    score: Math.abs(arrearsCoinDiff) * 20 + Math.abs(arrearsBushelDiff),
    text: `Obligations: tax due ${report.obligations.tax_due_coin}, tithe due ${report.obligations.tithe_due_bushels}, arrears Δ coin ${arrearsCoinDiff >= 0 ? "+" : ""}${arrearsCoinDiff}, bushels ${arrearsBushelDiff >= 0 ? "+" : ""}${arrearsBushelDiff}.`
  });
  drivers.push({
    label: "Coin",
    score: Math.abs(coinDiff),
    text: `Coin: net ${coinDiff >= 0 ? "+" : ""}${coinDiff}.`
  });
  drivers.sort((a, b) => b.score - a.score);
  return drivers.slice(0, 3).map((d) => d.text);
}
