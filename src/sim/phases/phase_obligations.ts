import { UNREST_ARREARS_PENALTY } from "../constants";
import {
  clearWarLevyDue,
  setTitheDueBushels,
  setTaxDueCoin,
  spendArrearsBushels,
  spendArrearsCoin,
  spendBushels,
  spendCoin,
  spendTitheDueBushels,
  spendTaxDueCoin
} from "../domains/economy/ledger";
import { applyRelationshipDelta } from "../domains/people/relationshipEngine";
import type { RunState, TurnDecisions } from "../types";
import { asNonNegInt, clampInt } from "../util";

function modsObj(state: RunState): Record<string, number> {
  const anyFlags: any = state.flags;
  if (!anyFlags._mods || typeof anyFlags._mods !== "object") anyFlags._mods = {};
  return anyFlags._mods as Record<string, number>;
}

export function applyPreviewObligationsPhase(state: RunState, productionBushels: number): void {
  const ob = state.manor.obligations;

  if (ob.arrears.coin > 0 || ob.arrears.bushels > 0) {
    state.manor.unrest = clampInt(state.manor.unrest + UNREST_ARREARS_PENALTY, 0, 100);
    applyRelationshipDelta(state, state.locals.liege.id, state.house.head.id, { respect: -2, threat: +2 }, "obligations_arrears_preview");
  }

  setTaxDueCoin(state, Math.max(1, Math.floor(state.manor.population / 25)));
  setTitheDueBushels(state, Math.floor(productionBushels * 0.05));
}

export function applyDecisionObligationsPhase(state: RunState, decisions: TurnDecisions, reportNotes: string[]): void {
  const ob = state.manor.obligations;

  let coinPay = spendCoin(state, decisions.obligations.pay_coin);
  let bushelPay = spendBushels(state, decisions.obligations.pay_bushels);

  const arrearsCoinBefore = ob.arrears.coin;
  const arrearsBushelsBefore = ob.arrears.bushels;
  const toArrearsCoin = spendArrearsCoin(state, coinPay);
  coinPay = asNonNegInt(coinPay - toArrearsCoin);

  const toArrearsBushels = spendArrearsBushels(state, bushelPay);
  bushelPay = asNonNegInt(bushelPay - toArrearsBushels);

  const toTax = spendTaxDueCoin(state, coinPay);
  coinPay = asNonNegInt(coinPay - toTax);

  const toTithe = spendTitheDueBushels(state, bushelPay);
  bushelPay = asNonNegInt(bushelPay - toTithe);

  if (arrearsCoinBefore > 0 || arrearsBushelsBefore > 0) {
    reportNotes.push(`Paid arrears: coin -${toArrearsCoin}, bushels -${toArrearsBushels}.`);
  }
  if (toTax > 0 || toTithe > 0) {
    reportNotes.push(`Paid current dues: tax -${toTax} coin, tithe -${toTithe} bushels.`);
  }

  if (ob.war_levy_due && ob.war_levy_due.kind === "men_or_coin") {
    const levy = ob.war_levy_due;
    const choice = decisions.obligations.war_levy_choice ?? "ignore";
    if (choice === "men") {
      const mods = modsObj(state);
      mods["farmer_penalty"] = (mods["farmer_penalty"] ?? 0) + levy.men;
      clearWarLevyDue(state);
      applyRelationshipDelta(state, state.locals.liege.id, state.house.head.id, { respect: +2, threat: -2 }, "war_levy_men");
      reportNotes.push(`War levy answered with men: -${levy.men} effective farmers next turn.`);
    } else if (choice === "coin") {
      const paid = spendCoin(state, levy.coin);
      const remaining = levy.coin - paid;
      if (remaining <= 0) {
        clearWarLevyDue(state);
        applyRelationshipDelta(state, state.locals.liege.id, state.house.head.id, { respect: +2, threat: -2 }, "war_levy_coin");
        reportNotes.push(`War levy paid in coin: -${levy.coin} coin.`);
      } else {
        const menNeeded = Math.ceil(levy.men * (remaining / levy.coin));
        const availableMen = Math.max(0, state.manor.farmers);
        if (availableMen >= menNeeded) {
          const mods = modsObj(state);
          mods["farmer_penalty"] = (mods["farmer_penalty"] ?? 0) + menNeeded;
          clearWarLevyDue(state);
          applyRelationshipDelta(state, state.locals.liege.id, state.house.head.id, { respect: +1, threat: -1 }, "war_levy_partial_coin_then_men");
          reportNotes.push(`War levy coin shortfall: paid ${paid}/${levy.coin} coin; covered remainder with men (-${menNeeded} effective farmers next turn).`);
        } else {
          applyRelationshipDelta(state, state.locals.liege.id, state.house.head.id, { respect: -4, threat: +6 }, "war_levy_failed");
          reportNotes.push(`War levy NOT met: paid ${paid}/${levy.coin} coin; insufficient men. Liege anger rises.`);
        }
      }
    } else {
      applyRelationshipDelta(state, state.locals.liege.id, state.house.head.id, { respect: -3, threat: +5 }, "war_levy_ignored");
      reportNotes.push("War levy ignored; liege displeased.");
    }
  }
}
