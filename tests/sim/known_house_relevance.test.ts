import { describe, expect, it } from "vitest";

import { buildMarriageWindow } from "../../src/sim/domains/people/marriage";
import {
  KNOWN_HOUSE_RELEVANCE_SCHEMA_VERSION,
  buildKnownHouseRelevanceSnapshot,
} from "../../src/sim/domains/people/knownHouseRelevance";

function mkTraits() {
  return { stewardship: 3, martial: 3, diplomacy: 3, discipline: 3, fertility: 3 };
}

function mkPerson(
  id: string,
  name: string,
  sex: "M" | "F",
  age: number,
  extras?: Record<string, unknown>
) {
  return {
    id,
    name,
    sex,
    age,
    alive: true,
    traits: mkTraits(),
    married: false,
    ...extras,
  };
}

function mkState() {
  const head = mkPerson("p_head", "Lord Tester", "M", 40, { married: true });
  const spouse = mkPerson("p_spouse", "Lady Tester", "F", 38, { married: true });
  const subject = mkPerson("p_child_subject", "Heir Tester", "M", 18);
  const marriedSibling = mkPerson("p_child_married", "Married Sibling", "F", 22, { married: true });

  const inlawHead = mkPerson("p_inlaw_head", "In-Law Head", "M", 35, {
    married: true,
    house_id: "h_marriage",
    residence_house_id: "h_marriage",
  });
  const promotedCandidate = mkPerson("p_candidate", "Promoted Candidate", "F", 20, {
    house_id: "h_marriage",
    residence_house_id: "h_marriage",
  });

  const bloodParent = mkPerson("p_blood_parent", "Blood Parent", "F", 60, {
    house_id: "h_blood",
    residence_house_id: "h_blood",
  });
  const bloodSibling = mkPerson("p_blood_sibling", "Blood Sibling", "M", 30, {
    house_id: "h_blood",
    residence_house_id: "h_blood",
  });

  const irrelevantCandidate = mkPerson("p_irrelevant", "Irrelevant Candidate", "M", 20, {
    house_id: "h_irrelevant",
    residence_house_id: "h_irrelevant",
  });

  const liege = mkPerson("p_liege", "Liege", "M", 55, { married: true });
  const clergy = mkPerson("p_clergy", "Clergy", "M", 46);

  const people: Record<string, any> = {
    [head.id]: { ...head, house_id: "h_player", residence_house_id: "h_player" },
    [spouse.id]: { ...spouse, house_id: "h_player", residence_house_id: "h_player" },
    [subject.id]: { ...subject, house_id: "h_player", residence_house_id: "h_player" },
    [marriedSibling.id]: { ...marriedSibling, house_id: "h_player", residence_house_id: "h_player" },
    [inlawHead.id]: inlawHead,
    [promotedCandidate.id]: promotedCandidate,
    [bloodParent.id]: bloodParent,
    [bloodSibling.id]: bloodSibling,
    [irrelevantCandidate.id]: irrelevantCandidate,
    [liege.id]: liege,
    [clergy.id]: clergy,
  };

  const houses: Record<string, any> = {
    h_player: {
      id: "h_player",
      name: "Tester",
      tier: "Knight",
      head_id: head.id,
      spouse_id: spouse.id,
      child_ids: [subject.id, marriedSibling.id],
      member_person_ids: [head.id, spouse.id, subject.id, marriedSibling.id],
    },
    h_marriage: {
      id: "h_marriage",
      name: "Marriage",
      tier: "Baron",
      head_id: inlawHead.id,
      spouse_id: null,
      child_ids: [promotedCandidate.id],
      member_person_ids: [inlawHead.id, promotedCandidate.id],
    },
    h_blood: {
      id: "h_blood",
      name: "Blood",
      tier: "Knight",
      head_id: bloodParent.id,
      spouse_id: null,
      child_ids: [bloodSibling.id],
      member_person_ids: [bloodParent.id, bloodSibling.id],
    },
    h_irrelevant: {
      id: "h_irrelevant",
      name: "Irrelevant",
      tier: "Knight",
      head_id: irrelevantCandidate.id,
      spouse_id: null,
      child_ids: [],
      member_person_ids: [irrelevantCandidate.id],
    },
  };

  return {
    version: "0.2.9",
    app_version: "0.2.9",
    run_seed: "V03_R0_005_T04_KNOWN_HOUSE_RELEVANCE",
    turn_index: 0,
    manor: {
      population: 45,
      farmers: 28,
      builders: 0,
      bushels_stored: 400,
      coin: 12,
      unrest: 10,
      improvements: [],
      construction: null,
      obligations: { tax_due_coin: 0, tithe_due_bushels: 0, arrears: { coin: 0, bushels: 0 }, war_levy_due: null },
    },
    house: {
      head,
      spouse,
      spouse_status: "spouse",
      children: [subject, marriedSibling],
      energy: { max: 3, available: 3 },
      heir_id: subject.id,
    },
    locals: {
      liege,
      clergy,
      nobles: [],
    },
    relationships: [],
    people,
    houses,
    player_house_id: "h_player",
    kinship_edges: [
      { kind: "spouse_of", a_id: head.id, b_id: spouse.id },
      { kind: "parent_of", parent_id: head.id, child_id: subject.id },
      { kind: "parent_of", parent_id: spouse.id, child_id: subject.id },
      { kind: "parent_of", parent_id: head.id, child_id: marriedSibling.id },
      { kind: "parent_of", parent_id: spouse.id, child_id: marriedSibling.id },
      { kind: "spouse_of", a_id: marriedSibling.id, b_id: inlawHead.id },
      { kind: "parent_of", parent_id: bloodParent.id, child_id: head.id },
      { kind: "parent_of", parent_id: bloodParent.id, child_id: bloodSibling.id },
    ],
    flags: {
      _tuning: {
        tier1_max_houses: 6,
      },
    },
    log: [],
  } as any;
}

describe("known house relevance", () => {
  it("promotes deduplicated blood and marriage ties into bounded tier1 relevance", () => {
    const state = mkState();
    const snapshot = buildKnownHouseRelevanceSnapshot(state);

    expect(snapshot.schema_version).toBe(KNOWN_HOUSE_RELEVANCE_SCHEMA_VERSION);
    expect(snapshot.tier0_house_ids).toEqual(["h_player"]);
    expect(snapshot.tier1_house_ids).toEqual(["h_marriage", "h_blood"]);
    expect(snapshot.truncated).toBe(false);

    const marriageEntry = snapshot.entries.find((entry) => entry.house_id === "h_marriage");
    const bloodEntry = snapshot.entries.find((entry) => entry.house_id === "h_blood");

    expect(marriageEntry).toMatchObject({
      tier: "tier1",
      reasons: ["marriage_tie"],
      via_person_ids: ["p_inlaw_head"],
    });
    expect(bloodEntry).toMatchObject({
      tier: "tier1",
      reasons: ["blood_tie"],
      via_person_ids: ["p_blood_parent", "p_blood_sibling"],
    });
  });

  it("keeps relevance output bounded with deterministic promotion priority", () => {
    const state = mkState();
    const snapshot = buildKnownHouseRelevanceSnapshot(state, { max_tier1_houses: 1 });

    expect(snapshot.tier1_house_ids).toEqual(["h_marriage"]);
    expect(snapshot.entries.map((entry) => entry.house_id)).toEqual(["h_player", "h_marriage"]);
    expect(snapshot.truncated).toBe(true);
  });

  it("lets marriage windows include promoted houses even when the incoming tier set omitted them", () => {
    const state = mkState();
    const tierSets = {
      tier0: { people: new Set<string>(), houses: new Set<string>(["h_player"]), institutions: new Set<string>() },
      tier1: { people: new Set<string>(), houses: new Set<string>(["h_irrelevant"]), institutions: new Set<string>() },
      tier2: { people: new Set<string>(), houses: new Set<string>(), institutions: new Set<string>() },
    };

    const marriageWindow = buildMarriageWindow(state, tierSets as any);

    expect(marriageWindow).not.toBeNull();
    expect(marriageWindow?.eligible_child_ids).toEqual(["p_child_subject"]);
    expect(marriageWindow?.offers.map((offer) => offer.house_person_id)).toEqual(["p_candidate"]);
  });
});
