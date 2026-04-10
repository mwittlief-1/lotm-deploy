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
          { head_name: "Aveline", house_id: "h_ext_01", house_name: "Falkmere", tier: "Count" },
          { head_name: "Roland", house_id: "h_ext_02", house_name: "Ashford", tier: "Baron" }
        ]}
        knownHousesMain={[
          { head_name: "Aveline", house_id: "h_ext_01", house_name: "Falkmere", tier: "Count" },
          { head_name: "Roland", house_id: "h_ext_02", house_name: "Ashford", tier: "Baron" }
        ]}
        onOpenHouseDossier={() => undefined}
        onToggleShowAll={() => undefined}
        showAllKnownHouses={false}
      />
    );

    expect(html).toContain("Open dossier");
    expect(html.indexOf("Open dossier")).toBeLessThan(html.indexOf("House Ashford"));
  });
});
