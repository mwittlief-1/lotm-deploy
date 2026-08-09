import { describe, expect, it } from "vitest";

import {
  COURTOS_UAT1_PLANNING_HORIZON,
  discardCourtOsUat1AssignmentDraft,
  readCourtOsUat1AssignmentDraft,
  saveCourtOsUat1AssignmentDraft,
} from "../../src/ui/courtosUat1AssignmentDraft";

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const records = new Map<string, string>();
  return {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
    removeItem: (key) => records.delete(key),
  };
}

describe("CourtOS UAT-1 assignment drafts", () => {
  it("keeps House/responsibility-scoped drafts separate and versioned", () => {
    const storage = memoryStorage();
    const base = {
      house_id: "house-pearwick",
      responsibility_id: "household_stores_provisioning_procurement",
      acting_actor_person_id: "person-head",
      source_generation_id: "foundation-a-generation",
      effective_date: "1120-01-01" as const,
      planning_horizon: COURTOS_UAT1_PLANNING_HORIZON,
      current_holder_person_id: "person-ralph",
      proposed_holder_person_id: "person-isabel",
      proposed_holder_display_name: "Isabel of Ridgestead",
    };
    const first = saveCourtOsUat1AssignmentDraft(
      storage,
      base,
      new Date("1120-01-01T00:00:00.000Z"),
    );
    const second = saveCourtOsUat1AssignmentDraft(
      storage,
      { ...base, proposed_holder_person_id: "person-head", proposed_holder_display_name: "Edmund" },
      new Date("1120-01-02T00:00:00.000Z"),
    );

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(
      readCourtOsUat1AssignmentDraft(storage, {
        house_id: base.house_id,
        responsibility_id: base.responsibility_id,
      }),
    ).toMatchObject({
      version: 2,
      proposed_holder_person_id: "person-head",
      acting_actor_person_id: "person-head",
    });
    expect(
      readCourtOsUat1AssignmentDraft(storage, {
        house_id: "house-other",
        responsibility_id: base.responsibility_id,
      }),
    ).toBeNull();
  });

  it("fails closed when a saved proposal belongs to a stale source generation", () => {
    const storage = memoryStorage();
    saveCourtOsUat1AssignmentDraft(
      storage,
      {
        house_id: "house-pearwick",
        responsibility_id: "adult_kin_support",
        acting_actor_person_id: "person-head",
        source_generation_id: "foundation-a-generation-1",
        effective_date: "1120-01-01",
        planning_horizon: COURTOS_UAT1_PLANNING_HORIZON,
        current_holder_person_id: "person-isabel",
        proposed_holder_person_id: "person-head",
        proposed_holder_display_name: "Edmund",
      },
      new Date("1120-01-01T00:00:00.000Z"),
    );

    expect(
      readCourtOsUat1AssignmentDraft(storage, {
        house_id: "house-pearwick",
        responsibility_id: "adult_kin_support",
        source_generation_id: "foundation-a-generation-2",
        effective_date: "1120-01-01",
      }),
    ).toBeNull();
  });

  it("keeps manor-scoped fiscal proposals independent inside one responsibility", () => {
    const storage = memoryStorage();
    const common = {
      house_id: "house-pearwick",
      acting_actor_person_id: "person-head",
      source_generation_id: "foundation-a-generation",
      effective_date: "1120-01-01" as const,
      planning_horizon: COURTOS_UAT1_PLANNING_HORIZON,
      current_holder_person_id: "person-steward",
      proposed_holder_person_id: "person-head",
      proposed_holder_display_name: "Edmund",
    };
    saveCourtOsUat1AssignmentDraft(storage, {
      ...common,
      responsibility_id: "manor_fiscal_administration:manor_hx_38958",
    });
    saveCourtOsUat1AssignmentDraft(storage, {
      ...common,
      responsibility_id: "manor_fiscal_administration:manor_hx_44835",
      proposed_holder_person_id: "person-osmund",
      proposed_holder_display_name: "Osmund Cooper",
    });

    expect(readCourtOsUat1AssignmentDraft(storage, {
      house_id: common.house_id,
      responsibility_id: "manor_fiscal_administration:manor_hx_38958",
    })?.proposed_holder_person_id).toBe("person-head");
    expect(readCourtOsUat1AssignmentDraft(storage, {
      house_id: common.house_id,
      responsibility_id: "manor_fiscal_administration:manor_hx_44835",
    })?.proposed_holder_person_id).toBe("person-osmund");
  });

  it("discards only the selected House and responsibility proposal", () => {
    const storage = memoryStorage();
    const input = {
      house_id: "house-pearwick",
      responsibility_id: "education_formation",
      acting_actor_person_id: "person-head",
      source_generation_id: "foundation-a-generation",
      effective_date: "1120-01-01" as const,
      planning_horizon: COURTOS_UAT1_PLANNING_HORIZON,
      current_holder_person_id: "person-edmund",
      proposed_holder_person_id: "person-isabel",
      proposed_holder_display_name: "Isabel of Ridgestead",
    };
    saveCourtOsUat1AssignmentDraft(storage, input);
    discardCourtOsUat1AssignmentDraft(storage, input);
    expect(readCourtOsUat1AssignmentDraft(storage, input)).toBeNull();
  });
});
