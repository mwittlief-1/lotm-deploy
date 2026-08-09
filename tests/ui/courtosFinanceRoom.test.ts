import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { courtOsDomain } from "../../src/ui/courtosInformationArchitecture";
import { responsibilityWorkspaceSource } from "../../src/ui/responsibilityWorkspaceCatalog";

describe("CourtOS Resources & Finance production room", () => {
  it("owns the exact three canonical finance responsibilities inside the shared CourtOS room flow", () => {
    const finance = courtOsDomain("resources_finance");
    expect(finance.venue).toBe("The Counting Chamber");
    expect(finance.interactionPattern).toBe("place_responsibility");
    expect(finance.art).toBe("/assets/fiscal-office/candleton-fiscal-office-room.jpg");
    expect(finance.presentationVariants).toEqual([
      {
        key: "counting-chamber-ledger-v1",
        art: "/assets/fiscal-office/candleton-fiscal-office-room.jpg",
        composition: "counting_ledger_chamber",
        titleAnchor: "top_left",
        anchorMap: "great-ledger|manor-rolls|sealed-grants",
        background: { fit: "cover", repeat: "no-repeat", focalPoint: "50% 44%" },
        settings: [
          { responsibility: "house_fiscal_administration", anchor: "near_center", fixture: "great-ledger", art: "/assets/courtos/rooms/resources-finance/house-fiscal-administration-v1.jpg" },
          { responsibility: "manor_fiscal_administration", anchor: "mid_left", fixture: "manor-rolls", art: "/assets/courtos/rooms/resources-finance/manor-fiscal-administration-v1.jpg" },
          { responsibility: "revenue_right_administration_collection", anchor: "mid_right", fixture: "sealed-grants", art: "/assets/courtos/rooms/resources-finance/revenue-right-administration-collection-v2.jpg" },
        ],
      },
    ]);
    expect(finance.responsibilities.map((row) => row.key)).toEqual([
      "house_fiscal_administration",
      "manor_fiscal_administration",
      "revenue_right_administration_collection",
    ]);
    expect(responsibilityWorkspaceSource("house_fiscal_administration").posture).toBe("read_ready");
    expect(responsibilityWorkspaceSource("manor_fiscal_administration").posture).toBe("read_ready");
    expect(responsibilityWorkspaceSource("revenue_right_administration_collection").posture).toBe("conditional_empty");
  });

  it("keeps presentation, scoped assignment planning, and future HoH action eligibility separate", async () => {
    const source = await readFile(
      new URL("../../src/ui/panels/HouseholdVerticalSlice.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("data-room-flow={domain.interactionPattern}");
    expect(source).toContain('data-room-presentation={presentation.posture === "available" ? presentation.variant.key : "withheld"}');
    expect(source).toContain("<RoomResponsibilityMarker");
    expect(source).not.toContain("FinanceRoomScene");
    expect(source).toContain('data-hoh-action-eligible={headOfHouseAssigned ? "true" : "false"}');
    expect(source).toContain("buildCourtOsStewardshipPlanningProjection");
    expect(source).toContain("courtOsStewardshipScopeKey");
    expect(source).toContain("<CourtOsStewardshipPlanner");
    expect(source).toContain("No current revenue right is recorded for this House.");
    expect(source).toContain("accountableHolderCount: Math.max(distinctHolders.size, holder ? 1 : 0)");
    expect(source).toContain("buildCourtOsResponsibilityBrief");
    expect(source).not.toContain("hasMultipleHolders");
    expect(source).not.toContain("each remains bound to its named holder");
    expect(source).toContain("routeScopeId");
    expect(source).toContain("onScopeChange(scope.scope_id)");
    expect(source).toContain("FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION");
    expect(source).toContain("<HouseFiscalScribeBrief");
    expect(source).toContain("onOpenHousePapers={onOpenHousePapers}");
    expect(source).not.toContain('href="#house-papers"');
    expect(source).toContain('data-scribe-delivery={brief.mode}');
    expect(source).toContain("Boolean(sourceGenerationId)");
    expect(source).not.toContain("...council.inner_council_seats.map");
    expect(source).not.toContain("generation_id.slice(0, 12)");
    expect(source).not.toContain("Council source projection is unavailable");
    expect(source).not.toContain("Candidate rights remain evidence only");
    expect(source).not.toContain("Collect revenue now");
    expect(source).not.toContain("Settle account");
  });

  it("contains modal focus and makes the background inert while an inspection is open", async () => {
    const source = await readFile(
      new URL("../../src/ui/panels/HouseholdVerticalSlice.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain('if (event.key !== "Tab") return;');
    expect(source).toContain('element.setAttribute("inert", "")');
    expect(source).toContain("event.shiftKey && document.activeElement === first");
    expect(source).toContain("!event.shiftKey && document.activeElement === last");
    expect(source).toContain('element.removeAttribute("inert")');
  });
});
