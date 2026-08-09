import { useEffect, useId, useMemo, useState } from "react";

import {
  CourtOsStewardshipPlanError,
  archiveStaleCourtOsStewardshipProposal,
  buildCourtOsStewardshipRegister,
  discardCourtOsStewardshipProposal,
  inspectCourtOsStewardshipPlan,
  saveCourtOsStewardshipProposal,
  type CourtOsStewardshipCandidateV1,
  type CourtOsStewardshipPlanContextV1,
  type CourtOsStewardshipPlanInspectionV1,
  type CourtOsStewardshipPlanStorage,
  type CourtOsStewardshipResponsibilityV1,
  type CourtOsStewardshipScopeV1,
} from "../courtosStewardshipPlan";

import "./courtOsStewardshipPlanner.css";

export type CourtOsStewardshipPlannerProps = Readonly<{
  context: CourtOsStewardshipPlanContextV1;
  responsibilities: readonly CourtOsStewardshipResponsibilityV1[];
  storage: CourtOsStewardshipPlanStorage | null;
  candidatesForScope: (
    scope: CourtOsStewardshipScopeV1,
  ) => readonly CourtOsStewardshipCandidateV1[];
  initialResponsibilityId?: string;
  initialScopeId?: string | null;
  onPlanChanged?: (input: {
    responsibility_id: string;
    scope_id: string | null;
    version: number;
    disposition: "proposed" | "discarded";
  }) => void;
}>;

function scopeKey(scope: CourtOsStewardshipScopeV1): string {
  return `${scope.responsibility_id}::${scope.scope_id ?? "__responsibility_wide__"}`;
}

function firstResponsibility(
  responsibilities: readonly CourtOsStewardshipResponsibilityV1[],
  requestedId: string | undefined,
): CourtOsStewardshipResponsibilityV1 | null {
  return (
    responsibilities.find((item) => item.responsibility_id === requestedId) ??
    responsibilities[0] ??
    null
  );
}

function firstScope(
  responsibility: CourtOsStewardshipResponsibilityV1 | null,
  requestedScopeId: string | null | undefined,
): CourtOsStewardshipScopeV1 | null {
  if (!responsibility) return null;
  if (requestedScopeId !== undefined) {
    const exact = responsibility.scopes.find(
      (scope) => scope.scope_id === requestedScopeId,
    );
    if (exact) return exact;
  }
  return responsibility.scopes[0] ?? null;
}

function statusCopy(inspection: CourtOsStewardshipPlanInspectionV1): string {
  switch (inspection.status) {
    case "current":
      return "A stewardship proposal is saved for this charge.";
    case "discarded":
      return "The prior stewardship proposal was set aside.";
    case "stale_source":
      return "The House record changed. Review the current stewardship before making a new proposal.";
    case "stale_actor":
      return "The acting Head or authority basis changed. This proposal cannot be reused.";
    case "invalid":
      return "The saved proposal could not be verified and will not be used.";
    case "missing":
      return "No three-year proposal is saved for this charge.";
  }
}

/**
 * Shared House Command / responsibility-workspace stewardship planner.
 *
 * The component is intentionally presentation-light. Rooms may wrap it in
 * different environmental art while preserving one assignment interaction.
 */
export function CourtOsStewardshipPlanner({
  context,
  responsibilities,
  storage,
  candidatesForScope,
  initialResponsibilityId,
  initialScopeId,
  onPlanChanged,
}: CourtOsStewardshipPlannerProps) {
  const responsibilityId = useId();
  const scopeId = useId();
  const candidateId = useId();
  const statusId = useId();
  const planningYearLabel = `${context.planning_horizon.starts_at.slice(0, 4)}–${context.planning_horizon.ends_at.slice(0, 4)}`;
  const register = useMemo(
    () => buildCourtOsStewardshipRegister(responsibilities),
    [responsibilities],
  );
  const initialResponsibility = firstResponsibility(
    register.responsibilities,
    initialResponsibilityId,
  );
  const [selectedResponsibilityId, setSelectedResponsibilityId] = useState(
    initialResponsibility?.responsibility_id ?? "",
  );
  const selectedResponsibility =
    register.responsibilities.find(
      (item) => item.responsibility_id === selectedResponsibilityId,
    ) ?? initialResponsibility;
  const initialSelectedScope = firstScope(selectedResponsibility, initialScopeId);
  const [selectedScopeKey, setSelectedScopeKey] = useState(
    initialSelectedScope ? scopeKey(initialSelectedScope) : "",
  );
  const selectedScope =
    selectedResponsibility?.scopes.find(
      (scope) => scopeKey(scope) === selectedScopeKey,
    ) ?? selectedResponsibility?.scopes[0] ?? null;
  const candidates = useMemo(
    () => (selectedScope ? candidatesForScope(selectedScope) : []),
    [candidatesForScope, selectedScope],
  );
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [inspection, setInspection] = useState<CourtOsStewardshipPlanInspectionV1>({
    status: "missing",
    record: null,
  });
  const [operationMessage, setOperationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedResponsibility) {
      setSelectedScopeKey("");
      return;
    }
    const currentScopeStillExists = selectedResponsibility.scopes.some(
      (scope) => scopeKey(scope) === selectedScopeKey,
    );
    if (!currentScopeStillExists) {
      setSelectedScopeKey(
        selectedResponsibility.scopes[0]
          ? scopeKey(selectedResponsibility.scopes[0])
          : "",
      );
    }
  }, [selectedResponsibility, selectedScopeKey]);

  useEffect(() => {
    if (!storage || !selectedScope) {
      setInspection({ status: "missing", record: null });
      setSelectedPersonId(candidates[0]?.person_id ?? "");
      return;
    }
    const nextInspection = inspectCourtOsStewardshipPlan(
      storage,
      context,
      selectedScope,
    );
    setInspection(nextInspection);
    const proposedPersonId =
      nextInspection.status === "current"
        ? nextInspection.record.proposed_holder_person_id
        : null;
    setSelectedPersonId(
      candidates.find((candidate) => candidate.person_id === proposedPersonId)?.person_id ??
        candidates.find(
          (candidate) =>
            candidate.person_id === selectedScope.current_holder?.person_id,
        )?.person_id ??
        candidates[0]?.person_id ??
        "",
    );
    setOperationMessage(null);
  }, [candidates, context, selectedScope, storage]);

  const selectedCandidate =
    candidates.find((candidate) => candidate.person_id === selectedPersonId) ?? null;
  const hasStructuralError =
    register.duplicate_responsibility_ids.length > 0 || register.invalid_scope_count > 0;
  const blockedByStaleness =
    inspection.status === "stale_source" || inspection.status === "stale_actor";
  const canSave =
    Boolean(storage) &&
    Boolean(selectedScope) &&
    Boolean(selectedCandidate) &&
    !hasStructuralError &&
    !blockedByStaleness;

  function saveProposal() {
    if (!storage || !selectedScope || !selectedCandidate || !canSave) return;
    try {
      const saved = saveCourtOsStewardshipProposal({
        storage,
        context,
        scope: selectedScope,
        candidate: selectedCandidate,
        eligible_candidates: candidates,
        expected_version: inspection.record?.version ?? null,
      });
      setInspection({ status: "current", record: saved });
      setOperationMessage(
        "Stewardship proposal saved. The current assignment has not changed.",
      );
      onPlanChanged?.({
        responsibility_id: saved.responsibility_id,
        scope_id: saved.scope_id,
        version: saved.version,
        disposition: saved.disposition,
      });
    } catch (error) {
      setOperationMessage(
        error instanceof CourtOsStewardshipPlanError
          ? error.message
          : "The proposal could not be saved. No assignment changed.",
      );
    }
  }

  function discardProposal() {
    if (!storage || !selectedScope || inspection.status !== "current") return;
    try {
      const discarded = discardCourtOsStewardshipProposal({
        storage,
        context,
        scope: selectedScope,
        expected_version: inspection.record.version,
      });
      setInspection({ status: "discarded", record: discarded });
      setOperationMessage(
        "The proposal was set aside. The current assignment remains unchanged.",
      );
      onPlanChanged?.({
        responsibility_id: discarded.responsibility_id,
        scope_id: discarded.scope_id,
        version: discarded.version,
        disposition: discarded.disposition,
      });
    } catch (error) {
      setOperationMessage(
        error instanceof CourtOsStewardshipPlanError
          ? error.message
          : "The proposal could not be discarded. No assignment changed.",
      );
    }
  }

  function setAsideStaleProposal() {
    if (
      !storage ||
      !selectedScope ||
      (inspection.status !== "stale_source" && inspection.status !== "stale_actor") ||
      !inspection.record
    ) return;
    try {
      const discarded = archiveStaleCourtOsStewardshipProposal({
        storage,
        context,
        scope: selectedScope,
        expected_stale_version: inspection.record.version,
      });
      setInspection({ status: "discarded", record: discarded });
      setOperationMessage(
        "The earlier proposal was set aside. You may now plan from the current House record.",
      );
      onPlanChanged?.({
        responsibility_id: discarded.responsibility_id,
        scope_id: discarded.scope_id,
        version: discarded.version,
        disposition: discarded.disposition,
      });
    } catch (error) {
      setOperationMessage(
        error instanceof CourtOsStewardshipPlanError
          ? error.message
          : "The stale proposal could not be set aside.",
      );
    }
  }

  if (register.responsibility_count === 0) {
    return (
      <section className="courtos-stewardship-planner" aria-labelledby={responsibilityId}>
        <h2 id={responsibilityId}>Three-year stewardship</h2>
        <p>No responsibility charges are available for planning.</p>
      </section>
    );
  }

  return (
    <section className="courtos-stewardship-planner" aria-labelledby={`${responsibilityId}-heading`}>
      <header>
        <small>{planningYearLabel} House plan</small>
        <h2 id={`${responsibilityId}-heading`}>Three-year stewardship</h2>
        <p>
          Save a proposal for the next execution cycle. The recorded steward remains
          responsible until the plan is submitted and executed.
        </p>
      </header>

      {hasStructuralError ? (
        <p className="courtos-stewardship-planner__alert" role="alert">
          The House record for this charge does not reconcile. Assignment
          controls are unavailable.
        </p>
      ) : null}

      <div className="courtos-stewardship-planner__selectors">
        <label htmlFor={responsibilityId}>
          Responsibility
          <select
            id={responsibilityId}
            onChange={(event) => setSelectedResponsibilityId(event.target.value)}
            value={selectedResponsibility?.responsibility_id ?? ""}
          >
            {register.responsibilities.map((responsibility) => (
              <option
                key={responsibility.responsibility_id}
                value={responsibility.responsibility_id}
              >
                {responsibility.room_label} — {responsibility.responsibility_label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor={scopeId}>
          Recorded charge
          <select
            disabled={!selectedResponsibility || selectedResponsibility.scopes.length < 2}
            id={scopeId}
            onChange={(event) => setSelectedScopeKey(event.target.value)}
            value={selectedScope ? scopeKey(selectedScope) : ""}
          >
            {selectedResponsibility?.scopes.map((scope) => (
              <option key={scopeKey(scope)} value={scopeKey(scope)}>
                {scope.scope_label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedScope ? (
        <div className="courtos-stewardship-planner__current">
          <span>Current stewardship</span>
          <strong>
            {selectedScope.current_holder?.display_name ?? "No recorded steward"}
          </strong>
          <small>{selectedScope.scope_label}</small>
        </div>
      ) : (
        <p className="courtos-stewardship-planner__alert" role="status">
          This responsibility has no recorded planning charge.
        </p>
      )}

      <fieldset disabled={!selectedScope || hasStructuralError || blockedByStaleness}>
        <legend>Proposed steward for {planningYearLabel}</legend>
        <label htmlFor={candidateId}>
          Permitted assignee
          <select
            id={candidateId}
            onChange={(event) => setSelectedPersonId(event.target.value)}
            value={selectedPersonId}
          >
            {candidates.length === 0 ? (
              <option value="">No permitted assignee is recorded for this charge</option>
            ) : null}
            {candidates.map((candidate) => (
              <option key={candidate.person_id} value={candidate.person_id}>
                {candidate.display_name}
                {candidate.eligibility === "head_self_assignment" ? " — Head of House" : ""}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <p id={statusId} role={blockedByStaleness ? "alert" : "status"}>
        {operationMessage ?? statusCopy(inspection)}
      </p>

      <footer>
        <button disabled={!canSave} onClick={saveProposal} type="button">
          {inspection.status === "current" ? "Save revised proposal" : "Save proposal"}
        </button>
        <button
          disabled={inspection.status !== "current"}
          onClick={discardProposal}
          type="button"
        >
          Discard saved proposal
        </button>
        <button
          disabled={!blockedByStaleness || !inspection.record}
          onClick={setAsideStaleProposal}
          type="button"
        >
          Set stale proposal aside
        </button>
        <small aria-describedby={statusId}>
          Saving preserves a planning draft; it does not change current stewardship.
        </small>
      </footer>
    </section>
  );
}
