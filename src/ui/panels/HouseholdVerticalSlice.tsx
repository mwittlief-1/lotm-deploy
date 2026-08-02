import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  type CouncilRoomParticipantV1,
} from "../../ready/councilRoomReadyProjection";
import { useCouncilRoom1120Data } from "../councilRoom1120Client";
import { useCourtOs1120Data } from "../courtOs1120Client";
import {
  COURTOS_DOMAINS,
  courtOsDomain,
  courtOsResponsibility,
  type CourtOsDomainDefinition,
  type CourtOsDomainKey,
  type CourtOsResponsibilityDesignKey,
} from "../courtosInformationArchitecture";
import {
  COURTOS_INITIAL_ROUTE,
  courtOsDomainRoute,
  courtOsResponsibilityRoute,
  courtOsRouteFromSearch,
  courtOsRouteWithoutDetail,
  courtOsSearchForRoute,
  type CourtOsDetail,
  type CourtOsRoute,
} from "../courtosRoute";
import {
  buildCourtOsShellRuntimeModel,
  type CourtOsShellRuntimeModel,
} from "../courtosShellModel";
import { COURTOS_PLAYER_CONTEXT } from "../../courtosPlayerContext";
import {
  councilRoomArtForHouse,
  houseIdentityAssets,
} from "../houseIdentityAssets";
import { useHousehold1120Data } from "../household1120Client";
import {
  buildHouseholdUatRuntimeModel,
  HOUSEHOLD_RESPONSIBILITIES,
  type HouseholdResponsibilityKey,
  type HouseholdResponsibilityRuntime,
  type HouseholdUatRuntimeModel,
} from "../householdUatModel";
import {
  JourneyHouseCommandContext,
  JourneyResponsibilityContext,
  type JourneyCourtOsCommandSelectionV1,
} from "./JourneyCourtOsSurfaces";
import { portraitArtForPerson } from "../portraitBankResolver";
import type { JourneyCourtOsReadModelV1 } from "../readModels/phaseFive/journeyCourtOsReadModel";
import type {
  Household1120EducationLearnerPlanRow,
  Household1120MembershipRow,
  Household1120ReadOnlyProjection,
} from "../readModels/household1120/types";
import { EstateHoldingsScene } from "../spatial/ManorOperationsScene";
import {
  type CourtOsSpatialManor,
  useCourtOsSpatialPortfolio,
} from "../spatial/courtosSpatialClient";
import "./householdVerticalSlice.css";

type Scene =
  | "council"
  | "house_command"
  | "council_docket"
  | "manor_stewardship"
  | CourtOsDomainKey
  | HouseholdResponsibilityKey;
type DialogState =
  | { kind: "council_person"; person: CouncilRoomParticipantV1 }
  | { kind: "assignment"; responsibility: HouseholdResponsibilityRuntime }
  | { kind: "education_plan"; plan: Household1120EducationLearnerPlanRow }
  | null;

function householdResponsibilityForDesignKey(
  designKey: string,
): HouseholdResponsibilityKey | null {
  return (
    HOUSEHOLD_RESPONSIBILITIES.find(
      (responsibility) => responsibility.designKey === designKey,
    )?.key ?? null
  );
}

function sceneForRoute(route: CourtOsRoute): Scene {
  if (route.place.kind === "council") return "council";
  if (route.place.kind === "house_command") return "house_command";
  if (route.place.kind === "council_docket") return "council_docket";
  if (route.place.kind === "domain") return route.place.domain;
  if (route.place.responsibility === "manor_stewardship") {
    return "manor_stewardship";
  }
  return (
    householdResponsibilityForDesignKey(route.place.responsibility) ??
    route.place.domain
  );
}

const HOUSEHOLD_SOLAR_ART =
  "/assets/council-command-room/household-vertical-slice/household-place-wide-v1.png";
type CouncilSeatPosition = {
  x: number;
  y: number;
  width: number;
};

const PEARWICK_FOUR_SEAT_LAYOUT: readonly CouncilSeatPosition[] = [
  { x: 50, y: 19, width: 16 },
  { x: 72, y: 32, width: 16 },
  { x: 67, y: 56, width: 16 },
  { x: 28, y: 32, width: 16 },
];

const SEVEN_SEAT_COUNCIL_LAYOUT: readonly CouncilSeatPosition[] = [
  { x: 50, y: 19, width: 16 },
  { x: 72, y: 32, width: 16 },
  { x: 77, y: 55, width: 16 },
  { x: 28, y: 32, width: 16 },
  { x: 23, y: 55, width: 16 },
  { x: 60, y: 67, width: 16 },
  { x: 40, y: 67, width: 16 },
];

export function councilSeatPosition(
  person: CouncilRoomParticipantV1,
  seatCount: number,
): CouncilSeatPosition {
  const index = Math.max(0, (person.seat_rank ?? 1) - 1);
  const layout =
    seatCount === 4
      ? PEARWICK_FOUR_SEAT_LAYOUT
      : seatCount === 7
        ? SEVEN_SEAT_COUNCIL_LAYOUT
        : null;
  return layout?.[index] ?? person.table_position;
}

function requestedHouseId(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("houseId")?.trim();
  return value || COURTOS_PLAYER_CONTEXT.house_id;
}

function sentenceCase(value: string): string {
  const clean = value.replace(/_/g, " ").trim();
  return clean ? `${clean[0]?.toUpperCase()}${clean.slice(1)}` : "Unknown";
}

function personInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter((part) => part && part.toLowerCase() !== "of")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function MissingPortrait({ label }: { label: string }) {
  return (
    <span
      className="uat-portrait-missing"
      data-portrait-state="missing"
      role="img"
      aria-label={`Portrait unavailable for ${label}`}
    >
      <b aria-hidden="true">{personInitials(label)}</b>
      <small>Portrait unavailable</small>
    </span>
  );
}

function educationPlanStateLabel(value: string): string {
  if (value === "locked_turn0_plan_not_an_executed_contract") {
    return "Starting plan · not yet executed";
  }
  return sentenceCase(value);
}

function educationCapacityStateLabel(value: string): string {
  if (value === "unavailable_not_a_market_or_live_capacity_surface") {
    return "Provider capacity not established";
  }
  return sentenceCase(value);
}

function sourceSurfaceLabel(value: string): string {
  const labels: Record<string, string> = {
    ro_household_responsibility_summary_v1: "Responsibility assignments",
    ro_household_stores_position_v1: "Current stores",
    ro_household_stores_history_v1: "Stores movements and receipts",
    ro_household_supply_counterparty_route_v1: "Supply routes",
    ro_adult_kin_support_roster_v1: "Adult Kin support roster",
    ro_adult_kin_support_arrangement_v1: "Adult Kin support arrangements",
    ro_education_learner_plan_v1: "Learner plans",
    ro_education_cycle_report_v1: "Education cycle reports",
    ro_health_roster_v1: "Health and care roster",
    ro_health_cycle_report_v1: "Health cycle reports",
    ro_care_arrangement_v1: "Care arrangements",
  };
  return labels[value] ?? "Household record";
}

function HouseMark({
  houseId,
  houseName,
}: {
  houseId: string;
  houseName: string;
}) {
  const assets = houseIdentityAssets(houseId);
  return (
    <span className="uat-house-mark">
      {assets.heraldry ? (
        <img src={assets.heraldry.compact} alt="" />
      ) : (
        <i aria-hidden="true" />
      )}
      <span>
        <strong>{houseName}</strong>
        <small>CourtOS</small>
      </span>
    </span>
  );
}

export function HouseRoomStandard({
  houseId,
  houseName,
}: {
  houseId: string;
  houseName: string;
}) {
  const assets = houseIdentityAssets(houseId);
  if (!assets.heraldry) return null;
  return (
    <figure
      aria-label={`${houseName} house standard`}
      className="uat-room-house-standard"
      data-house-id={houseId}
    >
      <span aria-hidden="true">
        <i />
        <img src={assets.heraldry.bannerTab} alt="" />
      </span>
      <figcaption>{houseName}</figcaption>
    </figure>
  );
}

function AppHeader({
  model,
  route,
}: {
  model: CourtOsShellRuntimeModel;
  route: CourtOsRoute;
}) {
  const scene = sceneForRoute(route);
  const responsibilityKey =
    route.place.kind === "responsibility"
      ? route.place.responsibility
      : null;
  const domainKey =
    route.place.kind === "domain" || route.place.kind === "responsibility"
      ? route.place.domain
      : null;
  const domain = domainKey ? courtOsDomain(domainKey) : null;
  const responsibility =
    responsibilityKey
      ? courtOsResponsibility(responsibilityKey)
      : null;
  const householdResponsibility =
    responsibilityKey
      ? HOUSEHOLD_RESPONSIBILITIES.find(
          (item) => item.designKey === responsibilityKey,
        ) ?? null
      : null;
  const place =
    scene === "council"
      ? "The Inner Council"
      : scene === "house_command"
        ? "House Command"
        : scene === "council_docket"
          ? "The Council Docket"
          : scene === "manor_stewardship"
            ? "Manor Stewardship"
            : responsibility
              ? householdResponsibility?.place ?? responsibility.label
              : domain
                ? domain.venue
        : HOUSEHOLD_RESPONSIBILITIES.find((item) => item.key === scene)?.place ??
          "CourtOS";
  return (
    <header className="uat-header">
      <HouseMark houseId={model.house.houseId} houseName={model.house.displayName} />
      <div className="uat-header-place">
        <small>
          {scene === "council"
            ? "Council Room"
            : scene === "house_command"
              ? "House governance"
              : scene === "council_docket"
                ? "Triennial synthesis"
                : domain?.label ??
                  (scene === "manor_stewardship" ? "Estate & Holdings" : "Household")}
        </small>
        <h1>{place}</h1>
      </div>
      <div className="uat-header-time">
        <strong>
          Turn 1 · {model.turn.year}–{model.turn.year + 2}
        </strong>
        <span>{model.player.label} · {model.authority.label}</span>
      </div>
    </header>
  );
}

function CouncilPersonMarker({
  person,
  seatCount,
  onOpen,
}: {
  person: CouncilRoomParticipantV1;
  seatCount: number;
  onOpen: () => void;
}) {
  const seatPosition = councilSeatPosition(person, seatCount);
  const portrait = portraitArtForPerson({
    personId: person.person_ref.entity_id,
    label: person.person_ref.display_name,
    age: person.person_ref.age_turn0,
    sex: person.person_ref.sex,
  });
  return (
    <button
      className="uat-council-person"
      data-seat={person.seat_rank ?? "attendee"}
      onClick={onOpen}
      style={
        {
          "--seat-x": `${seatPosition.x}%`,
          "--seat-y": `${seatPosition.y}%`,
          "--seat-w": `${seatPosition.width}%`,
        } as React.CSSProperties
      }
      type="button"
    >
      <span className="uat-council-portrait">
        {portrait ? (
          <img src={portrait.src} alt={portrait.alt} />
        ) : (
          <MissingPortrait label={person.person_ref.display_name} />
        )}
      </span>
      <span className="uat-person-plaque">
        <strong>{person.person_ref.display_name}</strong>
        <small>{sentenceCase(person.portfolio)}</small>
      </span>
    </button>
  );
}

function CouncilHouseHeraldry({
  houseId,
}: {
  houseId: string;
}) {
  const assets = houseIdentityAssets(houseId);
  if (!assets.heraldry || assets.integratedCouncilRoom) return null;
  return (
    <div className="uat-council-heraldry" aria-hidden="true">
      <img
        className="uat-council-banner uat-council-banner-left"
        src={assets.heraldry.bannerTab}
        alt=""
      />
      <img
        className="uat-council-banner uat-council-banner-right"
        src={assets.heraldry.bannerTab}
        alt=""
      />
    </div>
  );
}

function CouncilScene({
  model,
  onEnterDomain,
  onOpenHouseCommand,
  onOpenCouncilDocket,
  onOpenPerson,
}: {
  model: CourtOsShellRuntimeModel;
  onEnterDomain: (domain: CourtOsDomainKey) => void;
  onOpenHouseCommand: () => void;
  onOpenCouncilDocket: () => void;
  onOpenPerson: (person: CouncilRoomParticipantV1) => void;
}) {
  return (
    <section
      className="uat-scene uat-council-scene"
      aria-label="The Inner Council"
      data-council-source={model.councilSource.status}
    >
      <CouncilHouseHeraldry houseId={model.house.houseId} />
      <div className="uat-council-source-posture" role="note">
        <strong>Provisional Council</strong>
        <span>Candidate membership projection · not admitted source truth</span>
      </div>
      <button
        className="uat-council-command-object"
        onClick={onOpenHouseCommand}
        type="button"
      >
        <small>House banner</small>
        <strong>House Command</strong>
        <span>Assignments, delegation, and retained authority</span>
      </button>
      <button
        className="uat-council-table-object"
        onClick={onOpenCouncilDocket}
        type="button"
      >
        <small>Council table</small>
        <strong>Council Docket</strong>
        <span>Triennial synthesis from the working domains</span>
      </button>
      {model.council.map((person) => (
        <CouncilPersonMarker
          key={person.participant_id}
          onOpen={() => onOpenPerson(person)}
          person={person}
          seatCount={model.council.length}
        />
      ))}
      <nav className="uat-council-domain-objects" aria-label="Operational rooms">
        {COURTOS_DOMAINS.map((domain) => (
          <button
            data-domain={domain.key}
            key={domain.key}
            onClick={() => onEnterDomain(domain.key)}
            type="button"
          >
            <i aria-hidden="true" />
            <span>
              <small>{domain.objectLabel}</small>
              <strong>{domain.label}</strong>
              <em>{domain.objectDetail}</em>
            </span>
          </button>
        ))}
      </nav>
    </section>
  );
}

function ResponsibilityMarker({
  responsibility,
  index,
  onOpen,
}: {
  responsibility: HouseholdResponsibilityRuntime;
  index: number;
  onOpen: () => void;
}) {
  const portrait = responsibility.holder
    ? portraitArtForPerson({
        personId: responsibility.holder.personId,
        label: responsibility.holder.displayName,
      })
    : null;
  return (
    <button
      className="uat-responsibility-marker"
      data-index={index}
      data-state={responsibility.state}
      onClick={onOpen}
      type="button"
    >
      {portrait ? (
        <span className="uat-responsibility-portrait">
          <img src={portrait.src} alt={portrait.alt} />
        </span>
      ) : responsibility.holder ? (
        <span className="uat-responsibility-portrait">
          <MissingPortrait label={responsibility.holder.displayName} />
        </span>
      ) : (
        <span className="uat-responsibility-number" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
      <span className="uat-responsibility-plaque">
        <small>{responsibility.stateLabel}</small>
        <strong>{responsibility.definition.shortTitle}</strong>
        <span>
          {responsibility.holder?.displayName ?? "No admitted assignment"}
        </span>
      </span>
    </button>
  );
}

function HouseholdScene({
  model,
  onOpenResponsibility,
}: {
  model: HouseholdUatRuntimeModel;
  onOpenResponsibility: (key: HouseholdResponsibilityKey) => void;
}) {
  return (
    <section className="uat-scene uat-household-scene" aria-label="The Household Solar">
      <HouseRoomStandard
        houseId={model.house.houseId}
        houseName={model.house.displayName}
      />
      <div className="uat-room-introduction">
        <small>Household</small>
        <h2>The work of maintaining the House</h2>
        <p>
          Choose a responsibility to enter its working place and inspect the
          admitted record.
        </p>
      </div>
      {model.responsibilities.map((responsibility, index) => (
        <ResponsibilityMarker
          index={index}
          key={responsibility.definition.key}
          onOpen={() => onOpenResponsibility(responsibility.definition.key)}
          responsibility={responsibility}
        />
      ))}
      {model.protectedPersons.visible ? (
        <button className="uat-protected-entry" type="button">
          <small>Mandate in force</small>
          <strong>Protected Persons</strong>
          <span>{model.protectedPersons.recordCount} active dossiers</span>
        </button>
      ) : null}
    </section>
  );
}

function DomainRoomScene({
  domain,
  houseId,
  houseName,
  onOpenResponsibility,
}: {
  domain: CourtOsDomainDefinition;
  houseId: string;
  houseName: string;
  onOpenResponsibility: (responsibility: CourtOsResponsibilityDesignKey) => void;
}) {
  return (
    <section className="uat-scene uat-domain-scene" aria-label={domain.venue}>
      <HouseRoomStandard houseId={houseId} houseName={houseName} />
      <header className="uat-domain-room-hero">
        <small>{domain.label}</small>
        <h2>{domain.venue}</h2>
        <p>{domain.purpose}</p>
        <span>Choose a responsibility station</span>
      </header>
      <div className="uat-domain-stations">
        {domain.responsibilities.map((responsibility) => (
          <button
            data-scope={responsibility.scope}
            key={responsibility.key}
            onClick={() => onOpenResponsibility(responsibility.key)}
            type="button"
          >
            <i aria-hidden="true" />
            <div>
              <small>{responsibility.scope} scope</small>
              <h3>{responsibility.label}</h3>
              <p>
                {responsibility.conditional
                  ? "This working station appears only when its exact scope is admitted."
                  : "No source-backed domain-room projection is available for this House yet."}
              </p>
            </div>
          </button>
        ))}
      </div>
      <aside className="uat-domain-unavailable-note">
        <strong>No substitute work has been invented.</strong>
        <span>
          This room will open from its versioned domain view when the responsible
          source contract is admitted.
        </span>
      </aside>
    </section>
  );
}

function UnavailableResponsibilityScene({
  domain,
  houseId,
  houseName,
  responsibilityKey,
  onSelect,
  journeyContext,
}: {
  domain: CourtOsDomainDefinition;
  houseId: string;
  houseName: string;
  responsibilityKey: CourtOsResponsibilityDesignKey;
  onSelect: (responsibility: CourtOsResponsibilityDesignKey) => void;
  journeyContext?: React.ReactNode;
}) {
  const responsibility = courtOsResponsibility(responsibilityKey);
  return (
    <section
      aria-label={responsibility.label}
      className="uat-scene uat-responsibility-scene"
      data-responsibility={responsibility.key}
    >
      <HouseRoomStandard houseId={houseId} houseName={houseName} />
      <nav className="uat-responsibility-rail" aria-label={`${domain.label} responsibilities`}>
        {domain.responsibilities.map((candidate, index) => (
          <button
            aria-current={candidate.key === responsibility.key ? "page" : undefined}
            data-state="withheld"
            key={candidate.key}
            onClick={() => onSelect(candidate.key)}
            type="button"
          >
            <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
            <span>
              <strong>{candidate.shortLabel}</strong>
              <small>{candidate.conditional ? "Conditional scope" : "Source view unavailable"}</small>
            </span>
          </button>
        ))}
      </nav>
      <div className="uat-workspace">
        <header className="uat-workspace-hero">
          <div>
            <small>{domain.label} responsibility</small>
            <h2>{responsibility.label}</h2>
            <p>{domain.purpose}</p>
          </div>
          <span data-state="withheld">Record unavailable</span>
        </header>
        <div className="uat-workspace-body">
          <main>
            <div className="uat-empty-record">
              <span aria-hidden="true">—</span>
              <div>
                <strong>No admitted operational projection</strong>
                <p>
                  CourtOS knows where this responsibility belongs, but no versioned
                  source view is admitted for this House and scope. No assignment,
                  status, matter, or evidence has been invented.
                </p>
              </div>
            </div>
            {journeyContext}
          </main>
          <div className="uat-workspace-side">
            <aside className="uat-authority-card">
              <small>Scope</small>
              <MissingPortrait label="unresolved accountable owner" />
              <strong>No admitted assignment</strong>
              <span>
                {responsibility.conditional
                  ? "This station appears only when its exact scope is admitted."
                  : `Expected ${responsibility.scope} scope; no accountable owner may be inferred.`}
              </span>
            </aside>
            <section className="uat-cycle-record">
              <small>Source boundary</small>
              <strong>No substitute report</strong>
              <span>The room will consume its versioned read model when admitted.</span>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReservedCourtOsSurface({
  scene,
  journeyContext,
}: {
  scene: "house_command" | "council_docket";
  journeyContext?: React.ReactNode;
}) {
  const command = scene === "house_command";
  const appointments = courtOsResponsibility("office_post_appointments");
  return (
    <section className="uat-scene uat-reserved-scene" aria-label={command ? "House Command" : "Council Docket"}>
      <div className={journeyContext ? "uat-reserved-content--with-journey" : undefined}>
        <small>{command ? "House banner" : "Council table"}</small>
        <h2>{command ? "House Command" : "The Council Docket"}</h2>
        <p>
          {command
            ? "Assignments, delegation, scopes, authority bounds, and House-wide controls belong here."
            : "The docket is compiled from eligible domain Matters and reports at the triennial break."}
        </p>
        <strong>
          {command
            ? "The governance read view is not yet available."
            : "No docket is available outside an admitted Council synthesis."}
        </strong>
        {command ? (
          <article className="uat-command-responsibility">
            <small>Assignable House Command responsibility</small>
            <h3>{appointments.label}</h3>
            <p>
              Exact appointing scopes, vacancies, continuation, candidate review,
              removal, terms, and handover belong here. The governance read view is
              not yet admitted, so no office state is inferred.
            </p>
          </article>
        ) : null}
        {command ? journeyContext : null}
      </div>
    </section>
  );
}

function ResponsibilityRail({
  selected,
  model,
  onSelect,
}: {
  selected: HouseholdResponsibilityKey;
  model: HouseholdUatRuntimeModel;
  onSelect: (key: HouseholdResponsibilityKey) => void;
}) {
  return (
    <nav className="uat-responsibility-rail" aria-label="Household responsibilities">
      {model.responsibilities.map((responsibility, index) => (
        <button
          aria-current={
            responsibility.definition.key === selected ? "page" : undefined
          }
          data-state={responsibility.state}
          key={responsibility.definition.key}
          onClick={() => onSelect(responsibility.definition.key)}
          type="button"
        >
          <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
          <span>
            <strong>{responsibility.definition.shortTitle}</strong>
            <small>{responsibility.stateLabel}</small>
          </span>
        </button>
      ))}
    </nav>
  );
}

function AuthorityCard({
  responsibility,
  onInspect,
}: {
  responsibility: HouseholdResponsibilityRuntime;
  onInspect: () => void;
}) {
  const portrait = responsibility.holder
    ? portraitArtForPerson({
        personId: responsibility.holder.personId,
        label: responsibility.holder.displayName,
      })
    : null;
  return (
    <aside className="uat-authority-card">
      <small>Accountability</small>
      {portrait ? (
        <img src={portrait.src} alt={portrait.alt} />
      ) : (
        <MissingPortrait
          label={responsibility.holder?.displayName ?? "unassigned responsibility"}
        />
      )}
      <strong>
        {responsibility.holder?.displayName ?? "No admitted assignment"}
      </strong>
      <span>
        {responsibility.holder
          ? "Recorded as the accountable holder."
          : "The current record does not name a holder for this responsibility."}
      </span>
      <button onClick={onInspect} type="button">
        Review assignment basis
      </button>
    </aside>
  );
}

function EmptyRecord({ responsibility }: { responsibility: HouseholdResponsibilityRuntime }) {
  return (
    <div className="uat-empty-record">
      <span aria-hidden="true">—</span>
      <div>
        <strong>{responsibility.stateLabel}</strong>
        <p>{responsibility.explanation}</p>
      </div>
    </div>
  );
}

function MembershipContext({
  rows,
}: {
  rows: readonly Household1120MembershipRow[];
}) {
  return (
    <section className="uat-membership-context">
      <header>
        <div>
          <small>Scope context</small>
          <h3>People attached to this House</h3>
        </div>
        <span>{rows.length}</span>
      </header>
      <p>
        Attachment is shown here to orient provisioning review. It is not proof
        of current supply, custody, or receipt.
      </p>
      <div className="uat-membership-list">
        {rows.map((person) => (
          <article key={person.protected_person_id}>
            <strong>{person.display_name}</strong>
            <span>
              {person.primary_residence_label ?? "Residence not recorded"}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function StoresRecords({
  responsibility,
  projection,
}: {
  responsibility: HouseholdResponsibilityRuntime;
  projection: Household1120ReadOnlyProjection;
}) {
  return (
    <>
      {projection.stores_positions.length > 0 ? (
        <section className="uat-record-table">
          <header>
            <strong>Current positions</strong>
            <span>{projection.stores_positions.length}</span>
          </header>
          {projection.stores_positions.map((position) => (
            <article key={position.stores_position_id}>
              <div>
                <strong>{sentenceCase(position.resource_id)}</strong>
                <small>{sentenceCase(position.position_state)}</small>
              </div>
              <span>
                {position.quantity_integer === null
                  ? "Quantity not disclosed"
                  : position.quantity_integer.toLocaleString()}
              </span>
            </article>
          ))}
        </section>
      ) : (
        <EmptyRecord responsibility={responsibility} />
      )}
      <MembershipContext rows={projection.membership_context} />
    </>
  );
}

function AdultKinRecords({
  responsibility,
  projection,
}: {
  responsibility: HouseholdResponsibilityRuntime;
  projection: Household1120ReadOnlyProjection;
}) {
  const names = new Map(
    projection.membership_context.map((person) => [
      person.protected_person_id,
      person.display_name,
    ]),
  );
  if (projection.adult_kin_roster.length === 0) {
    return <EmptyRecord responsibility={responsibility} />;
  }
  return (
    <section className="uat-record-table">
      <header>
        <strong>Support roster</strong>
        <span>{projection.adult_kin_roster.length}</span>
      </header>
      {projection.adult_kin_roster.map((row) => (
        <article key={row.support_roster_id}>
          <div>
            <strong>{names.get(row.person_id) ?? "Named person"}</strong>
            <small>{sentenceCase(row.roster_state)}</small>
          </div>
          <span>
            {
              projection.adult_kin_arrangements.filter(
                (item) => item.person_id === row.person_id,
              ).length
            }{" "}
            arrangements
          </span>
        </article>
      ))}
    </section>
  );
}

function EducationRecords({
  responsibility,
  projection,
  onOpenPlan,
}: {
  responsibility: HouseholdResponsibilityRuntime;
  projection: Household1120ReadOnlyProjection;
  onOpenPlan: (plan: Household1120EducationLearnerPlanRow) => void;
}) {
  if (projection.education_plans.length === 0) {
    return <EmptyRecord responsibility={responsibility} />;
  }
  return (
    <section className="uat-learner-ledger">
      <header>
        <div>
          <small>Turn-opening recommendations</small>
          <h3>Education plans · not yet executed</h3>
        </div>
        <span>{projection.education_plans.length}</span>
      </header>
      <div>
        {projection.education_plans.map((plan) => (
          <button
            key={plan.education_assignment_id}
            onClick={() => onOpenPlan(plan)}
            type="button"
            data-plan-state={plan.contract_state}
          >
            <span className="uat-learner-name">
              <strong>{plan.learner_name}</strong>
              <small>
                Age {plan.learner_age_turn0 ?? "unknown"} ·{" "}
                {sentenceCase(plan.setting_type)}
              </small>
            </span>
            <span className="uat-learner-track">
              <small>Recommended formation</small>
              <strong>{plan.recommended_track}</strong>
            </span>
            <span className="uat-learner-provider">
              <small>Proposed provider</small>
              <strong>{plan.primary_provider_name ?? "Not named"}</strong>
            </span>
            <span className="uat-learner-posture">
              <small>{educationPlanStateLabel(plan.contract_state)}</small>
              <small>{educationCapacityStateLabel(plan.capacity_availability_state)}</small>
            </span>
            <i aria-hidden="true">›</i>
          </button>
        ))}
      </div>
    </section>
  );
}

function HealthRecords({
  responsibility,
  projection,
}: {
  responsibility: HouseholdResponsibilityRuntime;
  projection: Household1120ReadOnlyProjection;
}) {
  const names = new Map(
    projection.membership_context.map((person) => [
      person.protected_person_id,
      person.display_name,
    ]),
  );
  if (projection.health_roster.length === 0) {
    return <EmptyRecord responsibility={responsibility} />;
  }
  return (
    <section className="uat-record-table">
      <header>
        <strong>Active care roster</strong>
        <span>{projection.health_roster.length}</span>
      </header>
      {projection.health_roster.map((row) => (
        <article key={row.health_roster_id}>
          <div>
            <strong>{names.get(row.person_id) ?? "Named person"}</strong>
            <small>{sentenceCase(row.severity_state)}</small>
          </div>
          <span>
            {
              projection.care_arrangements.filter(
                (item) => item.person_id === row.person_id,
              ).length
            }{" "}
            care arrangements
          </span>
        </article>
      ))}
    </section>
  );
}

function CycleRecord({
  responsibility,
}: {
  responsibility: HouseholdResponsibilityRuntime;
}) {
  return (
    <section className="uat-cycle-record">
      <small>Last cycle</small>
      <strong>
        {responsibility.cycleRecordCount > 0
          ? `${responsibility.cycleRecordCount} admitted cycle ${
              responsibility.cycleRecordCount === 1 ? "record" : "records"
            }`
          : "No admitted cycle report"}
      </strong>
      <span>
        No report is substituted when the responsible office has not supplied
        one.
      </span>
    </section>
  );
}

function ResponsibilityScene({
  model,
  projection,
  selected,
  onSelect,
  onInspectAssignment,
  onOpenPlan,
  journeyContext,
}: {
  model: HouseholdUatRuntimeModel;
  projection: Household1120ReadOnlyProjection;
  selected: HouseholdResponsibilityKey;
  onSelect: (key: HouseholdResponsibilityKey) => void;
  onInspectAssignment: (responsibility: HouseholdResponsibilityRuntime) => void;
  onOpenPlan: (plan: Household1120EducationLearnerPlanRow) => void;
  journeyContext?: React.ReactNode;
}) {
  const responsibility = model.responsibilities.find(
    (item) => item.definition.key === selected,
  );
  if (!responsibility) return null;
  return (
    <section
      className="uat-scene uat-responsibility-scene"
      data-responsibility={selected}
      data-layout="room-folio"
      aria-label={responsibility.definition.title}
    >
      <ResponsibilityRail model={model} onSelect={onSelect} selected={selected} />
      <article
        aria-labelledby={`responsibility-title-${selected}`}
        className="uat-workspace"
        data-surface="working-folio"
      >
        <HouseRoomStandard
          houseId={model.house.houseId}
          houseName={model.house.displayName}
        />
        <header className="uat-workspace-hero">
          <div>
            <small>Household responsibility</small>
            <h2 id={`responsibility-title-${selected}`}>
              {responsibility.definition.title}
            </h2>
            <p>{responsibility.definition.purpose}</p>
          </div>
          <span data-state={responsibility.state}>
            {responsibility.stateLabel}
          </span>
        </header>
        <div className="uat-workspace-body">
          <section className="uat-workspace-records" aria-label="Working records">
            {selected === "stores" ? (
              <StoresRecords
                projection={projection}
                responsibility={responsibility}
              />
            ) : null}
            {selected === "adult_kin" ? (
              <AdultKinRecords
                projection={projection}
                responsibility={responsibility}
              />
            ) : null}
            {selected === "education" ? (
              <EducationRecords
                onOpenPlan={onOpenPlan}
                projection={projection}
                responsibility={responsibility}
              />
            ) : null}
            {selected === "service_care" ? (
              <HealthRecords
                projection={projection}
                responsibility={responsibility}
              />
            ) : null}
            {journeyContext}
          </section>
          <div className="uat-workspace-side">
            <AuthorityCard
              onInspect={() => onInspectAssignment(responsibility)}
              responsibility={responsibility}
            />
            <CycleRecord responsibility={responsibility} />
          </div>
        </div>
      </article>
    </section>
  );
}

function RecordDialog({
  dialog,
  councilSource,
  onClose,
}: {
  dialog: Exclude<DialogState, null>;
  councilSource: CourtOsShellRuntimeModel["councilSource"];
  onClose: () => void;
}) {
  let title = "";
  let kicker = "";
  let body: React.ReactNode = null;
  let footerLabel = "Recorded inspection · no order issued";

  if (dialog.kind === "council_person") {
    const portrait = portraitArtForPerson({
      personId: dialog.person.person_ref.entity_id,
      label: dialog.person.person_ref.display_name,
      age: dialog.person.person_ref.age_turn0,
      sex: dialog.person.person_ref.sex,
    });
    kicker = "Provisional Council reference";
    title = dialog.person.person_ref.display_name;
    footerLabel = "Candidate projection inspected · no source admission or order issued";
    body = (
      <div className="uat-person-report">
        {portrait ? (
          <img src={portrait.src} alt={portrait.alt} />
        ) : (
          <MissingPortrait label={dialog.person.person_ref.display_name} />
        )}
        <dl>
          <div>
            <dt>Projected Council portfolio</dt>
            <dd>{sentenceCase(dialog.person.portfolio)}</dd>
          </div>
          <div>
            <dt>Projected seat</dt>
            <dd>{dialog.person.seat_rank ?? "Summoned attendee"}</dd>
          </div>
          <div>
            <dt>Candidate membership</dt>
            <dd>{dialog.person.meta_label || "Candidate Council seat"}</dd>
          </div>
        </dl>
        <p>
          {councilSource.label}. No general report or matter commentary is
          admitted for this projected Council seat.
        </p>
      </div>
    );
  } else if (dialog.kind === "assignment") {
    kicker = dialog.responsibility.definition.title;
    title = "Assignment basis";
    body = (
      <div className="uat-source-record">
        <dl>
          <div>
            <dt>Accountable holder</dt>
            <dd>
              {dialog.responsibility.holder?.displayName ??
                "No admitted assignment"}
            </dd>
          </div>
          <div>
            <dt>Operating record</dt>
            <dd>{dialog.responsibility.stateLabel}</dd>
          </div>
          <div>
            <dt>Effective date</dt>
            <dd>
              {dialog.responsibility.provenance[0]?.effective_date ??
                "Not available"}
            </dd>
          </div>
        </dl>
        <section>
          {dialog.responsibility.provenance.map((row) => (
            <article key={row.provenance_id}>
              <strong>{sourceSurfaceLabel(row.record_key)}</strong>
              <span>
                {row.admission_state === "projected_read_ready"
                  ? "Source surface admitted"
                  : row.withheld_reason ?? "Withheld pending admission"}
              </span>
            </article>
          ))}
        </section>
        <p>
          This record grants no authority to change the assignment.
        </p>
      </div>
    );
  } else {
    kicker = "Education & Formation";
    title = dialog.plan.learner_name;
    body = (
      <div className="uat-source-record">
        <dl>
          <div>
            <dt>Recommended formation</dt>
            <dd>{dialog.plan.recommended_track}</dd>
          </div>
          <div>
            <dt>Setting</dt>
            <dd>
              {dialog.plan.setting_entity ??
                sentenceCase(dialog.plan.setting_type)}
            </dd>
          </div>
          <div>
            <dt>Proposed provider</dt>
            <dd>{dialog.plan.primary_provider_name ?? "Not named"}</dd>
          </div>
          <div>
            <dt>Responsible party</dt>
            <dd>{dialog.plan.responsible_party_name ?? "Not named"}</dd>
          </div>
          <div>
            <dt>Review</dt>
            <dd>{dialog.plan.review_date ?? "No review date"}</dd>
          </div>
          <div>
            <dt>Plan state</dt>
            <dd>{educationPlanStateLabel(dialog.plan.contract_state)}</dd>
          </div>
          <div>
            <dt>Provider capacity</dt>
            <dd>
              {educationCapacityStateLabel(
                dialog.plan.capacity_availability_state,
              )}
            </dd>
          </div>
        </dl>
        <p>
          This is a starting plan. It does not establish an executed agreement
          or available provider capacity.
        </p>
      </div>
    );
  }

  return (
    <div className="uat-dialog-scrim" role="presentation">
      <section
        aria-labelledby="uat-dialog-title"
        aria-modal="true"
        className="uat-dialog"
        role="dialog"
      >
        <button
          autoFocus
          aria-label="Close record"
          className="uat-dialog-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <header>
          <small>{kicker}</small>
          <h2 id="uat-dialog-title">{title}</h2>
        </header>
        {body}
        <footer>
          <span>{footerLabel}</span>
          <button onClick={onClose} type="button">
            Return
          </button>
        </footer>
      </section>
    </div>
  );
}

function RouteBar({
  route,
  selectedManor,
  onCouncil,
  onDomain,
}: {
  route: CourtOsRoute;
  selectedManor: CourtOsSpatialManor | null;
  onCouncil: () => void;
  onDomain: (domain: CourtOsDomainKey) => void;
}) {
  const scene = sceneForRoute(route);
  const responsibilityKey =
    route.place.kind === "responsibility"
      ? route.place.responsibility
      : null;
  const domain =
    route.place.kind === "domain" || route.place.kind === "responsibility"
      ? courtOsDomain(route.place.domain)
      : null;
  const responsibility =
    responsibilityKey
      ? courtOsResponsibility(responsibilityKey)
      : null;
  const householdResponsibility =
    responsibilityKey
      ? HOUSEHOLD_RESPONSIBILITIES.find(
          (item) => item.designKey === responsibilityKey,
        ) ?? null
      : null;
  const manorStewardship =
    route.place.kind === "responsibility" &&
    route.place.responsibility === "manor_stewardship";
  return (
    <nav className="uat-route" aria-label="Current place">
      <span aria-hidden="true" />
      <button
        aria-current={scene === "council" ? "step" : undefined}
        onClick={onCouncil}
        type="button"
      >
        <i aria-hidden="true" />
        Council Room
      </button>
      {scene === "house_command" || scene === "council_docket" ? (
        <button aria-current="step" disabled type="button">
          <i aria-hidden="true" />
          {scene === "house_command" ? "House Command" : "Council Docket"}
        </button>
      ) : null}
      {domain ? (
        <button
          aria-current={route.place.kind === "domain" ? "step" : undefined}
          onClick={() => onDomain(domain.key)}
          type="button"
        >
          <i aria-hidden="true" />
          {domain.label}
        </button>
      ) : null}
      {responsibility && !manorStewardship ? (
        <button aria-current="step" disabled type="button">
          <i aria-hidden="true" />
          {householdResponsibility?.shortTitle ?? responsibility.shortLabel}
        </button>
      ) : null}
      {manorStewardship ? (
        <>
          <button aria-current={selectedManor ? undefined : "step"} disabled type="button">
            <i aria-hidden="true" />
            Manor Stewardship
          </button>
          {selectedManor ? (
            <button aria-current="step" disabled type="button">
              <i aria-hidden="true" />
              {selectedManor.display_name}
            </button>
          ) : null}
        </>
      ) : null}
    </nav>
  );
}

function DataState({
  state,
  detail,
  code,
  onRetry,
}: {
  state: "loading" | "error" | "blocked";
  detail?: string | null;
  code?: string | null;
  onRetry?: (() => void) | null;
}) {
  return (
    <main className="uat-app">
      <section className="uat-data-state" role={state === "error" ? "alert" : "status"}>
        <span aria-hidden="true" />
        <small>CourtOS</small>
        <h1>
          {state === "loading"
            ? "Opening the House record"
            : state === "blocked"
              ? "The House record needs more context"
              : "The House record could not be opened"}
        </h1>
        <p>
          {state === "loading"
            ? "Reading the selected House’s January 1120 CourtOS record."
            : detail ?? "No substitute record will be shown."}
        </p>
        {code ? <code>{code}</code> : null}
        {onRetry ? (
          <button onClick={onRetry} type="button">
            Try the record again
          </button>
        ) : null}
      </section>
    </main>
  );
}

function sceneArt(scene: Scene, houseId: string): string {
  if (scene === "council") return councilRoomArtForHouse(houseId);
  if (scene === "house_command" || scene === "council_docket") {
    return "/assets/council-command-room/command-surfaces/council-empty-table-plate.png";
  }
  if (scene === "manor_stewardship") {
    return "/assets/council-command-room/command-surfaces/manor-cutaway.png";
  }
  const domain = COURTOS_DOMAINS.find((item) => item.key === scene);
  if (domain) return domain.art;
  return (
    HOUSEHOLD_RESPONSIBILITIES.find((item) => item.key === scene)?.art ??
    HOUSEHOLD_SOLAR_ART
  );
}

export interface HouseholdVerticalSliceProps {
  /**
   * Injected from the admitted Journey + Knowledge read port.  Absence means
   * that no Journey claim is made; the shell never fabricates an empty runtime.
   */
  journeyCourtOsModel?: JourneyCourtOsReadModelV1 | null;
}

export function courtOsRouteForJourneyCommand(
  selection: JourneyCourtOsCommandSelectionV1,
): CourtOsRoute | null {
  const queryIndex = selection.owning_workspace_ref.indexOf("?");
  if (queryIndex < 0) return null;
  const target = courtOsRouteFromSearch(
    selection.owning_workspace_ref.slice(queryIndex),
  );
  if (target.place.kind === "responsibility") {
    const expectedOwner = `courtos.responsibility.${target.place.responsibility}`;
    return selection.command_owner_ref === expectedOwner ? target : null;
  }
  if (target.place.kind === "house_command") {
    return selection.command_owner_ref.startsWith("courtos.responsibility.")
      ? null
      : target;
  }
  return null;
}

function AuthorizedHouseholdVerticalSlice({
  journeyCourtOsModel = null,
}: HouseholdVerticalSliceProps = {}) {
  const [houseId] = useState(requestedHouseId);
  const [reloadKey, setReloadKey] = useState(0);
  const retrySources = () => setReloadKey((current) => current + 1);
  const courtOsState = useCourtOs1120Data({ houseId, reloadKey });
  const resolvedHouseId =
    courtOsState.status === "ready"
      ? courtOsState.data.selected_entity.protected_graph_entity_id
      : null;
  const householdState = useHousehold1120Data({
    householdEntityId:
      courtOsState.status === "ready"
        ? courtOsState.data.selected_entity.entity_id
        : null,
    houseId: resolvedHouseId,
    reloadKey,
  });
  const councilState = useCouncilRoom1120Data(resolvedHouseId ?? houseId, reloadKey);
  const spatialState = useCourtOsSpatialPortfolio(resolvedHouseId ?? houseId);
  const shellRuntime = useMemo(() => {
    if (courtOsState.status !== "ready" || councilState.status !== "ready") {
      return null;
    }
    try {
      return {
        data: buildCourtOsShellRuntimeModel({
          courtOs: courtOsState.data,
          council: councilState.data,
          sessionContext: courtOsState.context,
        }),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [councilState, courtOsState]);
  const householdRuntime = useMemo(() => {
    if (
      courtOsState.status !== "ready" ||
      householdState.status !== "ready" ||
      councilState.status !== "ready"
    ) {
      return null;
    }
    try {
      return {
        data: buildHouseholdUatRuntimeModel({
          courtOs: courtOsState.data,
          household: householdState.data,
          council: councilState.data,
          sessionContext: courtOsState.context,
        }),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [councilState, courtOsState, householdState]);

  const [route, setRoute] = useState<CourtOsRoute>(() =>
    typeof window === "undefined"
      ? COURTOS_INITIAL_ROUTE
      : courtOsRouteFromSearch(window.location.search),
  );
  const scene = sceneForRoute(route);
  const responsibilityPlace =
    route.place.kind === "responsibility" ? route.place : null;
  const [selectedManorId, setSelectedManorId] = useState<string | null>(() =>
    route.place.kind === "responsibility" &&
    route.place.responsibility === "manor_stewardship"
      ? route.place.scopeId
      : null,
  );
  const returnFocus = useRef<HTMLElement | null>(null);
  const detailPushedInSession = useRef(false);

  function navigate(next: CourtOsRoute, options?: { replace?: boolean }) {
    setRoute(next);
    if (typeof window === "undefined") return;
    const nextUrl = `${window.location.pathname}${courtOsSearchForRoute(
      window.location.search,
      next,
    )}${window.location.hash}`;
    if (options?.replace) {
      window.history.replaceState({}, "", nextUrl);
    } else {
      window.history.pushState({}, "", nextUrl);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function navigateScene(next: Scene, options?: { replace?: boolean }) {
    if (next === "council") {
      navigate(COURTOS_INITIAL_ROUTE, options);
      return;
    }
    if (next === "house_command" || next === "council_docket") {
      navigate({ place: { kind: next }, detail: null }, options);
      return;
    }
    if (next === "manor_stewardship") {
      navigate(
        courtOsResponsibilityRoute({
          responsibility: "manor_stewardship",
          scopeId: selectedManorId,
        }),
        options,
      );
      return;
    }
    const householdResponsibility = HOUSEHOLD_RESPONSIBILITIES.find(
      (responsibility) => responsibility.key === next,
    );
    if (householdResponsibility) {
      navigate(
        courtOsResponsibilityRoute({
          responsibility: householdResponsibility.designKey,
        }),
        options,
      );
      return;
    }
    navigate(courtOsDomainRoute(next as CourtOsDomainKey), options);
  }

  function openJourneyOwningWorkspace(
    selection: JourneyCourtOsCommandSelectionV1,
  ) {
    const target = courtOsRouteForJourneyCommand(selection);
    if (target) navigate(target);
  }

  useEffect(() => {
    const canonicalSearch = courtOsSearchForRoute(
      window.location.search,
      courtOsRouteFromSearch(window.location.search),
    );
    if (canonicalSearch !== window.location.search) {
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${canonicalSearch}${window.location.hash}`,
      );
    }
    const onPopState = () => {
      detailPushedInSession.current = false;
      setRoute(courtOsRouteFromSearch(window.location.search));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (
      route.place.kind === "responsibility" &&
      route.place.responsibility === "manor_stewardship"
    ) {
      setSelectedManorId(route.place.scopeId);
    }
  }, [route.place]);

  const dialog = useMemo<DialogState>(() => {
    if (!route.detail || !shellRuntime?.data) {
      return null;
    }
    const detail = route.detail;
    const place = route.place;
    if (detail.kind === "council_person") {
      const person = shellRuntime.data.council.find(
        (candidate) =>
          candidate.person_ref.entity_id === detail.personId,
      );
      return person ? { kind: "council_person", person } : null;
    }
    if (
      detail.kind === "assignment_basis" &&
      place.kind === "responsibility" &&
      householdRuntime?.data
    ) {
      const responsibility = householdRuntime.data.responsibilities.find(
        (candidate) =>
          candidate.definition.designKey === place.responsibility,
      );
      return responsibility ? { kind: "assignment", responsibility } : null;
    }
    if (
      detail.kind === "education_plan" &&
      householdState.status === "ready"
    ) {
      const plan = householdState.data.education_plans.find(
        (candidate) =>
          candidate.education_assignment_id === detail.recordId,
      );
      return plan ? { kind: "education_plan", plan } : null;
    }
    return null;
  }, [householdRuntime, householdState, route, shellRuntime]);

  function openDialog(next: Exclude<DialogState, null>) {
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let detail: CourtOsDetail;
    if (next.kind === "council_person") {
      detail = {
        kind: "council_person",
        personId: next.person.person_ref.entity_id,
      };
    } else if (next.kind === "assignment") {
      detail = { kind: "assignment_basis" };
    } else {
      detail = {
        kind: "education_plan",
        recordId: next.plan.education_assignment_id,
      };
    }
    detailPushedInSession.current = true;
    navigate({ ...route, detail });
  }

  function closeDialog() {
    if (detailPushedInSession.current && window.history.length > 1) {
      detailPushedInSession.current = false;
      window.history.back();
      return;
    }
    navigate(courtOsRouteWithoutDetail(route), { replace: true });
  }

  useEffect(() => {
    if (route.detail) return;
    window.requestAnimationFrame(() => returnFocus.current?.focus());
  }, [route.detail]);

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog]);

  if (courtOsState.status === "error") {
    return (
      <DataState
        code={courtOsState.error.code}
        detail="The CourtOS read contract is unavailable. No substitute record will be shown."
        onRetry={retrySources}
        state="error"
      />
    );
  }
  if (councilState.status === "error") {
    return (
      <DataState
        code={councilState.error.code}
        detail="The Council source projection is unavailable. No substitute Council will be shown."
        onRetry={retrySources}
        state="error"
      />
    );
  }
  if (councilState.status === "blocked") {
    return <DataState code={councilState.error.code} detail={councilState.error.message} state="blocked" />;
  }
  if (shellRuntime?.error) {
    return (
      <DataState
        code="COURTOS_SHELL_SOURCE_MISMATCH"
        detail="The House and Council records could not be reconciled. No mixed record will be shown."
        onRetry={retrySources}
        state="error"
      />
    );
  }
  if (
    courtOsState.status !== "ready" ||
    councilState.status !== "ready" ||
    !shellRuntime?.data
  ) {
    return <DataState state="loading" />;
  }

  const householdRoute =
    route.place.kind === "domain"
      ? route.place.domain === "household"
      : responsibilityPlace
        ? HOUSEHOLD_RESPONSIBILITIES.some(
            (responsibility) =>
              responsibility.designKey === responsibilityPlace.responsibility,
          )
        : false;
  if (householdRoute && householdState.status === "error") {
    return (
      <DataState
        code={householdState.error.code}
        detail="The Household read contract is unavailable. No substitute Household will be shown."
        onRetry={retrySources}
        state="error"
      />
    );
  }
  if (householdRoute && householdState.status === "blocked") {
    return <DataState code={householdState.error.code} detail={householdState.error.message} state="blocked" />;
  }
  if (householdRoute && householdRuntime?.error) {
    return (
      <DataState
        code="HOUSEHOLD_SOURCE_MISMATCH"
        detail="The Household sources could not be reconciled. No mixed record will be shown."
        onRetry={retrySources}
        state="error"
      />
    );
  }
  if (
    householdRoute &&
    (householdState.status !== "ready" || !householdRuntime?.data)
  ) {
    return <DataState state="loading" />;
  }

  const model = shellRuntime.data;
  const householdModel = householdRuntime?.data ?? null;
  const projection =
    householdState.status === "ready" ? householdState.data : null;
  const background = sceneArt(scene, model.house.houseId);
  const selectedManor =
    spatialState.status === "ready"
      ? spatialState.portfolio?.manors.find((manor) => manor.manor_id === selectedManorId) ??
        spatialState.portfolio?.manors[0] ??
        null
      : null;

  return (
    <main className="uat-app" data-dialog-open={Boolean(dialog)}>
      <AppHeader model={model} route={route} />
      <div
        className="uat-venue"
        data-scene={scene}
        key={`${model.house.houseId}:${scene}`}
        style={{ backgroundImage: `url("${background}")` }}
      >
        {scene === "council" ? (
          <CouncilScene
            model={model}
            onEnterDomain={(domain) => navigateScene(domain)}
            onOpenCouncilDocket={() => navigateScene("council_docket")}
            onOpenHouseCommand={() => navigateScene("house_command")}
            onOpenPerson={(person) =>
              openDialog({ kind: "council_person", person })
            }
          />
        ) : null}
        {scene === "house_command" || scene === "council_docket" ? (
          <ReservedCourtOsSurface
            journeyContext={
              scene === "house_command" && journeyCourtOsModel ? (
                <JourneyHouseCommandContext
                  model={journeyCourtOsModel}
                  onDomainCommand={openJourneyOwningWorkspace}
                />
              ) : null
            }
            scene={scene}
          />
        ) : null}
        {scene === "household" ? (
          householdModel ? <HouseholdScene
            model={householdModel}
            onOpenResponsibility={(key) => navigateScene(key)}
          /> : null
        ) : null}
        {scene === "estate_holdings" || scene === "manor_stewardship" ? (
          <EstateHoldingsScene
            mode={scene === "manor_stewardship" ? "manor_stewardship" : "room"}
            model={model}
            onOpenManorStewardship={(manor) => {
              setSelectedManorId(manor.manor_id);
              navigate(
                courtOsResponsibilityRoute({
                  responsibility: "manor_stewardship",
                  scopeId: manor.manor_id,
                }),
              );
            }}
            onReturnToEstate={() => navigateScene("estate_holdings")}
            onSelectedManorChange={(manorId) => {
              setSelectedManorId(manorId);
              if (
                route.place.kind === "responsibility" &&
                route.place.responsibility === "manor_stewardship"
              ) {
                navigate(
                  courtOsResponsibilityRoute({
                    responsibility: "manor_stewardship",
                    scopeId: manorId,
                  }),
                  { replace: true },
                );
              }
            }}
            selectedManorId={selectedManorId}
            spatialState={spatialState}
            journeyContext={
              scene === "manor_stewardship" && journeyCourtOsModel ? (
                <JourneyResponsibilityContext
                  model={journeyCourtOsModel}
                  onDomainCommand={openJourneyOwningWorkspace}
                  responsibility="manor_stewardship"
                  scopeId={selectedManor?.manor_id ?? null}
                />
              ) : null
            }
          />
        ) : null}
        {route.place.kind === "domain" &&
        route.place.domain !== "household" &&
        route.place.domain !== "estate_holdings" ? (
          <DomainRoomScene
            domain={courtOsDomain(route.place.domain)}
            houseId={model.house.houseId}
            houseName={model.house.displayName}
            onOpenResponsibility={(responsibility) =>
              navigate(courtOsResponsibilityRoute({ responsibility }))
            }
          />
        ) : null}
        {responsibilityPlace &&
        responsibilityPlace.responsibility !== "manor_stewardship" &&
        !HOUSEHOLD_RESPONSIBILITIES.some(
          (responsibility) =>
            responsibility.designKey === responsibilityPlace.responsibility,
        ) ? (
          <UnavailableResponsibilityScene
            domain={courtOsDomain(responsibilityPlace.domain)}
            houseId={model.house.houseId}
            houseName={model.house.displayName}
            journeyContext={
              journeyCourtOsModel ? (
                <JourneyResponsibilityContext
                  model={journeyCourtOsModel}
                  onDomainCommand={openJourneyOwningWorkspace}
                  responsibility={responsibilityPlace.responsibility}
                  scopeId={responsibilityPlace.scopeId}
                />
              ) : null
            }
            onSelect={(responsibility) =>
              navigate(courtOsResponsibilityRoute({ responsibility }))
            }
            responsibilityKey={responsibilityPlace.responsibility}
          />
        ) : null}
        {scene === "stores" || scene === "adult_kin" || scene === "education" || scene === "service_care" ? (
          householdModel && projection ? <ResponsibilityScene
            model={householdModel}
            onInspectAssignment={(responsibility) =>
              openDialog({ kind: "assignment", responsibility })
            }
            onOpenPlan={(plan) =>
              openDialog({ kind: "education_plan", plan })
            }
            onSelect={(key) => navigateScene(key)}
            projection={projection}
            selected={scene}
            journeyContext={
              journeyCourtOsModel && responsibilityPlace ? (
                <JourneyResponsibilityContext
                  model={journeyCourtOsModel}
                  onDomainCommand={openJourneyOwningWorkspace}
                  responsibility={responsibilityPlace.responsibility}
                  scopeId={responsibilityPlace.scopeId}
                />
              ) : null
            }
          /> : null
        ) : null}
      </div>
      <RouteBar
        onCouncil={() => {
          navigateScene("council");
        }}
        onDomain={(domain) => {
          navigateScene(domain);
        }}
        route={route}
        selectedManor={selectedManor}
      />
      <span className="uat-source-stamp">
        As of {model.effectiveDate} · {model.councilSource.label}
      </span>
      {dialog ? (
        <RecordDialog
          councilSource={model.councilSource}
          dialog={dialog}
          onClose={closeDialog}
        />
      ) : null}
    </main>
  );
}

export function HouseholdVerticalSlice(
  props: HouseholdVerticalSliceProps = {},
) {
  const selectedHouseId = requestedHouseId();
  if (
    selectedHouseId &&
    selectedHouseId !== COURTOS_PLAYER_CONTEXT.house_id
  ) {
    return (
      <DataState
        code="COURTOS_HOUSE_ACCESS_DENIED"
        detail="This player runtime can open only its configured House. No operational record has been requested."
        state="blocked"
      />
    );
  }
  return <AuthorizedHouseholdVerticalSlice {...props} />;
}
