import { buildBoundedRegistryManifest, RUN_STATE_SCHEMA_VERSION } from "../../stateSchema";
import type { RunSnapshot, RunState, TurnReport } from "../../types";
import { deepCopy } from "../../util";
import { buildEconomyObligationsView } from "./obligationsView";

export function boundedSnapshot(state: RunState): RunSnapshot {
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
    economy_obligations_view: buildEconomyObligationsView(state),
    portfolio: (state as any).portfolio,
    flags: state.flags,
    game_over: state.game_over ?? null
  });
  if ((state as any).beliefs) {
    Object.defineProperty(snapshot, "beliefs", {
      value: deepCopy((state as any).beliefs),
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
