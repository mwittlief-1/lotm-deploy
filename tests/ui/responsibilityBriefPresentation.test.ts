import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  buildCourtOsResponsibilityBrief,
  courtOsResponsibilityWorkspacePostureForHouse,
  COURTOS_RESPONSIBILITY_BRIEF_KEYS,
  COURTOS_RESPONSIBILITY_BRIEF_VOCABULARY,
} from "../../src/ui/responsibilityBriefPresentation";
import {
  COURTOS_DOMAINS,
  COURTOS_RESPONSIBILITIES,
} from "../../src/ui/courtosInformationArchitecture";
import { CourtOsResponsibilityHeadsBrief } from "../../src/ui/responsibilityHeadsBrief";
import { responsibilityWorkspaceSource } from "../../src/ui/responsibilityWorkspaceCatalog";

describe("responsibility Head's Brief presentation", () => {
  it("covers the sole 24-responsibility product hierarchy", () => {
    expect(COURTOS_RESPONSIBILITY_BRIEF_KEYS).toHaveLength(24);
    expect(new Set(COURTOS_RESPONSIBILITY_BRIEF_KEYS).size).toBe(24);
    expect(COURTOS_RESPONSIBILITY_BRIEF_VOCABULARY.size).toBe(24);
    expect(
      COURTOS_RESPONSIBILITY_BRIEF_KEYS.every((responsibility) =>
        COURTOS_RESPONSIBILITY_BRIEF_VOCABULARY.has(responsibility),
      ),
    ).toBe(true);
  });

  it("matches all eight room routes without an orphaned or duplicate responsibility", () => {
    const roomKeys = COURTOS_DOMAINS.flatMap((domain) =>
      domain.responsibilities.map((responsibility) => responsibility.key),
    );
    expect(COURTOS_DOMAINS).toHaveLength(8);
    expect(COURTOS_RESPONSIBILITIES).toHaveLength(24);
    expect(roomKeys).toHaveLength(23);
    expect(new Set([...roomKeys, "office_post_appointments"])).toEqual(
      new Set(COURTOS_RESPONSIBILITY_BRIEF_KEYS),
    );
  });

  it("builds the four decision-oriented layers without promoting evidence into the current account", () => {
    const brief = buildCourtOsResponsibilityBrief({
      responsibility: "education_formation",
      currentState: "Twelve current learner arrangements are recorded.",
      evidence: [
        "Education arrangement register",
        "1117–1119 annual structured receipts",
        "Responsible-party cycle reports",
      ],
      posture: "read_ready",
      accountableHolderCount: 1,
      authorityScopeCount: 1,
      openingRecordCount: 12,
      headOfHouseAssigned: false,
    });

    expect(brief.sections.map((section) => section.key)).toEqual([
      "account",
      "change",
      "attention",
      "decision",
    ]);
    expect(brief.sections[0]?.body).toBe(
      "Current learners are entered with their formation, provider, host, and responsible party.",
    );
    expect(brief.sections[0]?.body).not.toContain("structured receipts");
    expect(brief.sections[1]?.body).toContain(
      "prior account is held in the House papers",
    );
    expect(brief.evidenceSummary).toBe(
      "The supporting House papers contain the opening entries behind this account.",
    );
    expect(brief.actionSurfaceEligible).toBe(false);
  });

  it("fails closed in the brief when the exact scope is withheld", () => {
    const brief = buildCourtOsResponsibilityBrief({
      responsibility: "reception_intake",
      currentState: "The reception anchor is withheld.",
      evidence: ["Reception anchor withholding docket"],
      posture: "withheld_fail_closed",
      accountableHolderCount: 0,
      authorityScopeCount: 0,
      openingRecordCount: 0,
      headOfHouseAssigned: true,
    });

    expect(brief.actionSurfaceEligible).toBe(false);
    expect(brief.sections[2]).toMatchObject({
      key: "attention",
      state: "withheld",
    });
    expect(brief.sections[2]?.body).toContain("No person, place, or authority is assumed");
    expect(brief.sections.map((section) => section.body).join(" ")).not.toMatch(
      /withheld|fail-closed/i,
    );
    expect(brief.sections[3]?.state).toBe("withheld");
  });

  it("keeps the future Head-only action seam explicit", () => {
    const assigned = buildCourtOsResponsibilityBrief({
      responsibility: "house_fiscal_administration",
      currentState: "The opening account is recorded.",
      evidence: ["Opening balance and custody rollups"],
      posture: "read_ready",
      accountableHolderCount: 1,
      authorityScopeCount: 1,
      openingRecordCount: 5,
      headOfHouseAssigned: true,
    });
    const delegated = buildCourtOsResponsibilityBrief({
      responsibility: "house_fiscal_administration",
      currentState: "The opening account is recorded.",
      evidence: ["Opening balance and custody rollups"],
      posture: "read_ready",
      accountableHolderCount: 1,
      authorityScopeCount: 1,
      openingRecordCount: 5,
      headOfHouseAssigned: false,
    });

    expect(assigned.actionSurfaceEligible).toBe(true);
    expect(delegated.actionSurfaceEligible).toBe(false);
  });

  it("does not turn a globally available source into a current House charge", () => {
    expect(courtOsResponsibilityWorkspacePostureForHouse({
      sourcePosture: "read_ready",
      assignmentScopeCount: 0,
      openingRecordCount: 0,
    })).toBe("conditional_empty");
    expect(courtOsResponsibilityWorkspacePostureForHouse({
      sourcePosture: "read_ready",
      assignmentScopeCount: 1,
      openingRecordCount: 0,
    })).toBe("read_ready");
    expect(courtOsResponsibilityWorkspacePostureForHouse({
      sourcePosture: "read_ready",
      assignmentScopeCount: 0,
      openingRecordCount: 1,
    })).toBe("read_ready");
    expect(courtOsResponsibilityWorkspacePostureForHouse({
      sourcePosture: "withheld_fail_closed",
      assignmentScopeCount: 1,
      openingRecordCount: 1,
    })).toBe("withheld_fail_closed");
  });

  it("renders a complete player-facing Head's Brief for every responsibility", () => {
    for (const responsibility of COURTOS_RESPONSIBILITY_BRIEF_KEYS) {
      const source = responsibilityWorkspaceSource(responsibility);
      const domain = COURTOS_DOMAINS.find((candidate) =>
        candidate.responsibilities.some((item) => item.key === responsibility),
      );
      const brief = buildCourtOsResponsibilityBrief({
        responsibility,
        currentState: source.currentState,
        evidence: source.evidence,
        posture: source.posture,
        accountableHolderCount: source.posture === "read_ready" ? 1 : 0,
        authorityScopeCount: source.posture === "read_ready" ? 1 : 0,
        openingRecordCount: source.posture === "read_ready" ? 1 : 0,
        headOfHouseAssigned: false,
      });
      const label = COURTOS_RESPONSIBILITIES.find((item) => item.key === responsibility)?.label;
      if (!label) throw new Error(`Missing responsibility label for ${responsibility}`);
      const html = renderToStaticMarkup(
        React.createElement(CourtOsResponsibilityHeadsBrief, {
          brief,
          domain: domain?.key ?? "house_command",
          roomLabel: domain?.label ?? "House Command",
          responsibilityLabel: label,
          steward: null,
          stewardNote: "No named steward is entered for this charge.",
          onOpenHousePapers: () => undefined,
        }),
      );
      const visibleText = html.replace(/<[^>]*>/g, " ");

      expect(html.match(/data-brief-section=/g), responsibility).toHaveLength(4);
      expect(html, responsibility).toContain("Open the House papers");
      expect(visibleText, responsibility).not.toMatch(
        /\b(?:UAT1|runtime|candidate|admitted|fail-closed|withheld)\b/i,
      );
    }
  });
});
