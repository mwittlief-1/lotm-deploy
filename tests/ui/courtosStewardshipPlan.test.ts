import { describe, expect, it } from "vitest";

import {
  COURTOS_UAT1_STEWARDSHIP_PLAN_HORIZON,
  CourtOsStewardshipPlanError,
  archiveStaleCourtOsStewardshipProposal,
  buildCourtOsStewardshipRegister,
  courtOsStewardshipCandidates,
  discardCourtOsStewardshipProposal,
  inspectCourtOsStewardshipPlan,
  readCourtOsStewardshipPlanVersion,
  saveCourtOsStewardshipProposal,
  type CourtOsStewardshipCandidateV1,
  type CourtOsStewardshipPlanContextV1,
  type CourtOsStewardshipPlanStorage,
  type CourtOsStewardshipScopeV1,
} from "../../src/ui/courtosStewardshipPlan";

function memoryStorage(): CourtOsStewardshipPlanStorage & {
  values: Map<string, string>;
} {
  const values = new Map<string, string>();
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const context: CourtOsStewardshipPlanContextV1 = {
  house_id: "t0h_pearwick",
  acting_actor_person_id: "t0p_edmund",
  actor_authority_basis_id: "authority:head:pearwick:1120",
  source_generation_id: "foundation-a:1120:g1",
  effective_date: "1120-01-01",
  planning_horizon: COURTOS_UAT1_STEWARDSHIP_PLAN_HORIZON,
};

const scope: CourtOsStewardshipScopeV1 = {
  responsibility_id: "stores",
  responsibility_label: "Household Stores",
  room_id: "household",
  room_label: "Household Solar",
  scope_id: "manor_hx_44835",
  scope_label: "Roadcote Court",
  source_record_id: "authority:stores:roadcote:g1",
  current_holder: {
    person_id: "t0p_ralph",
    display_name: "Ralph Woolman",
  },
};

const headCandidate: CourtOsStewardshipCandidateV1 = {
  person_id: "t0p_edmund",
  display_name: "Edmund of Pearwick Hall",
  eligibility: "head_self_assignment",
  eligibility_source_id: "authority:head:pearwick:1120",
};

describe("CourtOS UAT-1 stewardship plan journal", () => {
  it("commits each journal generation with one atomic storage write", () => {
    const storage = memoryStorage();
    let writes = 0;
    const atomicStorage: CourtOsStewardshipPlanStorage = {
      getItem: storage.getItem,
      setItem(key, value) {
        writes += 1;
        storage.setItem(key, value);
      },
    };

    saveCourtOsStewardshipProposal({
      storage: atomicStorage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });

    expect(writes).toBe(1);
    expect([...storage.values.keys()]).toEqual([
      expect.stringContaining(":journal-v1"),
    ]);
  });

  it("leaves the prior journal intact when an atomic replacement is interrupted", () => {
    const storage = memoryStorage();
    const first = saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });
    const interruptedStorage: CourtOsStewardshipPlanStorage = {
      getItem: storage.getItem,
      setItem() {
        throw new Error("simulated interruption");
      },
    };

    expect(() => saveCourtOsStewardshipProposal({
      storage: interruptedStorage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: first.version,
    })).toThrow("simulated interruption");
    expect(inspectCourtOsStewardshipPlan(storage, context, scope)).toEqual({
      status: "current",
      record: first,
    });
    expect(readCourtOsStewardshipPlanVersion(storage, {
      house_id: context.house_id,
      responsibility_id: scope.responsibility_id,
      scope_id: scope.scope_id,
      effective_date: context.effective_date,
      planning_horizon: context.planning_horizon,
      version: 2,
    })).toBeNull();
  });

  it("fails closed on a corrupted journal instead of overwriting it", () => {
    const storage = memoryStorage();
    saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });
    const journalKey = [...storage.values.keys()].find((key) => key.endsWith(":journal-v1"));
    expect(journalKey).toBeTruthy();
    storage.values.set(journalKey!, JSON.stringify({ schema_version: "corrupted" }));

    expect(inspectCourtOsStewardshipPlan(storage, context, scope)).toEqual({
      status: "invalid",
      record: null,
    });
    expect(() => saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    })).toThrowError(
      expect.objectContaining<Partial<CourtOsStewardshipPlanError>>({
        code: "journal_invalid",
      }),
    );
    expect(storage.values.get(journalKey!)).toBe(JSON.stringify({ schema_version: "corrupted" }));
  });

  it("reads legacy two-key records and migrates them on the next save", () => {
    const source = memoryStorage();
    const first = saveCourtOsStewardshipProposal({
      storage: source,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
      now: new Date("2026-08-07T12:00:00.000Z"),
    });
    const legacy = memoryStorage();
    const token = encodeURIComponent(
      `${context.effective_date}__${context.planning_horizon.starts_at}__${context.planning_horizon.ends_at}`,
    );
    const prefix = [
      "merecross.courtos.uat1.stewardship-plan",
      encodeURIComponent(context.house_id),
      encodeURIComponent(scope.responsibility_id),
      encodeURIComponent(scope.scope_id!),
      token,
    ].join(":");
    legacy.values.set(`${prefix}:current`, JSON.stringify(first));
    legacy.values.set(`${prefix}:v1`, JSON.stringify(first));

    expect(inspectCourtOsStewardshipPlan(legacy, context, scope)).toEqual({
      status: "current",
      record: first,
    });
    const second = saveCourtOsStewardshipProposal({
      storage: legacy,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: first.version,
    });
    expect(second.version).toBe(2);
    expect([...legacy.values.keys()].some((key) => key.endsWith(":journal-v1"))).toBe(true);
    expect(readCourtOsStewardshipPlanVersion(legacy, {
      house_id: context.house_id,
      responsibility_id: scope.responsibility_id,
      scope_id: scope.scope_id,
      effective_date: context.effective_date,
      planning_horizon: context.planning_horizon,
      version: 1,
    })).toEqual(first);
  });

  it("saves a scope-bound proposal without changing the recorded current holder", () => {
    const storage = memoryStorage();
    const saved = saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
      now: new Date("2026-08-07T12:00:00.000Z"),
    });

    expect(saved.version).toBe(1);
    expect(saved.supersedes_version).toBeNull();
    expect(saved.proposed_holder_person_id).toBe("t0p_edmund");
    expect(saved.current_holder_person_id).toBe("t0p_ralph");
    expect(saved.planning_horizon).toEqual({
      starts_at: "1120-01-01",
      ends_at: "1122-12-31",
    });
    expect(inspectCourtOsStewardshipPlan(storage, context, scope)).toEqual({
      status: "current",
      record: saved,
    });
  });

  it("keeps immutable versions when a proposal is superseded", () => {
    const storage = memoryStorage();
    const first = saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
      now: new Date("2026-08-07T12:00:00.000Z"),
    });
    const holderCandidate: CourtOsStewardshipCandidateV1 = {
      person_id: "t0p_ralph",
      display_name: "Ralph Woolman",
      eligibility: "current_holder",
      eligibility_source_id: scope.source_record_id,
    };
    const second = saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: holderCandidate,
      eligible_candidates: [headCandidate, holderCandidate],
      expected_version: first.version,
      now: new Date("2026-08-07T12:05:00.000Z"),
    });

    expect(second.version).toBe(2);
    expect(second.supersedes_version).toBe(1);
    expect(readCourtOsStewardshipPlanVersion(storage, {
      house_id: context.house_id,
      responsibility_id: scope.responsibility_id,
      scope_id: scope.scope_id,
      effective_date: context.effective_date,
      planning_horizon: context.planning_horizon,
      version: 1,
    })).toEqual(first);
    expect(readCourtOsStewardshipPlanVersion(storage, {
      house_id: context.house_id,
      responsibility_id: scope.responsibility_id,
      scope_id: scope.scope_id,
      effective_date: context.effective_date,
      planning_horizon: context.planning_horizon,
      version: 2,
    })).toEqual(second);
  });

  it("records discard as a new version while preserving proposal history", () => {
    const storage = memoryStorage();
    const first = saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });
    const discarded = discardCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      expected_version: first.version,
      now: new Date("2026-08-07T12:10:00.000Z"),
    });

    expect(discarded).toMatchObject({
      disposition: "discarded",
      version: 2,
      supersedes_version: 1,
      proposed_holder_person_id: null,
    });
    expect(inspectCourtOsStewardshipPlan(storage, context, scope)).toEqual({
      status: "discarded",
      record: discarded,
    });
    expect(readCourtOsStewardshipPlanVersion(storage, {
      house_id: context.house_id,
      responsibility_id: scope.responsibility_id,
      scope_id: scope.scope_id,
      effective_date: context.effective_date,
      planning_horizon: context.planning_horizon,
      version: 1,
    })).toEqual(first);
  });

  it("fails closed on a concurrent writer", () => {
    const storage = memoryStorage();
    const first = saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });
    saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: first.version,
    });

    expect(() => saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: first.version,
    })).toThrowError(
      expect.objectContaining<Partial<CourtOsStewardshipPlanError>>({
        code: "concurrent_version",
      }),
    );
  });

  it("surfaces stale source and actor records instead of silently loading them", () => {
    const storage = memoryStorage();
    saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });

    expect(inspectCourtOsStewardshipPlan(storage, {
      ...context,
      source_generation_id: "foundation-a:1120:g2",
    }, scope).status).toBe("stale_source");
    expect(inspectCourtOsStewardshipPlan(storage, {
      ...context,
      acting_actor_person_id: "t0p_regent",
    }, scope).status).toBe("stale_actor");
    expect(inspectCourtOsStewardshipPlan(storage, context, {
      ...scope,
      source_record_id: "authority:stores:roadcote:g2",
    }).status).toBe("stale_source");
  });

  it("requires an explicit versioned tombstone before replanning from changed source", () => {
    const storage = memoryStorage();
    const first = saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });
    const revisedContext = {
      ...context,
      source_generation_id: "foundation-a:1120:g2",
    };
    const archived = archiveStaleCourtOsStewardshipProposal({
      storage,
      context: revisedContext,
      scope,
      expected_stale_version: first.version,
      now: new Date("2026-08-07T12:15:00.000Z"),
    });

    expect(archived).toMatchObject({
      version: 2,
      supersedes_version: 1,
      disposition: "discarded",
      source_generation_id: "foundation-a:1120:g2",
    });
    expect(inspectCourtOsStewardshipPlan(storage, revisedContext, scope).status).toBe("discarded");
    expect(saveCourtOsStewardshipProposal({
      storage,
      context: revisedContext,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: archived.version,
    })).toMatchObject({ version: 3, supersedes_version: 2 });
  });

  it("isolates versions for every exact scope in a multi-scope responsibility", () => {
    const storage = memoryStorage();
    const secondScope: CourtOsStewardshipScopeV1 = {
      ...scope,
      scope_id: "manor_hx_44836",
      scope_label: "Oakfield Manor",
      source_record_id: "authority:stores:oakfield:g1",
    };
    saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });
    const second = saveCourtOsStewardshipProposal({
      storage,
      context,
      scope: secondScope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });

    expect(second.version).toBe(1);
    expect(inspectCourtOsStewardshipPlan(storage, context, scope).status).toBe("current");
    expect(inspectCourtOsStewardshipPlan(storage, context, secondScope).status).toBe("current");
  });

  it("isolates a later three-year cycle from the UAT-1 planning cycle", () => {
    const storage = memoryStorage();
    saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    });
    const laterContext: CourtOsStewardshipPlanContextV1 = {
      ...context,
      effective_date: "1123-01-01",
      planning_horizon: { starts_at: "1123-01-01", ends_at: "1125-12-31" },
      source_generation_id: "foundation-a:1123:g1",
    };

    expect(inspectCourtOsStewardshipPlan(storage, laterContext, scope)).toEqual({
      status: "missing",
      record: null,
    });
    expect(saveCourtOsStewardshipProposal({
      storage,
      context: laterContext,
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    }).version).toBe(1);
  });

  it("rejects a horizon that is not exactly three years", () => {
    const storage = memoryStorage();
    expect(() => saveCourtOsStewardshipProposal({
      storage,
      context: {
        ...context,
        planning_horizon: { starts_at: "1120-01-01", ends_at: "1123-12-31" },
      },
      scope,
      candidate: headCandidate,
      eligible_candidates: [headCandidate],
      expected_version: null,
    })).toThrowError(
      expect.objectContaining<Partial<CourtOsStewardshipPlanError>>({
        code: "invalid_context",
      }),
    );
  });

  it("rejects people not supplied by the exact eligibility projection", () => {
    const storage = memoryStorage();
    expect(() => saveCourtOsStewardshipProposal({
      storage,
      context,
      scope,
      candidate: {
        person_id: "t0p_councillor",
        display_name: "Council Attendee",
        eligibility: "admitted_candidate",
        eligibility_source_id: "presentation:council",
      },
      eligible_candidates: [headCandidate],
      expected_version: null,
    })).toThrowError(
      expect.objectContaining<Partial<CourtOsStewardshipPlanError>>({
        code: "candidate_not_eligible",
      }),
    );
  });
});

describe("CourtOS stewardship candidate and register boundaries", () => {
  it("adds HoH self-assignment only with an explicit authority source", () => {
    const head = { person_id: "t0p_edmund", display_name: "Edmund" };
    const withoutAuthority = courtOsStewardshipCandidates({
      admitted_candidates: [],
      current_holder: null,
      current_holder_source_id: null,
      head,
      head_self_assignment_authority_id: null,
    });
    const withAuthority = courtOsStewardshipCandidates({
      admitted_candidates: [],
      current_holder: null,
      current_holder_source_id: null,
      head,
      head_self_assignment_authority_id: "authority:head:pearwick:1120",
    });

    expect(withoutAuthority).toEqual([]);
    expect(withAuthority).toEqual([{
      person_id: "t0p_edmund",
      display_name: "Edmund",
      eligibility: "head_self_assignment",
      eligibility_source_id: "authority:head:pearwick:1120",
    }]);
  });

  it("does not turn an empty responsibility into a synthetic scope", () => {
    const responsibilities = Array.from({ length: 24 }, (_, index) => ({
      responsibility_id: `responsibility-${index + 1}`,
      responsibility_label: `Responsibility ${index + 1}`,
      room_id: `room-${Math.floor(index / 3) + 1}`,
      room_label: `Room ${Math.floor(index / 3) + 1}`,
      scopes: index === 0 ? [{
        ...scope,
        responsibility_id: "responsibility-1",
        responsibility_label: "Responsibility 1",
        room_id: "room-1",
        room_label: "Room 1",
      }] : index === 1 ? [scope] : [],
    }));
    const register = buildCourtOsStewardshipRegister(responsibilities);

    expect(register.responsibility_count).toBe(24);
    expect(register.scope_count).toBe(1);
    expect(register.invalid_scope_count).toBe(1);
    expect(register.responsibilities[2]?.scopes).toEqual([]);
  });
});
