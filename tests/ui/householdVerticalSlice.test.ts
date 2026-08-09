import React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  councilSeatPosition,
  HouseRoomStandard,
  HouseholdVerticalSlice,
  RouteBar,
} from "../../src/ui/panels/HouseholdVerticalSlice";
import {
  buildCouncilRoomReadyProjection,
  DEFAULT_COUNCIL_ROOM_HOUSE_ID,
} from "../../src/ready/councilRoomReadyProjection";

describe("HouseholdVerticalSlice", () => {
  it("waits for the pinned read model instead of rendering an authored fallback", () => {
    const html = renderToStaticMarkup(React.createElement(HouseholdVerticalSlice));

    expect(html).toContain("Opening the House record");
    expect(html).toContain("selected House’s January 1120 CourtOS record");
    expect(html).not.toContain("Ralph asks to speak about a short delivery");
    expect(html).not.toContain("Roadcote");
  });

  it("keeps implementation vocabulary and fabricated assignments out of the loading scene", () => {
    const html = renderToStaticMarkup(React.createElement(HouseholdVerticalSlice));

    expect(html).not.toContain("Isabel of Ridgestead");
    expect(html).not.toContain("Keeper of Household Stores");
    expect(html).not.toContain("sr_household");
    expect(html).not.toContain("Atomic responsibility");
    expect(html).not.toContain("W2");
    expect(html).not.toContain("PAS");
    expect(html).not.toContain("fixture");
  });

  it("keeps the four projected Pearwick Hall Council seats available to the Inner Council", () => {
    const projection = buildCouncilRoomReadyProjection({
      houseId: DEFAULT_COUNCIL_ROOM_HOUSE_ID,
      turnYear: 1120,
    });

    expect(
      projection.inner_council_seats.map((seat) => seat.person_ref.display_name),
    ).toEqual([
      "Edmund of Pearwick Hall",
      "Isabel of Ridgestead",
      "Aveline of Lily Croft",
      "Wulfstan Ford",
    ]);
    expect(
      projection.inner_council_seats.some(
        (seat) => seat.person_ref.display_name === "Ralph Woolman",
      ),
    ).toBe(false);
    expect(
      projection.inner_council_seats.every((seat) =>
        seat.source_refs.every(
          (source) =>
            source.runtime_authority === false &&
            source.authority_status?.includes("source_candidate"),
        ),
      ),
    ).toBe(true);
  });

  it("carries source-resolved House heraldry into non-Council room environments", () => {
    const html = renderToStaticMarkup(
      React.createElement(HouseRoomStandard, {
        houseId: DEFAULT_COUNCIL_ROOM_HOUSE_ID,
        houseName: "House Pearwick Hall",
      }),
    );

    expect(html).toContain('data-house-id="t0h_bcae5bd911ab10f4c7fdfea0"');
    expect(html).toContain(
      "/assets/heraldry/house-pearwick-hall/banner-tab.png",
    );
    expect(html).toContain("House Pearwick Hall house standard");
  });

  it("extends the Pearwick seat hierarchy symmetrically for a seven-seat council", () => {
    const projection = buildCouncilRoomReadyProjection({
      houseId: "t0h_1ed8d543f12b387ed751f1a6",
      turnYear: 1120,
    });
    const positions = projection.inner_council_seats.map((seat) =>
      councilSeatPosition(seat, projection.inner_council_seats.length),
    );

    expect(positions).toHaveLength(7);
    expect(positions[0]).toMatchObject({ x: 50, y: 19 });
    expect(positions[1].x + positions[3].x).toBe(100);
    expect(positions[1].y).toBe(positions[3].y);
    expect(positions[2].x + positions[4].x).toBe(100);
    expect(positions[2].y).toBe(positions[4].y);
    expect(positions[5].x + positions[6].x).toBe(100);
    expect(positions[5].y).toBe(positions[6].y);
  });

  it("keeps every Council domain reachable in a 390px-class viewport above the fixed route bar", () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src/ui/panels/householdVerticalSlice.css"),
      "utf8",
    );

    expect(css).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.uat-venue\[data-scene="council"\]\s*\{\s*min-height:\s*1320px/,
    );
    expect(css).toMatch(
      /\.uat-council-scene\s*\{\s*height:\s*auto;\s*min-height:\s*1320px/,
    );
    expect(css).toMatch(/\.uat-venue\s*\{[\s\S]*?position:\s*relative;[\s\S]*?overflow:\s*visible/);
    expect(css).toMatch(/\.uat-venue\[data-scene="council"\]\s*\{\s*min-height:\s*1320px/);
    expect(css).toMatch(/\.uat-council-domain-objects\s*\{[\s\S]*?bottom:\s*82px/);
  });

  it("keeps House Command available from every operational place, not only the Council room", () => {
    const html = renderToStaticMarkup(
      React.createElement(RouteBar, {
        route: {
          place: {
            kind: "responsibility",
            domain: "resources_finance",
            responsibility: "manor_fiscal_administration",
            scopeId: "manor_hx_44835",
          },
          detail: null,
        },
        selectedManor: null,
        onCouncil: () => undefined,
        onHouseCommand: () => undefined,
        onDomain: () => undefined,
      }),
    );

    expect(html).toContain("House Command");
    expect(html).toContain('aria-label="Open House Command: assignments, delegation, and authority"');
    expect(html).toMatch(
      /<button(?=[^>]*aria-label="Open House Command: assignments, delegation, and authority")(?![^>]*disabled)[^>]*>/,
    );
  });

  it("keeps map code and Household detail out of the Council boot path", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/ui/panels/HouseholdVerticalSlice.tsx"),
      "utf8",
    );
    const householdClient = fs.readFileSync(
      path.resolve(process.cwd(), "src/ui/household1120Client.ts"),
      "utf8",
    );
    const spatialClient = fs.readFileSync(
      path.resolve(process.cwd(), "src/ui/spatial/courtosSpatialClient.ts"),
      "utf8",
    );

    expect(source).toContain('React.lazy(async () =>');
    expect(source).toContain('import("../spatial/ManorOperationsScene")');
    expect(source).not.toContain('from "../spatial/ManorOperationsScene"');
    expect(source).toContain("enabled: householdProjectionRequired");
    expect(source).toContain("enabled: estateProjectionRequired");
    expect(householdClient).toContain("if (input.enabled === false)");
    expect(spatialClient).toContain("if (options.enabled === false)");
  });

  it("provides bounded recovery without exposing raw dependency errors", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/ui/panels/HouseholdVerticalSlice.tsx"),
      "utf8",
    );

    expect(source).toContain("Try the record again");
    expect(source).toContain("COURTOS_SHELL_SOURCE_MISMATCH");
    expect(source).toContain("HOUSEHOLD_SOURCE_MISMATCH");
    expect(source).not.toContain("detail={courtOsState.error.message}");
    expect(source).toContain("The Household read contract is unavailable.");
    expect(source).not.toContain("DEFAULT_UAT_HOUSE_ID");
    expect(source).toContain("return value || COURTOS_PLAYER_CONTEXT.house_id");
    expect(source).not.toContain("recorded knowledge");
    expect(source).not.toContain("Provisional seats · awaiting a formal House record");
    expect(source).not.toContain("Provisional Council seat");
    expect(source).not.toContain("P-1 product checkpoint");
    expect(source).not.toContain("Shared planning boundary verified");
    expect(source).not.toContain("pinned as one accepted release");
    expect(source).not.toContain("stale or mixed identity");
    expect(source).toContain("The House stewardship record");
    expect(source).toContain("Inner Council seat");
    expect(source).toContain("COURTOS_PLAYER_CONTEXT.house_id");
    expect(source).not.toContain("VITE_COURTOS_PLAYER_HOUSE_ID");
    expect(source).toContain('window.scrollTo({ top: 0, behavior: "auto" })');
    expect(source).toContain("data-council-source={model.councilSource.status}");
    expect(source).toContain("JourneyHouseCommandContext");
    expect(source).toContain("JourneyResponsibilityContext");
    expect(source).toContain("journeyCourtOsModel = null");
    expect(source).toContain("no Journey claim is made");
    expect(source).toContain("COURTOS_HOUSE_ACCESS_DENIED");
    expect(source).toContain("No operational record has been requested");
    expect(source).toContain('data-layout="room-folio"');
    expect(source).toContain('data-surface="working-folio"');
    expect(source).toContain("Turn-opening recommendations");
    expect(source).toContain("Education plans · not yet executed");
    expect(source).toContain("Recommended formation");
    expect(source).toContain("Proposed provider");
    expect(source).toContain("Provider capacity not established");
    expect(source).toContain("<HouseMark houseId={model.house.houseId}");
    expect(source).not.toContain("<HouseRoomStandard");
    expect(source).not.toContain("admitted rows");
    expect(source).toContain("Account ready");
    expect(source).toContain("No current charge");
    expect(source).toContain("No verified charge");
    expect(source).toContain("accountable stewards");
    expect(source).toContain("Choose a recorded charge to review its accountable steward");
    expect(source).not.toContain("Opening record ready");
    expect(source).not.toContain("Conditional · no current instance");
    expect(source).not.toContain("Record unavailable");
    expect(source).toContain("No individual entry is recorded");
    expect(source).toContain("a {planningCycleLabel} assignment plan.");
    expect(source).toContain("threeYearStewardshipHorizonFrom(");
    expect(source).toContain("Saved plans preserve the current appointment");
    expect(source).toContain("onOpenResponsibility(definition.key)");
    expect(source).toContain("Manage the three-year stewardship plan");
    expect(source).toContain("stewardshipPlanning.responsibilities");
    expect(source).toContain("HouseCommandReadSurface");
    expect(source).toContain("CourtOsResponsibilityHeadsBrief");
    expect(source).toContain("CourtOsResponsibilityHousePapers");
    expect(source).toContain("buildCourtOsResponsibilityBrief");
    expect(source).toContain('papers.querySelector("summary")?.focus()');
    expect(source).toContain("canonicalSearch");
    expect(source).toContain('kind: "stores_position"');
    expect(source.match(/<dt>Location<\/dt>/g)).toHaveLength(1);
    expect(source).toContain('kind: "adult_kin_subject"');
    expect(source).toContain('kind: "health_record"');
    expect(source).toContain('kind: "workspace_record"');
    expect(source).toContain("onOpenPaper={openPaper}");
    expect(source).toContain("Why this remains Household work");
    expect(source).toContain("Prior-cycle entries");
    expect(source).toContain("Course since last report");
    expect(source).toContain("Household care posture");
    expect(source).toContain("Formation provider");
    expect(source).toContain("buildCourtOsStewardshipPlanningProjection");
    expect(source).toContain("<CourtOsStewardshipPlanner");
    expect(source).toContain("courtOsStewardshipScopeKey");
    expect(source).toContain("detailsRef={housePapersRef}");
    expect(source).toContain("Supporting House papers");
    expect(source).toContain("CourtOsResponsibilityHeadsBrief");
    expect(source).not.toContain("function HeadsBrief");
    expect(source).toContain("Stewardship by room");
    expect(source).toContain("COURTOS_DOMAINS.map((domain)");
    expect(source).toContain("of 24 responsibilities have a current House scope");
    expect(source).toContain("Open only when this work is present");
  });

  it("keeps the inhabited responsibility room larger than its working folio", () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src/ui/panels/householdVerticalSlice.css"),
      "utf8",
    );
    expect(css).toMatch(
      /@media \(min-width: 981px\)[\s\S]*?\.uat-workspace\s*\{[\s\S]*?width:\s*min\(820px, 60vw\)[\s\S]*?max-height:\s*min\(610px, 68svh\)/,
    );
    expect(css).toMatch(
      /@media \(min-width: 981px\)[\s\S]*?\.uat-responsibility-rail\s*\{[\s\S]*?background:\s*transparent/,
    );
  });
});
