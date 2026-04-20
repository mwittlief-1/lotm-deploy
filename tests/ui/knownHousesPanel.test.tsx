import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KnownHousesPanel } from "../../src/ui/panels/KnownHousesPanel";

describe("KnownHousesPanel", () => {
  it("shows dossier routing only for houses that resolve through the canonical dossier seam", () => {
    const html = renderToStaticMarkup(
      <KnownHousesPanel
        copy={{
          headLabel: "Head:",
          heirIndicator_hasMaleHeir: "Has male heir",
          heirIndicator_heiressPossible: "Heiress possible",
          heirIndicator_noMaleHeir: "No male heir",
          hideDetails: "Hide details",
          housePrefix: (houseName: string) => `House ${houseName}`,
          knownHouses: "Known Houses",
          knownHousesEmpty: "No houses.",
          showDetails: "Show details",
          tierLabel: "Tier:",
          tooltipAllegiance: "Allegiance help.",
          tooltipHeirIndicator: "Heir help.",
          tooltipRespect: "Respect help.",
          tooltipThreat: "Threat help.",
          tooltipTier: "Tier help."
        }}
        dossierHouseIds={new Set(["h_ext_01"])}
        hasMoreKnownHouses={false}
        knownHouses={[
          { head_id: "p_ext_01_head", head_name: "Aveline", house_id: "h_ext_01", house_name: "Falkmere", tier: "Count" },
          { head_id: "p_ext_02_head", head_name: "Roland", house_id: "h_ext_02", house_name: "Ashford", tier: "Baron" }
        ]}
        knownHousesMain={[
          { head_id: "p_ext_01_head", head_name: "Aveline", house_id: "h_ext_01", house_name: "Falkmere", tier: "Count" },
          { head_id: "p_ext_02_head", head_name: "Roland", house_id: "h_ext_02", house_name: "Ashford", tier: "Baron" }
        ]}
        onOpenHouseDossier={() => undefined}
        onOpenPersonCard={() => undefined}
        onToggleShowAll={() => undefined}
        personCardIds={new Set(["p_ext_01_head"])}
        previewState={{
          house_dossiers: [
            {
              child_count: 0,
              has_male_heir: true,
              heiress_possible: false,
              holdings_footprint: {
                anchor_manor_id: "hx_18",
                holdings_band: "single_holding",
                holdings_count: 1,
                known_manor_ids: ["hx_18"],
                source_kind: "house_seed"
              },
              household_member_count: 1,
              household_scope: "head_only",
              house_id: "h_ext_01",
              house_name: "Falkmere",
              kinship_summary: "none",
              kinship_tags: [],
              knownness: "known_house",
              knownness_sources: ["nearby_house"],
              ledger_band: "stable",
              ledger_trend: "flat",
              living_member_count: 1,
              relevance_reasons: ["nearby_house"],
              relevance_tier: "tier1",
              relationship_summary: null,
              relationship_turn_movement_count: 0,
              relationship_turn_movement_rows: [],
              schema_version: "house_dossier_summary_v2",
              tier: "Count"
            }
          ]
        } as any}
        showAllKnownHouses={false}
      />
    );

    expect(html).toContain("Open dossier");
    expect(html).toContain('data-person-card-open="p_ext_01_head"');
    expect(html).not.toContain('data-person-card-open="p_ext_02_head"');
    expect(html).toContain("Count · Head Aveline · Anchor Hx 18");
    expect(html.indexOf("Open dossier")).toBeLessThan(html.indexOf("House Ashford"));
  });
});
