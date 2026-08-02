import React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  councilSeatPosition,
  HouseholdVerticalSlice,
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

  it("keeps the four projected Pearwick Hall Council seats visibly provisional", () => {
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
    expect(source).toContain("return value || null");
    expect(source).not.toContain("recorded knowledge");
    expect(source).toContain("Candidate membership projection · not admitted source truth");
    expect(source).toContain("data-council-source={model.councilSource.status}");
  });
});
