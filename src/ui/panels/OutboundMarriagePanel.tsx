import React, { useEffect, useState } from "react";

import type {
  OutboundMarriageOfferDraft,
  OutboundMarriageSurface
} from "../outboundMarriageView";
import {
  buildOutboundMarriageOfferPreview,
  createOutboundMarriageOfferDraft,
  resolveOutboundMarriageSelectedCandidateId
} from "../outboundMarriageView";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_EYEBROW_STYLE,
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";

type OutboundMarriageTab = "player" | "debug";

type OutboundMarriagePanelProps = {
  initialTab?: OutboundMarriageTab;
  onClearScout: () => void;
  onQueueScout: () => void;
  scoutQueued: boolean;
  surface: OutboundMarriageSurface;
};

function tabButtonStyle(isActive: boolean): React.CSSProperties {
  return isActive ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE;
}

function coerceInputNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function draftInput<K extends keyof OutboundMarriageOfferDraft>(
  current: OutboundMarriageOfferDraft,
  key: K,
  value: OutboundMarriageOfferDraft[K]
): OutboundMarriageOfferDraft {
  return { ...current, [key]: value };
}

export function OutboundMarriagePanel({
  initialTab = "player",
  onClearScout,
  onQueueScout,
  scoutQueued,
  surface
}: OutboundMarriagePanelProps) {
  const [activeTab, setActiveTab] = useState<OutboundMarriageTab>(initialTab);
  const [draft, setDraft] = useState<OutboundMarriageOfferDraft>(() => createOutboundMarriageOfferDraft(surface));

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, surface.schemaVersion, surface.subtitle]);

  useEffect(() => {
    setDraft((current) => createOutboundMarriageOfferDraft(surface, current));
  }, [surface.schemaVersion, surface.subjectPersonId, surface.subtitle]);

  const selectedCandidateId = resolveOutboundMarriageSelectedCandidateId(surface, draft.selectedCandidateId);
  const selectedRow = surface.candidateRows.find((row) => row.candidatePersonId === selectedCandidateId) ?? null;
  const preview = buildOutboundMarriageOfferPreview(surface, draft);
  const shownRows = surface.candidateRows.filter((row) => row.rankGroupLabel === "Shown");

  return (
    <div data-outbound-marriage={surface.schemaVersion} style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={PLAY_SCREEN_EYEBROW_STYLE}>Outbound marriage</div>
          <h3 style={{ margin: "6px 0 0", fontSize: 28 }}>Scout & offer sheet</h3>
          <p style={{ margin: "10px 0 0", maxWidth: 760, color: PLAY_SCREEN_THEME.inkMuted, lineHeight: 1.55 }}>
            {surface.helperText}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("player")} style={tabButtonStyle(activeTab === "player")} type="button">
            Player tab
          </button>
          <button onClick={() => setActiveTab("debug")} style={tabButtonStyle(activeTab === "debug")} type="button">
            Debug tab
          </button>
        </div>
      </div>

      {activeTab === "player" ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {surface.summaryCards.map((card) => (
              <div key={card.id} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>{card.label}</div>
                <div style={{ marginTop: 8, fontSize: 21, fontWeight: 700 }}>{card.value}</div>
                <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>{card.detail}</div>
              </div>
            ))}
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Scout action</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  {scoutQueued ? "Scout queued for this turn" : "Scout not queued"}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>
                  Marriage scouting still resolves through the canonical turn decision flow.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={onQueueScout} style={PLAY_SCREEN_ACTION_BUTTON_STYLE} type="button">
                  Queue scout
                </button>
                <button onClick={onClearScout} style={PLAY_SCREEN_SECONDARY_BUTTON_STYLE} type="button">
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Candidate table</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Deterministic shown candidates from the accepted scouting registry</div>
              </div>
              <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>{shownRows.length} shown rows</div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Pick</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Candidate</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Scope</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Distance</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Include reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {shownRows.map((row) => {
                    const isSelected = row.candidatePersonId === selectedCandidateId;
                    return (
                      <tr
                        key={row.candidatePersonId}
                        style={{ background: isSelected ? "rgba(177, 137, 62, 0.12)" : "transparent" }}
                      >
                        <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                          <button
                            onClick={() => setDraft((current) => draftInput(current, "selectedCandidateId", row.candidatePersonId))}
                            style={isSelected ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE}
                            type="button"
                          >
                            {isSelected ? "Selected" : "Select"}
                          </button>
                        </td>
                        <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                          <div style={{ fontWeight: 700 }}>{row.candidatePersonName}</div>
                          <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>
                            {row.candidateHouseLabel} · Rank {row.rankIndex}
                          </div>
                        </td>
                        <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                          <div>{row.scopeLabel}</div>
                          <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.selectorLabel}</div>
                        </td>
                        <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                          {row.distanceLabel}
                        </td>
                        <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                          {row.includeReasonLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Offer composer</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  {selectedRow ? `${surface.subjectPersonName} → ${selectedRow.candidatePersonName}` : "No candidate selected"}
                </div>
              </div>
              <button
                onClick={() => setDraft(createOutboundMarriageOfferDraft(surface))}
                style={PLAY_SCREEN_SECONDARY_BUTTON_STYLE}
                type="button"
              >
                Reset draft
              </button>
            </div>

            {selectedRow ? (
              <div style={{ marginTop: 8, fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted, lineHeight: 1.5 }}>
                Counterparty {selectedRow.candidateHouseLabel}. Player tab keeps liege deltas and risk tags neutral by default while still previewing the accepted resolver on a cloned snapshot.
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 12 }}>
              <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Offer terms</div>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 10 }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Dowry coin</span>
                    <input
                      onChange={(event) => setDraft((current) => draftInput(current, "dowryCoinDelta", coerceInputNumber(event.target.value)))}
                      type="number"
                      value={draft.dowryCoinDelta}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Respect delta</span>
                    <input
                      onChange={(event) =>
                        setDraft((current) => draftInput(current, "relationshipRespect", coerceInputNumber(event.target.value)))
                      }
                      type="number"
                      value={draft.relationshipRespect}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Allegiance delta</span>
                    <input
                      onChange={(event) =>
                        setDraft((current) => draftInput(current, "relationshipAllegiance", coerceInputNumber(event.target.value)))
                      }
                      type="number"
                      value={draft.relationshipAllegiance}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Threat delta</span>
                    <input
                      onChange={(event) =>
                        setDraft((current) => draftInput(current, "relationshipThreat", coerceInputNumber(event.target.value)))
                      }
                      type="number"
                      value={draft.relationshipThreat}
                    />
                  </label>
                </div>
              </div>

              <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12 }}>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Settlement request</div>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 10 }}>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Dowry food</span>
                    <input
                      onChange={(event) =>
                        setDraft((current) => draftInput(current, "dowryFoodStores", coerceInputNumber(event.target.value)))
                      }
                      type="number"
                      value={draft.dowryFoodStores}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Dowry meat</span>
                    <input
                      onChange={(event) =>
                        setDraft((current) => draftInput(current, "dowryMeatStores", coerceInputNumber(event.target.value)))
                      }
                      type="number"
                      value={draft.dowryMeatStores}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Dower coin</span>
                    <input
                      onChange={(event) =>
                        setDraft((current) => draftInput(current, "dowerCoinDelta", coerceInputNumber(event.target.value)))
                      }
                      type="number"
                      value={draft.dowerCoinDelta}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Dower food</span>
                    <input
                      onChange={(event) =>
                        setDraft((current) => draftInput(current, "dowerFoodStores", coerceInputNumber(event.target.value)))
                      }
                      type="number"
                      value={draft.dowerFoodStores}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 4 }}>
                    <span>Dower meat</span>
                    <input
                      onChange={(event) =>
                        setDraft((current) => draftInput(current, "dowerMeatStores", coerceInputNumber(event.target.value)))
                      }
                      type="number"
                      value={draft.dowerMeatStores}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 12, marginTop: 12 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Resolver preview</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>{preview?.outcomeLabel ?? "No preview available"}</div>
              <div style={{ marginTop: 6, color: PLAY_SCREEN_THEME.inkMuted, lineHeight: 1.5 }}>
                {preview?.summary ?? "Select a candidate to preview the canonical outbound resolver."}
              </div>
              {preview?.blockedReasonLabel ? (
                <div style={{ marginTop: 6, fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>
                  Blocked reason: {preview.blockedReasonLabel}
                </div>
              ) : null}
              <div style={{ marginTop: 6, fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>
                {preview?.receiptSummary ?? "No receipt preview available."}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Registry summary</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Deterministic scouting registry counts</div>
              </div>
              <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.scopeSummary}</div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Field</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["subject_person_id", surface.subjectPersonId],
                    ["shown", String(surface.shownCount)],
                    ["held_out", String(surface.heldOutCount)],
                    ["kept_candidates", String(surface.totalCandidates)],
                    ["considered_candidates", String(surface.totalCandidatesConsidered)],
                    ["scope_mode", surface.scoutingRegistry.scope_mode],
                    ["anchor_manor_id", surface.scoutingRegistry.anchor_manor_id ?? "none"]
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{label}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={PLAY_SCREEN_EYEBROW_STYLE}>Eligibility table</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Shown and held-out candidate rows with canonical include and exclude reasons</div>
              </div>
              <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.candidateRows.length} kept rows</div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Rank</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Candidate</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Group</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Scope</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Include</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Exclude</th>
                  </tr>
                </thead>
                <tbody>
                  {surface.candidateRows.map((row) => (
                    <tr key={row.candidatePersonId}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        #{row.rankIndex}
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>Score {row.rankingScore}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        <div style={{ fontWeight: 700 }}>{row.candidatePersonName}</div>
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.candidateHouseLabel}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        {row.rankGroupLabel}
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.readinessLabel}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        {row.scopeLabel}
                        <div style={{ marginTop: 2, color: PLAY_SCREEN_THEME.inkMuted }}>{row.distanceLabel}</div>
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.includeReasonLabel}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.excludeReasonLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={PLAY_SCREEN_EYEBROW_STYLE}>Advanced contract preview</div>
            <div style={{ marginTop: 6, color: PLAY_SCREEN_THEME.inkMuted, lineHeight: 1.5 }}>
              Debug controls expose the extra liege-delta and risk-tag inputs that the canonical offer resolver already accepts.
            </div>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 12 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Risk tags</span>
                <input
                  onChange={(event) => setDraft((current) => draftInput(current, "riskTagsText", event.target.value))}
                  placeholder="prestige, costly"
                  type="text"
                  value={draft.riskTagsText}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Liege delta</span>
                <select
                  onChange={(event) =>
                    setDraft((current) => draftInput(current, "includeLiegeDelta", event.target.value === "yes"))
                  }
                  value={draft.includeLiegeDelta ? "yes" : "no"}
                >
                  <option value="no">None</option>
                  <option value="yes">Include</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Liege respect</span>
                <input
                  disabled={!draft.includeLiegeDelta}
                  onChange={(event) => setDraft((current) => draftInput(current, "liegeRespect", coerceInputNumber(event.target.value)))}
                  type="number"
                  value={draft.liegeRespect}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span>Liege threat</span>
                <input
                  disabled={!draft.includeLiegeDelta}
                  onChange={(event) => setDraft((current) => draftInput(current, "liegeThreat", coerceInputNumber(event.target.value)))}
                  type="number"
                  value={draft.liegeThreat}
                />
              </label>
            </div>

            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Field</th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview?.debugRows ?? []).map((row) => (
                    <tr key={row.key}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.label}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
