import { describe, expect, it } from "vitest";

import {
  buildObligationsVisibilityFixtureCases,
  OBLIGATIONS_VISIBILITY_FIXTURE_SCENARIO_ORDER
} from "../support/obligationsVisibilityFixtures";

describe("obligation visibility gate", () => {
  it("locks the v0.3.6 successor-transfer and vacancy carry cases on player-facing obligation surfaces", () => {
    const cases = buildObligationsVisibilityFixtureCases();

    expect(Object.keys(cases)).toEqual([...OBLIGATIONS_VISIBILITY_FIXTURE_SCENARIO_ORDER]);

    const successorCase = cases.split_payment_successor_rebase;
    const liegeSection = successorCase.counterpartySections.find((section) => section.id === "liege");
    const churchSection = successorCase.counterpartySections.find((section) => section.id === "church");

    expect(liegeSection).toMatchObject({
      title: "Lady Regent (current liege)",
      helper: "Lady Regent now collects liege dues after House Liege died.",
      dueGroup: {
        summary: "Lady Regent (current liege): 3 coin in arrears."
      },
      penaltyGroup: {
        summary: "Lady Regent (current liege): 3 coin in arrears.",
        enforcementSummary: "Stage-one enforcement pressure rose for Lady Regent (current liege) because arrears remain open after carry.",
        carriedThisTurn: true,
        settledThisTurn: true
      }
    });
    expect(liegeSection?.receiptGroups.find((group) => group.id === "payment")).toMatchObject({
      receiptCount: 3
    });
    expect(liegeSection?.receiptGroups.find((group) => group.id === "penalty")).toMatchObject({
      receiptCount: 2
    });

    expect(churchSection).toMatchObject({
      title: "Father Aldwyn (St. Cuthbert Parish)",
      helper: "Father Aldwyn now collects church dues for St. Cuthbert Parish after Parish Church died.",
      dueGroup: {
        summary: "Father Aldwyn (St. Cuthbert Parish): 4 bushels in arrears."
      },
      penaltyGroup: {
        summary: "Father Aldwyn (St. Cuthbert Parish): 4 bushels in arrears.",
        enforcementSummary: "Stage-one enforcement pressure rose for Father Aldwyn (St. Cuthbert Parish) because arrears remain open after carry.",
        carriedThisTurn: true,
        settledThisTurn: true
      }
    });
    expect(churchSection?.receiptGroups.find((group) => group.id === "payment")).toMatchObject({
      receiptCount: 3
    });
    expect(churchSection?.receiptGroups.find((group) => group.id === "penalty")).toMatchObject({
      receiptCount: 2
    });

    const vacancyCase = cases.church_vacancy_carry;
    const vacantChurch = vacancyCase.counterpartySections.find((section) => section.id === "church");

    expect(vacantChurch).toMatchObject({
      title: "St. Cuthbert Parish (Vacant)",
      helper: "St. Cuthbert Parish has no living priest; dues remain with the institution until a successor is placed.",
      dueGroup: {
        summary: "St. Cuthbert Parish (Vacant): 8 bushels in arrears."
      },
      penaltyGroup: {
        summary: "St. Cuthbert Parish (Vacant): 8 bushels in arrears.",
        enforcementSummary: "Stage-one enforcement pressure rose for St. Cuthbert Parish (Vacant) because arrears remain open after carry.",
        carriedThisTurn: true,
        settledThisTurn: false
      }
    });
    expect(vacantChurch?.receiptGroups.find((group) => group.id === "payment")).toMatchObject({
      receiptCount: 0
    });
    expect(vacantChurch?.receiptGroups.find((group) => group.id === "penalty")).toMatchObject({
      receiptCount: 2
    });
  });
});
