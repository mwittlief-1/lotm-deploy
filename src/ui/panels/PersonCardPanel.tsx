import React, { useEffect, useState } from "react";

import type { PersonCardFamilySection, PersonCardSurface } from "../personCardView";
import {
  PLAY_SCREEN_ACTION_BUTTON_STYLE,
  PLAY_SCREEN_EYEBROW_STYLE,
  PLAY_SCREEN_SECONDARY_BUTTON_STYLE,
  PLAY_SCREEN_SUBCARD_STYLE,
  PLAY_SCREEN_THEME
} from "../playScreenTheme";
import { PersonCardTrigger } from "./PersonCardTrigger";

type PersonCardTab = "overview" | "family" | "offices" | "relationships" | "debug";

type PersonCardPanelProps = {
  initialTab?: PersonCardTab;
  onOpenPersonCard: (personId: string) => void;
  surface: PersonCardSurface;
};

function tabButtonStyle(isActive: boolean): React.CSSProperties {
  return isActive ? PLAY_SCREEN_ACTION_BUTTON_STYLE : PLAY_SCREEN_SECONDARY_BUTTON_STYLE;
}

function renderFamilySection(
  onOpenPersonCard: (personId: string) => void,
  section: PersonCardFamilySection
) {
  if (section.entries.length === 0) {
    return (
      <div key={section.id} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
        <div style={PLAY_SCREEN_EYEBROW_STYLE}>{section.title}</div>
        <div style={{ marginTop: 8, color: PLAY_SCREEN_THEME.inkMuted, fontSize: 13 }}>{section.emptyLabel}</div>
      </div>
    );
  }

  return (
    <div key={section.id} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
      <div style={PLAY_SCREEN_EYEBROW_STYLE}>{section.title}</div>
      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {section.entries.map((entry) => (
          <div key={entry.personId} style={{ display: "grid", gap: 4 }}>
            <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={entry.personId}>
              {entry.title}
            </PersonCardTrigger>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted }}>{entry.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonCardPanel({ initialTab = "overview", onOpenPersonCard, surface }: PersonCardPanelProps) {
  const [activeTab, setActiveTab] = useState<PersonCardTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, surface.personId]);

  return (
    <div data-person-card={surface.personId} style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={PLAY_SCREEN_EYEBROW_STYLE}>Person card</div>
          <h3 style={{ margin: "6px 0 0", fontSize: 28 }}>{surface.personName}</h3>
          <div style={{ marginTop: 8, fontSize: 13, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.subtitle}</div>
          <p style={{ margin: "10px 0 0", maxWidth: 760, color: PLAY_SCREEN_THEME.inkMuted, lineHeight: 1.55 }}>
            {surface.helperText}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("overview")} style={tabButtonStyle(activeTab === "overview")} type="button">
            Overview
          </button>
          <button onClick={() => setActiveTab("family")} style={tabButtonStyle(activeTab === "family")} type="button">
            Family
          </button>
          <button onClick={() => setActiveTab("offices")} style={tabButtonStyle(activeTab === "offices")} type="button">
            Offices & service
          </button>
          <button onClick={() => setActiveTab("relationships")} style={tabButtonStyle(activeTab === "relationships")} type="button">
            Relationships
          </button>
          <button onClick={() => setActiveTab("debug")} style={tabButtonStyle(activeTab === "debug")} type="button">
            Debug
          </button>
        </div>
      </div>

      {activeTab === "overview" ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {surface.overviewCards.map((card) => (
            <div key={card.id} style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>{card.label}</div>
              <div style={{ marginTop: 8, fontSize: 21, fontWeight: 700 }}>{card.value}</div>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>{card.detail}</div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "family" ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {surface.familySections.map((section) => renderFamilySection(onOpenPersonCard, section))}
        </div>
      ) : null}

      {activeTab === "offices" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={PLAY_SCREEN_EYEBROW_STYLE}>Office assignments</div>
            {surface.officeAssignments.length > 0 ? (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {surface.officeAssignments.map((assignment) => (
                  <div key={assignment.id} style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 700 }}>{assignment.title}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted }}>{assignment.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 13, color: PLAY_SCREEN_THEME.inkMuted }}>No office assignments recorded.</div>
            )}
          </div>

          <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
            <div style={PLAY_SCREEN_EYEBROW_STYLE}>Service timeline</div>
            {surface.serviceEntries.length > 0 ? (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {surface.serviceEntries.map((entry) => (
                  <div key={entry.id} style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 700 }}>{entry.title}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: PLAY_SCREEN_THEME.inkMuted }}>{entry.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 13, color: PLAY_SCREEN_THEME.inkMuted }}>No service records recorded.</div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "relationships" ? (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
          <div style={PLAY_SCREEN_EYEBROW_STYLE}>Relationships</div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: PLAY_SCREEN_THEME.inkMuted }}>
            {surface.relationshipHelperText}
          </div>
          {surface.relationshipRows.length > 0 ? (
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>
                      Counterparty
                    </th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>
                      Direction
                    </th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>
                      A / R / T
                    </th>
                    <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {surface.relationshipRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>
                        {row.personId ? (
                          <PersonCardTrigger onOpenPersonCard={onOpenPersonCard} personId={row.personId}>
                            {row.title}
                          </PersonCardTrigger>
                        ) : (
                          row.title
                        )}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.directionLabel}</td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0", color: PLAY_SCREEN_THEME.inkMuted }}>
                        {row.detail}
                      </td>
                      <td style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)", padding: "8px 0" }}>{row.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 13, color: PLAY_SCREEN_THEME.inkMuted }}>No direct relationship edges recorded for this person.</div>
          )}
        </div>
      ) : null}

      {activeTab === "debug" ? (
        <div style={{ ...PLAY_SCREEN_SUBCARD_STYLE, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={PLAY_SCREEN_EYEBROW_STYLE}>Debug table</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>Deterministic person-card field order</div>
            </div>
            <div style={{ fontSize: 12, color: PLAY_SCREEN_THEME.inkMuted }}>{surface.schemaVersion}</div>
          </div>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>
                    Field
                  </th>
                  <th align="left" style={{ borderBottom: "1px solid rgba(15, 23, 42, 0.12)", paddingBottom: 6 }}>
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {surface.debugRows.map((row) => (
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
      ) : null}
    </div>
  );
}
