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
        showAllKnownHouses={false}
      />
    );

    expect(html).toContain("Open dossier");
    expect(html).toContain('data-person-card-open="p_ext_01_head"');
    expect(html).not.toContain('data-person-card-open="p_ext_02_head"');
    expect(html.indexOf("Open dossier")).toBeLessThan(html.indexOf("House Ashford"));
  });
});
