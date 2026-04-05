import { UNREST_ARREARS_PENALTY } from "../constants";
import {
  clearWarLevyDue,
  setTitheDueBushels,
  setTaxDueCoin,
  spendBushels,
  spendCoin,
} from "../domains/economy/ledger";
import { applyEconomyObligationCloseTurnStage } from "../domains/economy/obligationEnforcement";
import { settleEconomyObligationCounterparty } from "../domains/economy/obligationRegistry";
import { recordEconomyPortfolioPhaseHints, refreshEconomyPortfolioState } from "../domains/economy/portfolioAnalysis";
import { applyRelationshipDelta } from "../domains/people/relationshipEngine";
import type { RunState, TurnDecisions } from "../types";
import { clampInt } from "../util";

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

  const currentDueUnpayable =
    state.manor.coin < ob.tax_due_coin ||
    state.manor.bushels_stored < ob.tithe_due_bushels;
  if (currentDueUnpayable) {
    state.manor.unrest = clampInt(state.manor.unrest + UNREST_ARREARS_PENALTY, 0, 100);
    applyRelationshipDelta(state, state.locals.liege.id, state.house.head.id, { respect: -1, threat: +1 }, "obligations_current_due_pressure");
  }

  recordEconomyPortfolioPhaseHints(state, {
    production_food_delta: productionBushels
  });
  refreshEconomyPortfolioState(state);
}

export function applyDecisionObligationsPhase(state: RunState, decisions: TurnDecisions, reportNotes: string[]): void {
  const ob = state.manor.obligations;

  const arrearsCoinBefore = ob.arrears.coin;
  const arrearsBushelsBefore = ob.arrears.bushels;
  const liegeSettlement = settleEconomyObligationCounterparty(state, {
    phase: "obligations",
    phase_sequence: 1,
    counterparty_kind: "liege",
    requested_amount: decisions.obligations.pay_coin,
    payment_mode: "coin",
    rule_id: "obligations.liege_due_settlement",
    related_actor_ids: [state.house.head.id, state.locals.liege.id]
  });
  const churchSettlement = settleEconomyObligationCounterparty(state, {
    phase: "obligations",
    phase_sequence: 2,
    counterparty_kind: "church",
    requested_amount: decisions.obligations.pay_bushels,
    payment_mode: "food_stores",
    rule_id: "obligations.church_due_settlement",
    related_actor_ids: [state.house.head.id, state.locals.clergy.id]
  });
  const toArrearsCoin = liegeSettlement.paid_to_arrears;
  const toArrearsBushels = churchSettlement.paid_to_arrears;
  const toTax = liegeSettlement.paid_to_due;
  const toTithe = churchSettlement.paid_to_due;

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

  refreshEconomyPortfolioState(state);
}

function obligationStatusNote(label: string, amount: number, assetLabel: string): string {
  if (amount <= 0) return `${label} clear`;
  return `${label} arrears ${amount} ${assetLabel}`;
}

export function applyCloseTurnObligationsPhase(state: RunState, reportNotes: string[]): void {
  const result = applyEconomyObligationCloseTurnStage(state, {
    phase: "succession",
    phase_sequence: 1,
    rule_prefix: "obligations.close_turn",
    related_actor_ids: [state.house.head.id, state.locals.clergy.id, state.locals.liege.id],
    shortage: Boolean((state.flags as Record<string, unknown>).Shortage)
  });
  const churchCarry = result.carry_results_by_counterparty.church.carried_amount;
  const liegeCarry = result.carry_results_by_counterparty.liege.carried_amount;
  const churchEntry = result.penalty_stage.entries.find((entry) => entry.counterparty_kind === "church");
  const liegeEntry = result.penalty_stage.entries.find((entry) => entry.counterparty_kind === "liege");
  const unrestNote =
    result.penalty_stage.stable_unrest_delta !== 0
      ? `unrest eased by ${Math.abs(result.penalty_stage.stable_unrest_delta)}`
      : result.penalty_stage.shortage_active
        ? "unrest unchanged (shortage active)"
        : "unrest unchanged";

  reportNotes.push(`Obligation carry: tax +${liegeCarry} coin to arrears; tithe +${churchCarry} bushels to arrears.`);
  reportNotes.push(
    `Obligation enforcement: ${obligationStatusNote("liege", liegeEntry?.arrears_amount ?? 0, "coin")}; ${obligationStatusNote("church", churchEntry?.arrears_amount ?? 0, "bushels")}; ${unrestNote}.`
  );

  recordEconomyPortfolioPhaseHints(state, {
    consumption_shortage_bushels: Boolean((state.flags as Record<string, unknown>).Shortage) ? 1 : 0
  });
  refreshEconomyPortfolioState(state);
}
