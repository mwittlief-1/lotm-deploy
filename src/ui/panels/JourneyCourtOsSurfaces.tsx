import React from "react";

import type { CourtOsResponsibilityDesignKey } from "../courtosInformationArchitecture";
import { courtOsRouteFromSearch } from "../courtosRoute";

import type {
  JourneyCalendarRowV1,
  JourneyCourtOsReadModelV1,
  JourneyDomainCommandLinkV1,
  JourneyMatterCardV1,
  JourneyPlanningSurfaceV1,
  JourneyReportCardV1,
  JourneyStatusCardV1,
} from "../readModels/phaseFive/journeyCourtOsReadModel";
import "./journeyCourtOsSurfaces.css";

export interface JourneyCourtOsCommandSelectionV1 {
  command_id: string;
  command_owner_ref: string;
  owning_workspace_ref: string;
}

export interface JourneyCourtOsSurfacesProps {
  model: JourneyCourtOsReadModelV1;
  planning?: JourneyPlanningSurfaceV1 | null;
  onDomainCommand?: (selection: JourneyCourtOsCommandSelectionV1) => void;
}

function DomainCommandButton(props: {
  command: JourneyDomainCommandLinkV1;
  workspaceRef: string;
  onDomainCommand?: JourneyCourtOsSurfacesProps["onDomainCommand"];
}) {
  return <button
    className="journey-courtos__action"
    disabled={!props.command.enabled}
    onClick={() => props.onDomainCommand?.({
      command_id: props.command.command_id,
      command_owner_ref: props.command.command_owner_ref,
      owning_workspace_ref: props.workspaceRef,
    })}
    title={props.command.withheld_reason ?? undefined}
    type="button"
  >{props.command.label}</button>;
}

export function JourneyPlanningPanel(props: {
  plan: JourneyPlanningSurfaceV1;
  onDomainCommand?: JourneyCourtOsSurfacesProps["onDomainCommand"];
}) {
  return <section className="journey-courtos journey-courtos--planning" aria-labelledby="journey-plan-title">
    <header>
      <span className="journey-courtos__eyebrow">{props.plan.owning_workspace_label}</span>
      <h2 id="journey-plan-title">{props.plan.primary_purpose_label}</h2>
      <p>{props.plan.trigger_label} for {props.plan.principal_label}</p>
    </header>
    <dl className="journey-courtos__facts">
      <div><dt>Route posture</dt><dd>{props.plan.route_summary}</dd></div>
      <div><dt>Timing</dt><dd>{props.plan.timing_summary}</dd></div>
      <div><dt>Party</dt><dd>{props.plan.party_summary}</dd></div>
      <div><dt>Support</dt><dd>{props.plan.support_summary}</dd></div>
    </dl>
    <p className="journey-courtos__handoff">{props.plan.cross_domain_handoff_label}</p>
    <DomainCommandButton
      command={props.plan.primary_domain_command}
      workspaceRef={props.plan.owning_workspace_ref}
      onDomainCommand={props.onDomainCommand}
    />
  </section>;
}

function CalendarRow(props: {
  row: JourneyCalendarRowV1;
  onDomainCommand?: JourneyCourtOsSurfacesProps["onDomainCommand"];
}) {
  return <article className="journey-courtos__row">
    <div>
      <span className="journey-courtos__eyebrow">{props.row.owning_workspace_label}</span>
      <h3>{props.row.primary_purpose_label}</h3>
      <p>{props.row.principal_label} · {props.row.route_summary}</p>
    </div>
    <div className="journey-courtos__row-status">
      <strong>{props.row.status_label}</strong>
      <span>{props.row.timing_summary}</span>
    </div>
    {props.row.absence_and_coverage_summary
      ? <p className="journey-courtos__notice">{props.row.absence_and_coverage_summary}</p>
      : null}
    {props.row.open_command
      ? <DomainCommandButton command={props.row.open_command} workspaceRef={props.row.owning_workspace_ref} onDomainCommand={props.onDomainCommand} />
      : null}
  </article>;
}

export function JourneyCalendarPanel(props: {
  rows: readonly JourneyCalendarRowV1[];
  withheldCount: number;
  onDomainCommand?: JourneyCourtOsSurfacesProps["onDomainCommand"];
}) {
  return <section className="journey-courtos" aria-labelledby="journey-calendar-title">
    <header>
      <span className="journey-courtos__eyebrow">House Command · coverage and commitments</span>
      <h2 id="journey-calendar-title">Planned presence and absence</h2>
      <p>These journeys originate in their owning responsibilities. This calendar changes no plan.</p>
    </header>
    <div className="journey-courtos__rows">
      {props.rows.length
        ? props.rows.map((row) => <CalendarRow key={row.journey_record_id} row={row} onDomainCommand={props.onDomainCommand} />)
        : <p className="journey-courtos__empty">No admitted journeys are visible for this House.</p>}
    </div>
    {props.withheldCount > 0
      ? <p className="journey-courtos__withheld">{props.withheldCount} journey record{props.withheldCount === 1 ? " is" : "s are"} unavailable or withheld.</p>
      : null}
  </section>;
}

function StatusCard(props: {
  card: JourneyStatusCardV1;
  onDomainCommand?: JourneyCourtOsSurfacesProps["onDomainCommand"];
}) {
  return <article className="journey-courtos__status-card">
    <span className="journey-courtos__eyebrow">{props.card.owning_workspace_label}</span>
    <h3>{props.card.primary_purpose_label}</h3>
    <strong>{props.card.status_label}</strong>
    <p>{props.card.principal_label} · {props.card.route_summary}</p>
    <p>{props.card.timing_summary}</p>
    {props.card.party_summary ? <p><b>Party:</b> {props.card.party_summary}</p> : null}
    {props.card.last_known_location_label ? <p><b>Last known:</b> {props.card.last_known_location_label}</p> : null}
    {props.card.schedule_effect_summary ? <p><b>Schedule:</b> {props.card.schedule_effect_summary}</p> : null}
    {props.card.withheld_fields.length
      ? <p className="journey-courtos__withheld">Some detail is withheld: {props.card.withheld_fields.join(", ")}.</p>
      : null}
    <div className="journey-courtos__actions">
      {props.card.domain_command_links.map((command) => <DomainCommandButton
        command={command}
        key={command.command_id}
        workspaceRef={props.card.owning_workspace_ref}
        onDomainCommand={props.onDomainCommand}
      />)}
    </div>
  </article>;
}

export function JourneyStatusPanel(props: {
  cards: readonly JourneyStatusCardV1[];
  onDomainCommand?: JourneyCourtOsSurfacesProps["onDomainCommand"];
}) {
  return <section className="journey-courtos" aria-labelledby="journey-status-title">
    <header>
      <span className="journey-courtos__eyebrow">Current cycle</span>
      <h2 id="journey-status-title">Journey status</h2>
      <p>Status follows accepted arrangements and receipts; a calendar entry is not proof of arrival.</p>
    </header>
    <div className="journey-courtos__cards">
      {props.cards.map((card) => <StatusCard card={card} key={card.journey_record_id} onDomainCommand={props.onDomainCommand} />)}
    </div>
  </section>;
}

function ReportCard({ card }: { card: JourneyReportCardV1 }) {
  return <article className="journey-courtos__report">
    <span className="journey-courtos__eyebrow">{card.source_label} · {card.knowledge_posture.replaceAll("_", " ")}</span>
    <h3>{card.author_label}</h3>
    <p>{card.summary}</p>
    {card.uncertainty_note ? <p className="journey-courtos__withheld">{card.uncertainty_note}</p> : null}
    <small>{card.observed_period_label} · {card.evidence_basis_label}</small>
    {card.receipt_refs.length ? <details><summary>Development evidence</summary>{card.receipt_refs.map((ref) => <code key={ref}>{ref}</code>)}</details> : null}
  </article>;
}

export function JourneyReportsPanel({ cards }: { cards: readonly JourneyReportCardV1[] }) {
  return <section className="journey-courtos" aria-labelledby="journey-reports-title">
    <header>
      <span className="journey-courtos__eyebrow">Knowledge-safe accounts</span>
      <h2 id="journey-reports-title">Reports from the road</h2>
      <p>Each account retains its author, basis and uncertainty. It is not omniscient Journey state.</p>
    </header>
    <div className="journey-courtos__cards">{cards.map((card) => <ReportCard card={card} key={card.report_id} />)}</div>
  </section>;
}

function MatterCard(props: {
  card: JourneyMatterCardV1;
  onDomainCommand?: JourneyCourtOsSurfacesProps["onDomainCommand"];
}) {
  const placement = props.card.placement === "off_cycle_dispatch"
    ? "Needs attention before Council"
    : props.card.placement === "next_council_docket"
      ? "For the next Council docket"
      : "Handled in the owning workspace";
  return <article className="journey-courtos__matter" data-placement={props.card.placement}>
    <span className="journey-courtos__eyebrow">{placement}</span>
    <h3>{props.card.summary}</h3>
    <p>{props.card.why_it_matters}</p>
    {props.card.deadline_label ? <p><b>Deadline:</b> {props.card.deadline_label}</p> : null}
    <div className="journey-courtos__actions">
      {props.card.command_links.map((command) => <DomainCommandButton
        command={command}
        key={command.command_id}
        workspaceRef={props.card.owning_workspace_ref}
        onDomainCommand={props.onDomainCommand}
      />)}
    </div>
  </article>;
}

export function JourneyMattersPanel(props: {
  cards: readonly JourneyMatterCardV1[];
  onDomainCommand?: JourneyCourtOsSurfacesProps["onDomainCommand"];
}) {
  return <section className="journey-courtos" aria-labelledby="journey-matters-title">
    <header>
      <span className="journey-courtos__eyebrow">Thresholded exceptions</span>
      <h2 id="journey-matters-title">Journey-related Matters</h2>
      <p>Each Matter remains owned by the responsibility or proceeding that created the journey.</p>
    </header>
    <div className="journey-courtos__cards">{props.cards.map((card) => <MatterCard card={card} key={card.matter_id} onDomainCommand={props.onDomainCommand} />)}</div>
  </section>;
}

/**
 * Reusable shared-service surfaces.  This component is embedded in House
 * Command or an owning workspace; it is never a ninth room or a 25th atom.
 */
export function JourneyCourtOsSurfaces(props: JourneyCourtOsSurfacesProps) {
  return <div className="journey-courtos-bundle">
    {props.planning ? <JourneyPlanningPanel plan={props.planning} onDomainCommand={props.onDomainCommand} /> : null}
    <JourneyCalendarPanel rows={props.model.calendar_rows} withheldCount={props.model.withheld_journey_count} onDomainCommand={props.onDomainCommand} />
    <JourneyStatusPanel cards={props.model.status_cards} onDomainCommand={props.onDomainCommand} />
    <JourneyReportsPanel cards={props.model.report_cards} />
    <JourneyMattersPanel cards={props.model.matter_cards} onDomainCommand={props.onDomainCommand} />
  </div>;
}

function responsibilityOwner(key: CourtOsResponsibilityDesignKey): string {
  return `courtos.responsibility.${key}`;
}

export function journeyCourtOsReadModelForResponsibility(
  model: JourneyCourtOsReadModelV1,
  responsibility: CourtOsResponsibilityDesignKey,
  scopeId: string | null = null,
): JourneyCourtOsReadModelV1 {
  const owner = responsibilityOwner(responsibility);
  const belongsHere = (row: {
    owning_responsibility_key: string | null;
    owning_workspace_ref: string;
  }): boolean => {
    if (row.owning_responsibility_key !== owner) return false;
    if (!scopeId) return true;
    const queryIndex = row.owning_workspace_ref.indexOf("?");
    if (queryIndex < 0) return false;
    const route = courtOsRouteFromSearch(row.owning_workspace_ref.slice(queryIndex));
    return route.place.kind === "responsibility" &&
      route.place.responsibility === responsibility &&
      route.place.scopeId === scopeId;
  };
  const calendarRows = model.calendar_rows.filter(belongsHere);
  const statusCards = model.status_cards.filter(belongsHere);
  const reportCards = model.report_cards.filter(belongsHere);
  const matterCards = model.matter_cards.filter(belongsHere);
  return {
    ...model,
    calendar_rows: calendarRows,
    status_cards: statusCards,
    report_cards: reportCards,
    matter_cards: matterCards,
    visible_journey_count: statusCards.length,
    withheld_journey_count: 0,
    candidate_source_row_count: 0,
    next_off_cycle_dispatch_count: matterCards.filter((row) => row.placement === "off_cycle_dispatch").length,
    next_council_docket_count: matterCards.filter((row) => row.placement === "next_council_docket").length,
  };
}

/** Shared Journey posture embedded under House Command; never a separate room. */
export function JourneyHouseCommandContext(props: JourneyCourtOsSurfacesProps) {
  return <div className="journey-courtos-embed journey-courtos-embed--house-command">
    <JourneyCalendarPanel
      rows={props.model.calendar_rows}
      withheldCount={props.model.withheld_journey_count}
      onDomainCommand={props.onDomainCommand}
    />
    {props.model.matter_cards.length ? <JourneyMattersPanel
      cards={props.model.matter_cards}
      onDomainCommand={props.onDomainCommand}
    /> : null}
  </div>;
}

/** Journey facts for exactly one current responsibility workspace. */
export function JourneyResponsibilityContext(props: JourneyCourtOsSurfacesProps & {
  responsibility: CourtOsResponsibilityDesignKey;
  scopeId?: string | null;
}) {
  const model = journeyCourtOsReadModelForResponsibility(
    props.model,
    props.responsibility,
    props.scopeId ?? null,
  );
  return <section
    className="journey-courtos-embed journey-courtos-embed--responsibility"
    data-journey-responsibility={props.responsibility}
  >
    <header className="journey-courtos-embed__header">
      <small>Presence and travel</small>
      <h3>Commitments owned here</h3>
      <p>Only admitted, entitled Journey facts for this responsibility appear below.</p>
    </header>
    {model.visible_journey_count ? <>
      <JourneyStatusPanel cards={model.status_cards} onDomainCommand={props.onDomainCommand} />
      {model.report_cards.length ? <JourneyReportsPanel cards={model.report_cards} /> : null}
      {model.matter_cards.length ? <JourneyMattersPanel cards={model.matter_cards} onDomainCommand={props.onDomainCommand} /> : null}
    </> : <p className="journey-courtos__empty">No admitted Journey commitment is owned by this responsibility.</p>}
  </section>;
}
