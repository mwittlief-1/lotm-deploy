import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  type CouncilRoomParticipantV1,
  type CouncilRoomReadyProjectionV1,
} from "../../ready/councilRoomReadyProjection";
import type { CourtOsSessionContextV1 } from "../../courtosSessionContext";
import { useCouncilRoom1120Data } from "../councilRoom1120Client";
import { useCourtOs1120Data } from "../courtOs1120Client";
import {
  COURTOS_DOMAINS,
  COURTOS_RESPONSIBILITIES,
  courtOsDomain,
  courtOsResponsibility,
  type CourtOsDomainDefinition,
  type CourtOsDomainKey,
  type CourtOsResponsibilityDefinition,
  type CourtOsResponsibilityDesignKey,
} from "../courtosInformationArchitecture";
import { responsibilityWorkspaceSource } from "../responsibilityWorkspaceCatalog";
import {
  buildCourtOsResponsibilityBrief,
  courtOsResponsibilityWorkspacePostureForHouse,
} from "../responsibilityBriefPresentation";
import { CourtOsResponsibilityHeadsBrief } from "../responsibilityHeadsBrief";
import { compileCourtScribeResponsibilityBriefPacketOrNull } from "../scribe/courtScribeResponsibilityBrief";
import {
  CourtOsResponsibilityHousePapers,
  type CourtOsResponsibilityPaperSelectionV1,
} from "../responsibilityHousePapers";
import { buildCourtOsEducationCyclePresentation } from "../educationBriefPresentation";
import {
  resolveCourtOsResponsibilityPresentation,
  resolveCourtOsRoomPresentation,
} from "../courtosRoomPresentation";
import {
  useResponsibilityWorkspace,
  type ResponsibilityWorkspaceLoadState,
} from "../responsibilityWorkspaceClient";
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
  COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT,
  gateHouseCommandProjectionConsumption,
} from "../../courtosProductCheckpoint";
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
import { CourtOsStewardshipPlanner } from "./CourtOsStewardshipPlanner";
import { courtOsPlayerPlanningStorage } from "../courtosPlayerPlanningStorage";
import { threeYearStewardshipHorizonFrom } from "../courtosStewardshipPlan";
import {
  buildCourtOsStewardshipPlanningProjection,
  courtOsStewardshipScopeKey,
  type CourtOsStewardshipWorkspaceAssignmentInputV1,
} from "../courtosStewardshipPlanningProjection";
import { FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION } from "../courtosResponsibilityAuthoritySource";
import {
  courtOsAssignmentScopeForReview,
  courtOsAssignmentScopes,
  courtOsWorkspaceAssignmentScopes,
  type CourtOsWorkspaceAssignmentRowV1,
} from "../courtosResponsibilityAssignment";
import type { JourneyCourtOsReadModelV1 } from "../readModels/phaseFive/journeyCourtOsReadModel";
import type {
  Household1120EducationLearnerPlanRow,
  Household1120AdultKinRosterRow,
  Household1120HealthRosterRow,
  Household1120MembershipRow,
  Household1120ReadOnlyProjection,
  Household1120ResponsibilityRow,
  Household1120StoresPositionRow,
} from "../readModels/household1120/types";
import {
  type CourtOsSpatialManor,
  useCourtOsSpatialPortfolio,
} from "../spatial/courtosSpatialClient";
import {
  compileCourtScribeFiscalBriefRequest,
  localCourtScribeAdapterForRuntime,
  resolveCourtScribeFiscalBrief,
  type CourtScribeFiscalBriefResultV1,
} from "../scribe/courtScribeFiscalBrief";
import "./householdVerticalSlice.css";

// Estate & Holdings carries the Three renderer and its map composition graph.
// Keep that entire graph out of the Council/room boot path: it is only useful
// after the player has deliberately entered an estate or manor place.
const EstateHoldingsScene = React.lazy(async () => {
  const module = await import("../spatial/ManorOperationsScene");
  return { default: module.EstateHoldingsScene };
});

type Scene =
  | "council"
  | "house_command"
  | "council_docket"
  | "manor_stewardship"
  | CourtOsDomainKey
  | HouseholdResponsibilityKey;
type AssignmentPlanningSubject = {
  designKey: CourtOsResponsibilityDesignKey;
  title: string;
  holder: { personId: string; displayName: string } | null;
  stateLabel: string;
  scopeId?: string;
  scopeLabel?: string;
  provenance?: HouseholdResponsibilityRuntime["provenance"];
  workspaceAssignments?: readonly CourtOsStewardshipWorkspaceAssignmentInputV1[];
};
type DialogState =
  | { kind: "council_person"; person: CouncilRoomParticipantV1 }
  | { kind: "assignment"; responsibility: AssignmentPlanningSubject }
  | { kind: "education_plan"; plan: Household1120EducationLearnerPlanRow }
  | { kind: "stores_position"; position: Household1120StoresPositionRow }
  | { kind: "adult_kin_subject"; subject: Household1120AdultKinRosterRow }
  | { kind: "health_record"; record: Household1120HealthRosterRow }
  | {
      kind: "workspace_record";
      recordId: string;
      responsibilityLabel: string;
      title: string;
      sourcePackage: string;
      state: string;
      summary: string;
      evidence: readonly { field: string; value: string }[];
    }
  | null;

function stewardshipWorkspaceAssignments(
  responsibility: CourtOsResponsibilityDesignKey,
  state: ResponsibilityWorkspaceLoadState,
): readonly CourtOsStewardshipWorkspaceAssignmentInputV1[] {
  if (
    state.status !== "ready" ||
    state.data.source_binding.source_owned !== true ||
    !state.data.source_binding.source_digest
  ) return [];
  return state.data.rows.map((row) => ({
    responsibility_id: responsibility,
    source_record_id: [
      state.data.source_binding.package_id,
      state.data.source_binding.source_digest ?? "digest-withheld",
      row.source_table,
      row.scope_id ?? row.subject_id ?? "scope-withheld",
      row.accountable_person_id ?? "holder-withheld",
    ].join("::"),
    row,
  }));
}

function manorStewardshipAuthority(
  manor: CourtOsSpatialManor,
  authority: readonly Household1120ResponsibilityRow[],
): Household1120ResponsibilityRow | null {
  return authority.find(
    (row) =>
      row.source_legacy_responsibility_id === "courtos.responsibility.manor_stewardship" &&
      (row.manor_id === manor.manor_id || row.authority_scope_id === manor.manor_id),
  ) ?? null;
}

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
  if (value === "active_uat_formation_arrangement") {
    return "Active formation arrangement";
  }
  return sentenceCase(value);
}

function educationCapacityStateLabel(value: string): string {
  if (value === "unavailable_not_a_market_or_live_capacity_surface") {
    return "Provider capacity not established";
  }
  if (value === "provider_capacity_not_modeled_in_uat") {
    return "Provider capacity not established in the opening record";
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
    ro_education_cycle_report_uat1_v1: "Education cycle reports",
    ro_household_education_cycle_report_v1: "Education cycle reports",
    ro_health_roster_v1: "Health and care roster",
    ro_health_cycle_report_v1: "Health cycle reports",
    ro_care_arrangement_v1: "Care arrangements",
  };
  return labels[value] ?? "Household record";
}

function playerFacingRecordText(value: string): string {
  return value
    .replace(/\bUAT1\b/g, "the opening planning cycle")
    .replace(/\bprovisional\b/gi, "opening-cycle")
    .replace(/\badmitted\b/gi, (word) => word[0] === "A" ? "Recorded" : "recorded")
    .replace(/\bcandidate\b/gi, (word) => word[0] === "C" ? "Unconfirmed" : "unconfirmed")
    .replace(/\bruntime\b/gi, (word) => word[0] === "R" ? "Turn" : "turn")
    .replace(/\binferred\b/gi, "assumed")
    .replace(/\binference\b/gi, "assumption");
}

function sourceRegisterLabel(value: string): string {
  if (value.includes("resources_finance")) return "House fiscal record";
  if (value.includes("household")) return "Household opening record";
  if (value.includes("manor_operations")) return "Manor operations record";
  if (value.includes("estate_governance")) return "Estate governance record";
  if (value.includes("marriage_dynasty")) return "Dynasty and kinship record";
  if (value.includes("records_correspondence")) return "Records and correspondence register";
  if (value.includes("security_readiness")) return "Security and readiness register";
  if (value.includes("church_observance")) return "Church and observance register";
  if (value.includes("information_governance")) return "House information register";
  return "Opening House record";
}

function playerFacingEvidenceReference(reference: { field: string; value: string }): {
  label: string;
  value: string;
} {
  if (reference.field === "binding_basis") {
    return { label: "Identity match", value: "Verified House and manor association" };
  }
  if (reference.field === "source_scope") {
    return { label: "Record family", value: "House tenure and manor scope" };
  }
  if (reference.field === "source_truth_status") {
    return { label: "Authority basis", value: "Recorded opening accountability" };
  }
  if (reference.field === "source_candidate_only") {
    return { label: "Planning use", value: "Opening planning record only" };
  }
  return {
    label: playerFacingRecordText(sentenceCase(reference.field)),
    value: playerFacingRecordText(sentenceCase(reference.value)),
  };
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
      <div aria-atomic="true" aria-live="polite" className="uat-header-place">
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
        <span title={`${model.player.label} · ${model.authority.label}`}>
          {model.authority.actor
            ? `${model.authority.actor.display_name} · Head of House`
            : model.authority.label}
        </span>
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
      <button
        className="uat-council-command-object"
        onClick={onOpenHouseCommand}
        type="button"
      >
        <strong>House Command</strong>
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
            data-room-tone={domain.visualTone}
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

function RoomResponsibilityMarker({
  anchor,
  detail,
  fixture,
  holder,
  index,
  onOpen,
  state,
  stateLabel,
  title,
}: {
  anchor?: string;
  detail: string;
  fixture?: string;
  holder: { personId: string; displayName: string } | null;
  index: number;
  onOpen: () => void;
  state: "ready" | "conditional" | "withheld";
  stateLabel: string;
  title: string;
}) {
  const portrait = holder
    ? portraitArtForPerson({
        personId: holder.personId,
        label: holder.displayName,
      })
    : null;
  return (
    <button
      className="uat-responsibility-marker"
      data-index={index}
      data-room-anchor={anchor}
      data-room-fixture={fixture}
      data-state={state}
      onClick={onOpen}
      type="button"
    >
      {portrait ? (
        <span className="uat-responsibility-portrait">
          <img src={portrait.src} alt={portrait.alt} />
        </span>
      ) : holder ? (
        <span className="uat-responsibility-portrait">
          <MissingPortrait label={holder.displayName} />
        </span>
      ) : (
        <span className="uat-responsibility-number" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
      <span className="uat-responsibility-plaque">
        <small>{stateLabel}</small>
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
    </button>
  );
}

function ResponsibilityMarker({
  anchor,
  fixture,
  responsibility,
  index,
  onOpen,
}: {
  anchor?: string;
  fixture?: string;
  responsibility: HouseholdResponsibilityRuntime;
  index: number;
  onOpen: () => void;
}) {
  return (
    <RoomResponsibilityMarker
      anchor={anchor}
      detail={responsibility.holder?.displayName ?? "No recorded assignment"}
      holder={responsibility.holder}
      fixture={fixture}
      index={index}
      onOpen={onOpen}
      state={
        responsibility.state === "current" || responsibility.state === "partial"
          ? "ready"
          : "withheld"
      }
      stateLabel={responsibility.stateLabel}
      title={responsibility.definition.shortTitle}
    />
  );
}

function HouseholdScene({
  model,
  onOpenResponsibility,
}: {
  model: HouseholdUatRuntimeModel;
  onOpenResponsibility: (key: HouseholdResponsibilityKey) => void;
}) {
  const presentation = resolveCourtOsRoomPresentation("household");
  return (
    <section
      className="uat-scene uat-household-scene"
      aria-label="The Household Solar"
      data-room-flow="place_responsibility"
      data-room-composition={presentation.posture === "available" ? presentation.variant.composition : "withheld"}
      data-room-presentation={presentation.posture === "available" ? presentation.variant.key : "withheld"}
      data-room-title-anchor={presentation.posture === "available" ? presentation.variant.titleAnchor ?? "top_center" : "top_center"}
      data-station-count={model.responsibilities.length}
    >
      <div className="uat-room-introduction">
        <small>Household</small>
        <h2>The work of maintaining the House</h2>
        <p>
          Choose a responsibility to enter its working place and inspect the
          recorded opening state.
        </p>
      </div>
      {model.responsibilities.map((responsibility, index) => (
        (() => {
          const setting = presentation.posture === "available"
            ? presentation.variant.settings.find((candidate) => candidate.responsibility === responsibility.definition.designKey)
            : null;
          return (
            <ResponsibilityMarker
              anchor={setting?.anchor}
              fixture={setting?.fixture}
              index={index}
              key={responsibility.definition.key}
              onOpen={() => onOpenResponsibility(responsibility.definition.key)}
              responsibility={responsibility}
            />
          );
        })()
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
  authority,
  onOpenResponsibility,
}: {
  domain: CourtOsDomainDefinition;
  houseId: string;
  houseName: string;
  authority: readonly Household1120ResponsibilityRow[];
  onOpenResponsibility: (responsibility: CourtOsResponsibilityDesignKey) => void;
}) {
  const presentation = resolveCourtOsRoomPresentation(domain.key);
  return (
    <section
      className="uat-scene uat-domain-scene"
      aria-label={domain.venue}
      data-room-flow={domain.interactionPattern}
      data-room-composition={presentation.posture === "available" ? presentation.variant.composition : "withheld"}
      data-room-presentation={presentation.posture === "available" ? presentation.variant.key : "withheld"}
      data-room-title-anchor={presentation.posture === "available" ? presentation.variant.titleAnchor ?? "top_center" : "top_center"}
      data-room-tone={domain.visualTone}
      data-station-count={domain.responsibilities.length}
    >
      <header className="uat-room-introduction">
        <small>{domain.label}</small>
        <h2>{domain.objectDetail}</h2>
        <p>{domain.purpose}</p>
      </header>
      {domain.responsibilities.map((responsibility, index) => {
        const setting = presentation.posture === "available"
          ? presentation.variant.settings.find((candidate) => candidate.responsibility === responsibility.key)
          : null;
        const rows = authority.filter(
          (row) =>
            row.source_legacy_responsibility_id ===
            `courtos.responsibility.${responsibility.key}`,
        );
        const holderRows = [...new Map(
          rows
            .filter((row) => row.holder_person_id && row.holder_display_name)
            .map((row) => [row.holder_person_id, row]),
        ).values()];
        const soleHolder = holderRows.length === 1 ? holderRows[0] : null;
        const source = responsibilityWorkspaceSource(responsibility.key);
        const state = source.posture === "read_ready"
          ? "ready"
          : source.posture === "conditional_empty"
            ? "conditional"
            : "withheld";
        return (
          <RoomResponsibilityMarker
            anchor={setting?.anchor}
            detail={
              holderRows.length === 1
                ? soleHolder?.holder_display_name ?? "Open the recorded responsibility"
                : holderRows.length > 1
                  ? `${holderRows.length} accountable holders`
                  : "No recorded assignment"
            }
            holder={
              soleHolder?.holder_person_id && soleHolder.holder_display_name
                ? {
                    personId: soleHolder.holder_person_id,
                    displayName: soleHolder.holder_display_name,
                  }
                : null
            }
            fixture={setting?.fixture}
            index={index}
            key={responsibility.key}
            onOpen={() => onOpenResponsibility(responsibility.key)}
            state={state}
            stateLabel={
              state === "ready"
                ? "Account ready"
                : state === "conditional"
                  ? "No current charge"
                  : "No verified charge"
            }
            title={responsibility.shortLabel}
          />
        );
      })}
    </section>
  );
}

function financeHousePositions(
  projection: Household1120ReadOnlyProjection,
): readonly Household1120StoresPositionRow[] {
  const explicitlyHouseScoped = projection.stores_positions.filter(
    (position) => position.position_kind === "house_position",
  );
  if (explicitlyHouseScoped.length > 0) return explicitlyHouseScoped;
  return projection.stores_positions.filter(
    (position) =>
      !position.manor_id && position.position_kind !== "food_capacity",
  );
}

/**
 * The visible first Scribe treatment is deliberately a one-way fiscal brief.
 * It uses the local adapter seam, but is still complete if the local host is
 * absent, disabled, slow, or rejected by the deterministic validator.
 */
function HouseFiscalScribeBrief({
  onOpenHousePapers,
  projection,
  sessionContext,
}: {
  onOpenHousePapers: () => void;
  projection: Household1120ReadOnlyProjection;
  sessionContext: CourtOsSessionContextV1;
}) {
  const request = useMemo(() => {
    try {
      return compileCourtScribeFiscalBriefRequest({
        projection,
        session: sessionContext,
      });
    } catch {
      return null;
    }
  }, [projection, sessionContext]);
  const [brief, setBrief] = useState<CourtScribeFiscalBriefResultV1 | null>(null);

  useEffect(() => {
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    if (!request) {
      setBrief(null);
      return () => {
        active = false;
      };
    }
    setBrief(null);
    const readBrief = (retry: boolean) => {
      void resolveCourtScribeFiscalBrief({
        request,
        adapter: localCourtScribeAdapterForRuntime(),
      }).then((next) => {
        if (!active) return;
        setBrief(next);
        // The first call never blocks the room for a cold local model. It
        // shows the same fact-bound fallback, then makes one quiet retry once
        // the resident Scribe has finished its background warm-up.
        if (next.mode === "fallback" && !retry) {
          retryTimer = setTimeout(() => readBrief(true), 1_500);
        }
      });
    };
    readBrief(false);
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [request]);

  if (!brief) return null;
  return (
    <section
      className="uat-fiscal-scribe-brief"
      data-scribe-delivery={brief.mode}
      aria-label="House Fiscal brief"
    >
      <div>
        <small>House Fiscal Brief</small>
        <strong>The account at a glance</strong>
      </div>
      <p>{brief.prose}</p>
      <button onClick={onOpenHousePapers} type="button">Open account papers</button>
    </section>
  );
}

function ResponsibilityAssignmentPlanning({
  authorityRows,
  workspaceRows = [],
  workspaceAssignments = [],
  council,
  planningAvailable,
  projection,
  responsibilityKey,
  routeScopeId,
  sourceGenerationId,
  sessionContext,
  onScopeChange,
  onOpenAssignment,
}: {
  authorityRows: readonly Household1120ResponsibilityRow[];
  workspaceRows?: readonly CourtOsWorkspaceAssignmentRowV1[];
  workspaceAssignments?: readonly CourtOsStewardshipWorkspaceAssignmentInputV1[];
  council: CouncilRoomReadyProjectionV1;
  planningAvailable: boolean;
  projection: Household1120ReadOnlyProjection;
  responsibilityKey: CourtOsResponsibilityDesignKey;
  routeScopeId: string | null;
  sourceGenerationId: string | null;
  sessionContext: CourtOsSessionContextV1;
  onScopeChange: (scopeId: string) => void;
  onOpenAssignment?: (subject: AssignmentPlanningSubject) => void;
}) {
  const exactWorkspaceScopes = courtOsWorkspaceAssignmentScopes(workspaceRows);
  const scopes = authorityRows.length > 0
    ? courtOsAssignmentScopes(authorityRows)
    : exactWorkspaceScopes.length > 0
      ? exactWorkspaceScopes
      : [];
  const scopeKey = (scopeId: string | null) => scopeId ?? "__responsibility__";
  const scopeSignature = scopes.map((scope) => scopeKey(scope.scope_id)).join("|");
  const [selectedScopeId, setSelectedScopeId] = useState(() =>
    routeScopeId ?? scopeKey(scopes[0]?.scope_id ?? null),
  );
  useEffect(() => {
    const requested = routeScopeId && scopes.some((scope) => scope.scope_id === routeScopeId)
      ? routeScopeId
      : scopeKey(scopes[0]?.scope_id ?? null);
    setSelectedScopeId(requested);
  }, [routeScopeId, scopeSignature]);
  const selected = scopes.find((scope) => scopeKey(scope.scope_id) === selectedScopeId) ?? scopes[0];
  if (!selected) return null;
  if (onOpenAssignment && scopes.length <= 1) return null;
  const scopeId = selected.scope_id;
  const scopeLabel = selected.scope_label;
  return (
    <section className="uat-finance-assignment uat-responsibility-assignment" aria-label="Stewardship scope choices">
      {scopes.length > 1 ? (
        <nav aria-label="Choose the charge to review">
          {scopes.map((scope) => {
            const id = scopeKey(scope.scope_id);
            return (
              <button
                aria-current={id === selectedScopeId ? "true" : undefined}
                key={id}
                onClick={() => {
                  setSelectedScopeId(id);
                  if (scope.scope_id) onScopeChange(scope.scope_id);
                }}
                type="button"
              >
                {scope.scope_label}
              </button>
            );
          })}
        </nav>
      ) : null}
      {!onOpenAssignment ? (
        <AssignmentDraftEditor
          council={council}
          planningAvailable={planningAvailable}
          projection={projection}
          sourceGenerationId={sourceGenerationId}
          responsibility={{
            designKey: responsibilityKey,
            holder: selected.holder_person_id && selected.holder_display_name
              ? { personId: selected.holder_person_id, displayName: selected.holder_display_name }
              : null,
            scopeId: scopeId ?? undefined,
            scopeLabel,
            workspaceAssignments,
          }}
          sessionContext={sessionContext}
        />
      ) : null}
    </section>
  );
}

function FinanceWorkspaceSurface({
  authorityRows,
  council,
  onScopeChange,
  projection,
  responsibilityKey,
  routeScopeId,
  sessionContext,
  sourcePosture,
  sourceGenerationId,
  onOpenAssignment,
  onOpenHousePapers,
}: {
  authorityRows: readonly Household1120ResponsibilityRow[];
  council: CouncilRoomReadyProjectionV1;
  onScopeChange: (scopeId: string) => void;
  projection: Household1120ReadOnlyProjection;
  responsibilityKey: CourtOsResponsibilityDesignKey;
  routeScopeId: string | null;
  sessionContext: CourtOsSessionContextV1;
  sourcePosture: "read_ready" | "conditional_empty" | "withheld_fail_closed";
  sourceGenerationId: string | null;
  onOpenAssignment?: (subject: AssignmentPlanningSubject) => void;
  onOpenHousePapers: () => void;
}) {
  const housePositions = financeHousePositions(projection);
  const activityYears = [1117, 1118, 1119].map((year) => ({
    year,
    rows: projection.economic_activity_lookback.filter((row) => row.activity_year === year),
  }));
  const manorRows = authorityRows.filter((row) => row.manor_id);
  return (
    <section className="uat-finance-workbook" data-finance-responsibility={responsibilityKey}>
      {responsibilityKey === "house_fiscal_administration" ? (
        <>
          <header><small>Opening House position</small><strong>Resources under fiscal review</strong></header>
          <HouseFiscalScribeBrief
            onOpenHousePapers={onOpenHousePapers}
            projection={projection}
            sessionContext={sessionContext}
          />
          <div className="uat-finance-position-grid">
            {housePositions.map((position) => (
              <article key={position.stores_position_id}>
                <small>{sentenceCase(position.resource_id)}</small>
                <strong>{position.quantity_integer?.toLocaleString() ?? "Not disclosed"}</strong>
                <span>{position.availability_posture === "available" ? "Available for three-year planning" : sentenceCase(position.position_state)}</span>
              </article>
            ))}
          </div>
          <div className="uat-finance-cycle-strip" aria-label="1117 to 1119 economic evidence">
            {activityYears.map(({ year, rows }) => (
              <article key={year}>
                <strong>{year}</strong>
                <span>{rows.length} regular evidence legs</span>
                <small>{new Set(rows.map((row) => row.flow_family)).size} flow families</small>
              </article>
            ))}
          </div>
        </>
      ) : responsibilityKey === "manor_fiscal_administration" ? (
        <>
          <header><small>Manor account custody</small><strong>Separate books; separate accountability</strong></header>
          <div className="uat-finance-manor-books">
            {manorRows.map((row) => {
              const positions = projection.stores_positions.filter(
                (position) => position.manor_id === row.manor_id,
              );
              return (
                <article key={row.authority_scope_id ?? row.responsibility_summary_id}>
                  <div><small>{row.authority_scope_label ?? row.demand_entity_label ?? row.manor_id}</small><strong>{row.holder_display_name ?? "No recorded fiscal manager"}</strong></div>
                  <span>{positions.length} recorded custody or capacity entries</span>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="uat-finance-empty-rights" role="note">
          <small>Exact-right rule</small>
          <strong>No current revenue right is recorded for this House.</strong>
          <p>Unconfirmed rights remain evidence only. CourtOS will not turn a facility, custom, or historical possibility into a collectible right.</p>
        </div>
      )}
      {sourcePosture === "read_ready" ? (
        <ResponsibilityAssignmentPlanning
          authorityRows={authorityRows}
          council={council}
          onScopeChange={onScopeChange}
          planningAvailable={Boolean(sourceGenerationId)}
          projection={projection}
          responsibilityKey={responsibilityKey}
          routeScopeId={routeScopeId}
          sourceGenerationId={sourceGenerationId}
          sessionContext={sessionContext}
          onOpenAssignment={onOpenAssignment}
        />
      ) : null}
    </section>
  );
}

function ResponsibilityWorkspaceScene({
  domain,
  houseId,
  houseName,
  responsibilityKey,
  routeScopeId,
  authority,
  council,
  projection,
  workspaceState,
  sessionContext,
  onSelect,
  onScopeChange,
  onOpenWorkspaceRecord,
  onOpenAssignment,
  onRetryWorkspace,
  journeyContext,
}: {
  domain: CourtOsDomainDefinition;
  houseId: string;
  houseName: string;
  responsibilityKey: CourtOsResponsibilityDesignKey;
  routeScopeId: string | null;
  authority: readonly Household1120ResponsibilityRow[];
  council: CouncilRoomReadyProjectionV1;
  projection: Household1120ReadOnlyProjection;
  workspaceState: ResponsibilityWorkspaceLoadState;
  sessionContext: CourtOsSessionContextV1;
  onSelect: (responsibility: CourtOsResponsibilityDesignKey) => void;
  onScopeChange: (scopeId: string) => void;
  onOpenWorkspaceRecord: (record: Extract<Exclude<DialogState, null>, { kind: "workspace_record" }>) => void;
  onOpenAssignment: (subject: AssignmentPlanningSubject) => void;
  onRetryWorkspace: () => void;
  journeyContext?: React.ReactNode;
}) {
  const responsibility = courtOsResponsibility(responsibilityKey);
  const source = responsibilityWorkspaceSource(responsibilityKey);
  const authorityRows = authority.filter(
    (row) =>
      row.source_legacy_responsibility_id ===
      `courtos.responsibility.${responsibility.key}`,
  );
  const sourceRecords = workspaceState.status === "ready" ? workspaceState.data.rows : [];
  const playerFacingSourceRecords = sourceRecords.filter(
    (row) => row.player_surface_eligible !== false,
  );
  const authorityHolderRows = authorityRows.filter(
    (row) => row.holder_person_id && row.holder_display_name,
  );
  const distinctAuthorityHolders = new Map(
    authorityHolderRows.map((row) => [row.holder_person_id!, row]),
  );
  const authorityHolder = routeScopeId
    ? authorityHolderRows.find(
        (row) =>
          (row.authority_scope_id ?? row.manor_id ?? row.demand_entity_id) ===
          routeScopeId,
      ) ?? null
    : distinctAuthorityHolders.size === 1
      ? [...distinctAuthorityHolders.values()][0] ?? null
      : null;
  const sourceHolderRows = sourceRecords.filter(
    (row) =>
      row.player_surface_eligible === true &&
      row.accountable_person_id &&
      row.accountable_person_label &&
      /authority|assignment/i.test(row.source_table),
  );
  const distinctSourceHolders = new Map(
    sourceHolderRows.map((row) => [row.accountable_person_id!, row]),
  );
  const sourceHolder = routeScopeId
    ? sourceHolderRows.find(
        (row) => (row.scope_id ?? row.subject_id) === routeScopeId,
      ) ?? null
    : distinctSourceHolders.size === 1
      ? [...distinctSourceHolders.values()][0] ?? null
      : null;
  const holder = authorityHolder ?? (sourceHolder ? {
    holder_person_id: sourceHolder.accountable_person_id,
    holder_display_name: sourceHolder.accountable_person_label,
  } : null);
  const holderPortrait = holder?.holder_person_id && holder.holder_display_name
    ? portraitArtForPerson({
        personId: holder.holder_person_id,
        label: holder.holder_display_name,
      })
    : null;
  const distinctHolders = new Map<string, string>();
  for (const row of authorityRows) {
    if (row.holder_person_id && row.holder_display_name) {
      distinctHolders.set(row.holder_person_id, row.holder_display_name);
    }
  }
  for (const row of sourceHolderRows) {
    if (row.accountable_person_id && row.accountable_person_label) {
      distinctHolders.set(row.accountable_person_id, row.accountable_person_label);
    }
  }
  const financeResponsibility = domain.key === "resources_finance";
  const exactWorkspaceScopes = courtOsWorkspaceAssignmentScopes(sourceRecords);
  const workspaceAssignments = stewardshipWorkspaceAssignments(
    responsibility.key,
    workspaceState,
  );
  const exactAuthorityScopes = authorityRows.length > 0
    ? courtOsAssignmentScopes(authorityRows)
    : [];
  const assignmentScopes = exactAuthorityScopes.length > 0
    ? exactAuthorityScopes
    : exactWorkspaceScopes;
  const assignmentScopeCount = assignmentScopes.length;
  const managedAssignmentScope = courtOsAssignmentScopeForReview(
    assignmentScopes,
    routeScopeId,
  );
  const workspacePosture = courtOsResponsibilityWorkspacePostureForHouse({
    sourcePosture: source.posture,
    assignmentScopeCount,
    openingRecordCount: playerFacingSourceRecords.length,
  });
  const headOfHouseAssigned =
    sessionContext.acting_actor.status === "house_head" &&
    managedAssignmentScope?.holder_person_id ===
      sessionContext.acting_actor.person_id;
  const housePapersRef = useRef<HTMLDetailsElement>(null);
  const brief = buildCourtOsResponsibilityBrief({
    responsibility: responsibility.key,
    currentState: source.currentState,
    evidence: source.evidence,
    posture: workspacePosture,
    accountableHolderCount: Math.max(distinctHolders.size, holder ? 1 : 0),
    authorityScopeCount: authorityRows.length,
    openingRecordCount: playerFacingSourceRecords.length,
    headOfHouseAssigned,
  });
  const exactScribeScope = routeScopeId
    ? assignmentScopes.find((scope) => scope.scope_id === routeScopeId) ?? null
    : assignmentScopes.length === 1 ? assignmentScopes[0]! : null;
  const scribeBriefIdentity = brief.sections
    .map((section) => `${section.key}:${section.state}`)
    .join("|");
  const scribePacket = useMemo(
    () => responsibility.key === "house_fiscal_administration"
      ? null
      : compileCourtScribeResponsibilityBriefPacketOrNull({
      session: sessionContext,
      projection_house_id: houseId,
      authority_generation_id: FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION,
      workspace_source: workspaceState.status === "ready"
        ? workspaceState.data.source_binding
        : null,
      effective_date: projection.contract.effective_date,
      responsibility_id: responsibility.key,
      steward: holder?.holder_person_id && holder.holder_display_name
        ? { person_id: holder.holder_person_id, display_name: holder.holder_display_name }
        : null,
      scope: exactScribeScope?.scope_id
        ? {
          scope_id: exactScribeScope.scope_id,
          scope_label: exactScribeScope.scope_label,
        }
        : null,
      authority_source: exactScribeScope?.source_row && exactScribeScope.scope_id
        ? {
          responsibility_summary_id: exactScribeScope.source_row.responsibility_summary_id,
          responsibility_demand_id: exactScribeScope.source_row.responsibility_demand_id,
          source_authority_status: exactScribeScope.source_row.source_authority_status,
          holder_person_id: exactScribeScope.source_row.holder_person_id,
          scope_id: exactScribeScope.scope_id,
        }
        : null,
      brief,
    }),
    [
      sessionContext.selected_house_id,
      sessionContext.acting_actor.status,
      sessionContext.acting_actor.person_id,
      sessionContext.acting_actor.authority_basis,
      sessionContext.knowledge.lens,
      sessionContext.capabilities.inspect_house_records,
      houseId,
      projection.contract.effective_date,
      responsibility.key,
      workspaceState.status,
      workspaceState.status === "ready" ? workspaceState.data.source_binding.package_id : null,
      workspaceState.status === "ready" ? workspaceState.data.source_binding.source_digest : null,
      workspaceState.status === "ready" ? workspaceState.data.source_binding.source_status : null,
      workspaceState.status === "ready" ? workspaceState.data.source_binding.source_owned : null,
      holder?.holder_person_id,
      holder?.holder_display_name,
      exactScribeScope?.scope_id,
      exactScribeScope?.scope_label,
      exactScribeScope?.source_row?.responsibility_summary_id,
      exactScribeScope?.source_row?.responsibility_demand_id,
      exactScribeScope?.source_row?.source_authority_status,
      exactScribeScope?.source_row?.holder_person_id,
      brief.actionSurfaceEligible,
      scribeBriefIdentity,
    ],
  );
  const openHousePapers = () => {
    const papers = housePapersRef.current;
    if (!papers) return;
    papers.open = true;
    papers.scrollIntoView({ behavior: "smooth", block: "start" });
    window.requestAnimationFrame(() => papers.querySelector("summary")?.focus());
  };
  const openPaper = (selection: CourtOsResponsibilityPaperSelectionV1) => {
    if (selection.kind === "named_evidence") {
      onOpenWorkspaceRecord({
        kind: "workspace_record",
        recordId: `evidence:${selection.index}`,
        responsibilityLabel: responsibility.label,
        title: playerFacingRecordText(selection.title),
        sourcePackage: source.packageId,
        state: source.posture,
        summary: playerFacingRecordText(source.boundary),
        evidence: [],
      });
      return;
    }
    const record = selection.record;
    if (!record) return;
    onOpenWorkspaceRecord({
      kind: "workspace_record",
      recordId: `source:${selection.index}`,
      responsibilityLabel: responsibility.label,
      title: selection.title,
      sourcePackage: source.packageId,
      state: record.state ?? "opening read record",
      summary: record.source_table.replace(/_/g, " "),
      evidence: record.evidence_references,
    });
  };
  return (
    <section
      aria-label={responsibility.label}
      className="uat-scene uat-responsibility-scene"
      data-domain={domain.key}
      data-room-tone={domain.visualTone}
      data-responsibility={responsibility.key}
      data-hoh-action-eligible={headOfHouseAssigned ? "true" : "false"}
    >
      <nav className="uat-responsibility-rail" aria-label={`${domain.label} responsibilities`}>
        {domain.responsibilities.map((candidate, index) => {
          const candidatePosture = candidate.key === responsibility.key
            ? workspacePosture
            : responsibilityWorkspaceSource(candidate.key).posture;
          return (
            <button
              aria-current={candidate.key === responsibility.key ? "page" : undefined}
              data-state={candidatePosture}
              key={candidate.key}
              onClick={() => onSelect(candidate.key)}
              type="button"
            >
              <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
              <span>
                <strong>{candidate.shortLabel}</strong>
                <small>{candidatePosture === "read_ready" ? "Account ready" : candidatePosture === "conditional_empty" ? "No current charge" : "No verified charge"}</small>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="uat-workspace">
        <CourtOsResponsibilityHeadsBrief
          brief={brief}
          domain={domain.key}
          onManageStewardship={workspacePosture === "read_ready" && assignmentScopeCount > 0 ? () => {
            if (assignmentScopeCount > 1 && !routeScopeId) {
              const scopeChoice = document.querySelector<HTMLButtonElement>(
                ".uat-responsibility-assignment nav button",
              );
              scopeChoice?.scrollIntoView({ behavior: "smooth", block: "center" });
              window.requestAnimationFrame(() => scopeChoice?.focus());
              return;
            }
            onOpenAssignment({
              designKey: responsibility.key,
              title: responsibility.label,
              holder: holder?.holder_person_id && holder.holder_display_name
                ? { personId: holder.holder_person_id, displayName: holder.holder_display_name }
                : null,
              scopeId: managedAssignmentScope?.scope_id ?? undefined,
              scopeLabel: managedAssignmentScope?.scope_label ?? undefined,
              workspaceAssignments,
              stateLabel: assignmentScopeCount > 0
                ? "Current stewardship is ready for review"
                : "No stewardship scope is recorded",
            });
          } : undefined}
          onOpenHousePapers={openHousePapers}
          responsibilityLabel={responsibility.label}
          roomLabel={domain.label}
          scribePacket={scribePacket}
          steward={holder?.holder_display_name
            ? { displayName: holder.holder_display_name, portrait: holderPortrait }
            : distinctHolders.size > 1
              ? { displayName: `${distinctHolders.size} accountable stewards`, portrait: null }
              : null}
          stewardNote={holder
            ? "Brings this account to the Head of House."
            : distinctHolders.size > 1
              ? "Choose a recorded charge to review its accountable steward."
              : "No named steward is entered for this charge."}
        />
        <div className="uat-workspace-body uat-workspace-body--brief">
          <main>
            {financeResponsibility ? (
              <FinanceWorkspaceSurface
                authorityRows={authorityRows}
                council={council}
                onScopeChange={onScopeChange}
                projection={projection}
                responsibilityKey={responsibility.key}
                routeScopeId={routeScopeId}
                sessionContext={sessionContext}
                sourcePosture={workspacePosture}
                sourceGenerationId={
                  FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION
                }
                onOpenAssignment={onOpenAssignment}
                onOpenHousePapers={openHousePapers}
              />
            ) : null}
            <CourtOsResponsibilityHousePapers
              detailsRef={housePapersRef}
              errorMessage={workspaceState.status === "error" ? workspaceState.error.message : null}
              evidence={source.evidence.map(playerFacingRecordText)}
              loading={workspaceState.status === "loading" || workspaceState.status === "idle"}
              onOpenPaper={openPaper}
              onRetry={workspaceState.status === "error" ? onRetryWorkspace : undefined}
              posture={workspacePosture}
              records={sourceRecords}
            />
            <section className="uat-workspace-watch" aria-label="Watch and matters">
              <small>Watch &amp; Matters</small>
              <strong>No opening Matter is recorded.</strong>
              <span>Quiet monitoring is available; Matters appear only from a recorded cause or a later turn receipt.</span>
            </section>
            {!financeResponsibility ? (
              <ResponsibilityAssignmentPlanning
                authorityRows={authorityRows}
                council={council}
                onScopeChange={onScopeChange}
                projection={projection}
                sourceGenerationId={
                  FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION
                }
                planningAvailable={
                  workspaceState.status === "ready" &&
                  workspacePosture === "read_ready" &&
                  (authorityRows.length > 0 || courtOsWorkspaceAssignmentScopes(sourceRecords).length > 0)
                }
                responsibilityKey={responsibility.key}
                routeScopeId={routeScopeId}
                sessionContext={sessionContext}
                workspaceRows={sourceRecords}
                workspaceAssignments={workspaceAssignments}
                onOpenAssignment={onOpenAssignment}
              />
            ) : null}
            {journeyContext}
          </main>
        </div>
      </div>
    </section>
  );
}

function ReservedCourtOsSurface({
  scene,
  journeyContext,
  hasAdmittedHouseActorProjection = false,
}: {
  scene: "house_command" | "council_docket";
  journeyContext?: React.ReactNode;
  /** A future admitted Track-2 projection, never inferred from Council seats. */
  hasAdmittedHouseActorProjection?: boolean;
}) {
  const command = scene === "house_command";
  const appointments = courtOsResponsibility("office_post_appointments");
  const houseCommandGate = command
    ? gateHouseCommandProjectionConsumption({
        checkpoint: COURTOS_ACCEPTED_P1_PRODUCT_CHECKPOINT,
        has_admitted_house_actor_projection: hasAdmittedHouseActorProjection,
      })
    : null;
  return (
    <section className="uat-scene uat-reserved-scene" aria-label={command ? "House Command" : "Council Docket"}>
      <div className={journeyContext ? "uat-reserved-content--with-journey" : undefined}>
        <small>{command ? "House Command" : "Council table"}</small>
        <h2>{command ? "House Command" : "The Council Docket"}</h2>
        <p>
          {command
            ? "Assignments, delegation, scopes, authority bounds, and House-wide controls belong here."
            : "The docket is compiled from eligible domain Matters and reports at the triennial break."}
        </p>
        <strong>{command
          ? houseCommandGate?.status === "accepted"
            ? "The House governance record is ready for review."
            : "Authority and planning controls are unavailable until the House and acting authority are recorded together."
          : "No Council docket is recorded for this opening state."}</strong>
        {command ? (
          <div className="uat-command-gates">
            <article className="uat-command-responsibility">
              <small>Planning authority</small>
              <h3>The House stewardship record</h3>
              <p>
                The current House, acting Head, and all 24 responsibilities are
                bound to the same opening record. If those records no longer
                agree, planning remains closed.
              </p>
            </article>
            <article className="uat-command-responsibility">
              <small>Assignable House Command responsibility</small>
              <h3>{appointments.label}</h3>
              <p>
                Exact appointing scopes, vacancies, continuation, appointment review,
                removal, terms, and handover belong here. No office state, actor,
                Matter, or available action is inferred before the House-scoped
                authority record is available.
              </p>
            </article>
          </div>
        ) : null}
        {command ? journeyContext : null}
      </div>
    </section>
  );
}

/**
 * House Command exposes the admitted authority register and the route into
 * each responsibility workspace. UAT-1 may retain a versioned planning draft;
 * the current assignment remains immutable and submission/execution stay
 * behind the later runtime boundary.
 */
function HouseCommandReadSurface({
  houseName,
  council,
  projection,
  sessionContext,
  onOpenResponsibility,
  onManageAssignment,
  journeyContext,
  workspaceAssignments = [],
  focusedResponsibility = null,
}: {
  houseName: string;
  council: CouncilRoomReadyProjectionV1;
  projection: Household1120ReadOnlyProjection;
  sessionContext: CourtOsSessionContextV1;
  onOpenResponsibility: (responsibility: CourtOsResponsibilityDesignKey) => void;
  onManageAssignment: (subject: AssignmentPlanningSubject) => void;
  journeyContext?: React.ReactNode;
  workspaceAssignments?: readonly CourtOsStewardshipWorkspaceAssignmentInputV1[];
  focusedResponsibility?: "office_post_appointments" | null;
}) {
  const planningHorizon = threeYearStewardshipHorizonFrom(
    projection.contract.effective_date,
  );
  const planningCycleLabel = planningHorizon
    ? `${planningHorizon.starts_at.slice(0, 4)}–${planningHorizon.ends_at.slice(0, 4)}`
    : "the coming three years";
  const stewardshipPlanning = useMemo(
    () => buildCourtOsStewardshipPlanningProjection({
      projection,
      session: sessionContext,
      council,
      authority_source_generation_id:
        FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION,
      workspace_assignment_rows: workspaceAssignments,
    }),
    [council, projection, sessionContext, workspaceAssignments],
  );
  const firstPlannableResponsibility = stewardshipPlanning.responsibilities.find(
    (responsibility) => responsibility.scopes.length > 0,
  )?.responsibility_id;
  const byResponsibility = new Map<string, Household1120ResponsibilityRow[]>();
  for (const row of projection.responsibility_summary) {
    const key = row.source_legacy_responsibility_id.replace(
      "courtos.responsibility.",
      "",
    );
    const current = byResponsibility.get(key) ?? [];
    current.push(row);
    byResponsibility.set(key, current);
  }
  const appointmentRows = byResponsibility.get("office_post_appointments") ?? [];
  const appointmentHolder = appointmentRows.find(
    (row) => row.holder_person_id && row.holder_display_name,
  ) ?? null;
  const scopedResponsibilityCount = stewardshipPlanning.responsibilities.filter(
    (responsibility) => responsibility.scopes.length > 0,
  ).length;
  const registerItem = (definition: CourtOsResponsibilityDefinition) => {
    const rows = byResponsibility.get(definition.key) ?? [];
    const planned = stewardshipPlanning.responsibilities.find(
      (responsibility) => responsibility.responsibility_id === definition.key,
    );
    const scopes = planned?.scopes ?? [];
    const distinctHolders = new Set(
      scopes.flatMap((scope) => scope.current_holder?.display_name ?? []),
    );
    const holder = distinctHolders.size === 1 ? [...distinctHolders][0] : null;
    const directScope = scopes.length === 1 && scopes[0]?.scope_id
      ? scopes[0]
      : null;
    const directAssignment = directScope
      ? {
          designKey: definition.key,
          title: definition.shortLabel,
          holder: directScope.current_holder
            ? {
                personId: directScope.current_holder.person_id,
                displayName: directScope.current_holder.display_name,
              }
            : null,
          stateLabel: "Recorded stewardship is ready for planning",
          scopeId: directScope.scope_id ?? undefined,
          scopeLabel: directScope.scope_label,
          workspaceAssignments: workspaceAssignments.filter(
            (assignment) => assignment.responsibility_id === definition.key,
          ),
        } satisfies AssignmentPlanningSubject
      : null;
    return (
      <li
        data-state={scopes.length > 0 ? "resolved" : "quiet"}
        key={definition.key}
      >
        <div className="uat-house-command-register-item">
          <button
            aria-label={`Open ${definition.shortLabel}`}
            data-responsibility={definition.key}
            onClick={() => onOpenResponsibility(definition.key)}
            type="button"
          >
            <span>{definition.shortLabel}</span>
            <strong>{holder ?? (scopes.length > 0 ? "Recorded scope" : "No present charge")}</strong>
            <small>
              {scopes.length > 0
                ? `${scopes.length} stewardship scope${scopes.length === 1 ? "" : "s"}`
                : "Open only when this work is present"}
            </small>
          </button>
          {directAssignment ? (
            <button
              className="uat-house-command-manage"
              onClick={() => onManageAssignment(directAssignment)}
              type="button"
            >
              Plan stewardship
            </button>
          ) : scopes.length > 1 ? (
            <button
              className="uat-house-command-manage"
              onClick={() => onOpenResponsibility(definition.key)}
              type="button"
            >
              Choose scope
            </button>
          ) : null}
        </div>
      </li>
    );
  };
  return (
    <section
      className="uat-scene uat-house-command-scene"
      aria-label="House Command"
      data-command-focus={focusedResponsibility ?? "register"}
    >
      <div className="uat-house-command-folio">
        <small>January 1120</small>
        <h2>House Command</h2>
        <p>
          Set the stewardship of {houseName} for the coming three years. Open a
          responsibility to hear its steward, review the House record, or prepare
          a {planningCycleLabel} assignment plan.
        </p>
        <div className="uat-house-command-summary" role="status">
          <strong>{scopedResponsibilityCount} of 24 responsibilities have a current House scope</strong>
          <span>
            Review stewardship by room, then open the relevant working place
          </span>
        </div>
        <details className="courtos-stewardship-planner-shell">
          <summary>Manage the three-year stewardship plan</summary>
          {stewardshipPlanning.context ? (
            <CourtOsStewardshipPlanner
              candidatesForScope={(scope) =>
                stewardshipPlanning.candidates_by_scope.get(
                  courtOsStewardshipScopeKey(
                    scope.responsibility_id,
                    scope.scope_id,
                  ),
                ) ?? []
              }
              context={stewardshipPlanning.context}
              initialResponsibilityId={firstPlannableResponsibility}
              responsibilities={stewardshipPlanning.responsibilities}
              storage={courtOsPlayerPlanningStorage()}
            />
          ) : (
            <p role="status">
              The three-year planner requires the current House Head and exact
              responsibility-authority generation.
            </p>
          )}
        </details>
        <section className="uat-house-command-appointments" aria-label="Office and Post Appointments planning">
          <small>House Command responsibility</small>
          <h3>Office &amp; Post Appointments</h3>
          <p>
            Review who brings appointing work to the Head of House and prepare a
            three-year stewardship plan. Offices, titles, and remuneration remain
            separate decisions.
          </p>
          <button
            className="uat-manage-assignment"
            onClick={() => onManageAssignment({
              designKey: "office_post_appointments",
              title: "Office & Post Appointments",
              holder: appointmentHolder?.holder_person_id && appointmentHolder.holder_display_name
                ? { personId: appointmentHolder.holder_person_id, displayName: appointmentHolder.holder_display_name }
                : null,
              stateLabel: appointmentRows.length > 0
                ? "Current appointing stewardship is ready for review"
                : "No appointing stewardship scope is recorded",
            })}
            type="button"
          >
            Manage appointment stewardship
          </button>
        </section>
        <div className="uat-house-command-room-register" aria-label="Stewardship by room">
          {COURTOS_DOMAINS.map((domain) => (
            <section key={domain.key}>
              <header>
                <small>{domain.label}</small>
                <strong>{domain.objectDetail}</strong>
              </header>
              <ol className="uat-house-command-register" aria-label={`${domain.label} responsibilities`}>
                {domain.responsibilities.map(registerItem)}
              </ol>
            </section>
          ))}
        </div>
        <footer>
          {sessionContext.capabilities.manage_assignments
            ? "Saved plans preserve the current appointment until a later turn decision carries them into effect."
            : "This visitor may inspect stewardship but cannot alter the House plan."}
        </footer>
        {journeyContext}
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
        {responsibility.holder?.displayName ?? "No recorded assignment"}
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

function assignmentSubjectForHousehold(
  responsibility: HouseholdResponsibilityRuntime,
): AssignmentPlanningSubject {
  return {
    designKey: responsibility.definition.designKey,
    title: responsibility.definition.title,
    holder: responsibility.holder
      ? {
          personId: responsibility.holder.personId,
          displayName: responsibility.holder.displayName,
        }
      : null,
    stateLabel: responsibility.stateLabel,
    provenance: responsibility.provenance,
  };
}

function EmptyRecord({ responsibility }: { responsibility: HouseholdResponsibilityRuntime }) {
  return (
    <div className="uat-empty-record">
      <span aria-hidden="true">—</span>
      <div>
        <strong>No individual entry is recorded</strong>
        <p>
          {responsibility.definition.title} remains in the House account, but
          no House-scoped person, place, or arrangement is entered here.
        </p>
      </div>
    </div>
  );
}

function provenanceReason(
  rows: ReadonlyArray<Household1120ReadOnlyProjection["provenance"][number]>,
): string | null {
  return (
    rows.find((row) => row.admission_state === "withheld_pending_admission")
      ?.withheld_reason ?? null
  );
}

function ResponsibilityReadiness({
  responsibility,
}: {
  responsibility: HouseholdResponsibilityRuntime;
}) {
  const openingReason = provenanceReason(responsibility.provenance);
  const openingReadable = responsibility.currentRecordCount > 0;
  const cycleReadable = responsibility.cycleRecordCount > 0;
  const openingLabel = openingReadable
    ? "Opening account recorded"
    : "No opening account is recorded";
  const cycleLabel = cycleReadable
    ? responsibility.definition.key === "education"
      ? `${responsibility.cycleRecordCount} prior-cycle ${
          responsibility.cycleRecordCount === 1 ? "formation report" : "formation reports"
        }`
      : `${responsibility.cycleRecordCount} prior-cycle ${
          responsibility.cycleRecordCount === 1 ? "record" : "records"
        }`
    : "No prior-cycle account is recorded";
  return (
    <section
      aria-label={`${responsibility.definition.shortTitle} record readiness`}
      className="uat-record-readiness"
    >
      <header>
        <small>Account coverage</small>
        <strong>Opening position and prior account</strong>
      </header>
      <div>
        <article data-state={openingReadable ? "readable" : "withheld"}>
          <small>January 1120</small>
          <strong>{openingLabel}</strong>
          <span>
            {openingReadable
              ? responsibility.explanation
              : openingReason ?? responsibility.explanation}
          </span>
        </article>
        <article data-state={cycleReadable ? "readable" : "withheld"}>
          <small>1117–1119 record</small>
          <strong>{cycleLabel}</strong>
          <span>
            {cycleReadable
              ? "The prior account is available for review."
              : "No prior account is entered. The House papers do not turn an uncertain note or opening condition into past activity."}
          </span>
        </article>
      </div>
    </section>
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
        These are the people whose presence shapes household provision. Their
        residence does not by itself place them under managed support.
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
  onOpenPosition,
}: {
  responsibility: HouseholdResponsibilityRuntime;
  projection: Household1120ReadOnlyProjection;
  onOpenPosition: (position: Household1120StoresPositionRow) => void;
}) {
  const usesPlanningOpening = projection.stores_positions.some(
    (position) =>
      position.position_state === "provisional_uat_opening_available" ||
      position.position_state === "provisional_available_foundation_a_uat_only",
  );
  const activityByYear = [1119, 1118, 1117].map((year) => ({
    year,
    rows: projection.economic_activity_lookback.filter(
      (activity) => activity.activity_year === year,
    ),
  }));
  return (
    <>
      {projection.stores_positions.length > 0 ? (
        <section className="uat-record-table">
          <header>
            <div>
              <strong>Stores at the opening</strong>
              {usesPlanningOpening ? (
                <small className="uat-provisional-note">
                  Quantities available for planning · detailed custody and transport remain in the House papers
                </small>
              ) : null}
            </div>
            <span>{projection.stores_positions.length}</span>
          </header>
          {projection.stores_positions.map((position) => (
            <button
              aria-label={`Inspect ${sentenceCase(position.resource_id)} position for ${
                position.position_kind === "house_position"
                  ? "the House"
                  : position.manor_label ?? position.manor_id ?? sentenceCase(position.position_kind ?? "recorded location")
              }`}
              key={position.stores_position_id}
              onClick={() => onOpenPosition(position)}
              type="button"
            >
              <div>
                <strong>{sentenceCase(position.resource_id)}</strong>
                <small>
                  {position.position_kind === "house_position"
                    ? "House position · available for three-year planning"
                    : position.position_kind === "custody_position"
                      ? `${position.manor_label ?? position.manor_id ?? "Recorded manor"} · recorded custody`
                      : position.position_kind === "food_capacity"
                        ? `${position.manor_label ?? position.manor_id ?? "Recorded manor"} · Food capacity`
                        : position.availability_posture === "available"
                          ? "Available for three-year planning"
                          : sentenceCase(position.position_state)}
                </small>
              </div>
              <span>
                {position.quantity_integer === null
                  ? "Quantity not disclosed"
                  : position.position_kind === "food_capacity"
                    ? `${position.quantity_integer.toLocaleString()} capacity`
                    : position.quantity_integer.toLocaleString()}
              </span>
            </button>
          ))}
        </section>
      ) : (
        <EmptyRecord responsibility={responsibility} />
      )}
      {projection.economic_activity_lookback.length > 0 ? (
        <section className="uat-record-table uat-economic-lookback">
          <header>
            <div>
              <strong>The course of the stores, 1117–1119</strong>
              <small className="uat-provisional-note">
                Regular movement from the prior House account
              </small>
            </div>
            <span>{projection.economic_activity_lookback.length}</span>
          </header>
          {activityByYear.map(({ year, rows }) => (
            <article key={year}>
              <div>
                <strong>{year}</strong>
                <small>
                  {rows.length} account entries · {new Set(rows.map((row) => row.resource_id)).size} kinds of provision
                </small>
              </div>
              <span>{rows.filter((row) => row.signed_amount < 0).length} entries against the House</span>
            </article>
          ))}
        </section>
      ) : null}
      <MembershipContext rows={projection.membership_context} />
    </>
  );
}

function AdultKinRecords({
  responsibility,
  projection,
  onOpenSubject,
}: {
  responsibility: HouseholdResponsibilityRuntime;
  projection: Household1120ReadOnlyProjection;
  onOpenSubject: (subject: Household1120AdultKinRosterRow) => void;
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
        <button
          aria-label={`Inspect support record for ${names.get(row.person_id) ?? "named person"}`}
          key={row.support_roster_id}
          onClick={() => onOpenSubject(row)}
          type="button"
        >
          <div>
            <strong>{names.get(row.person_id) ?? "Named person"}</strong>
            <small>
              {sentenceCase(row.primary_support_basis ?? row.roster_state)}
              {row.residence_label ? ` · ${row.residence_label}` : ""}
            </small>
          </div>
          <div>
            <span>
              {row.manager_person_name ?? "Named manager"}
            </span>
            <small>
              {row.classification_reason
                ? sentenceCase(row.classification_reason)
                : `${projection.adult_kin_arrangements.filter((item) => item.person_id === row.person_id).length} arrangements`}
            </small>
          </div>
        </button>
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
  const hasActiveUatArrangements = projection.education_plans.some(
    (plan) => plan.contract_state === "active_uat_formation_arrangement",
  );
  const reportsByLearner = new Map(
    projection.education_cycle_reports.map((report) => [report.learner_person_id, report]),
  );
  return (
    <section className="uat-learner-ledger">
      <header>
        <div>
          <small>
            {hasActiveUatArrangements
              ? "Opening formation arrangements"
              : "Turn-opening recommendations"}
          </small>
          <h3>
            {hasActiveUatArrangements
              ? "Active education arrangements"
              : "Education plans · not yet executed"}
          </h3>
        </div>
        <span>{projection.education_plans.length}</span>
      </header>
      <div>
        {projection.education_plans.map((plan) => {
          const cycle = buildCourtOsEducationCyclePresentation(
            plan,
            reportsByLearner.get(plan.learner_person_id),
          );
          return <button
            key={plan.education_assignment_id}
            onClick={() => onOpenPlan(plan)}
            type="button"
            data-plan-state={plan.contract_state}
            data-report-state={cycle.state}
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
              <small>
                {plan.contract_state === "active_uat_formation_arrangement"
                  ? "Formation provider"
                  : "Proposed provider"}
              </small>
              <strong>{plan.primary_provider_name ?? "Not named"}</strong>
            </span>
            <span className="uat-learner-posture">
              <small>{educationPlanStateLabel(plan.contract_state)}</small>
              <small>{cycle.headline}</small>
              <em>{cycle.accountSpan}</em>
            </span>
            <i aria-hidden="true">›</i>
          </button>;
        })}
      </div>
    </section>
  );
}

function HealthRecords({
  responsibility,
  projection,
  onOpenRecord,
}: {
  responsibility: HouseholdResponsibilityRuntime;
  projection: Household1120ReadOnlyProjection;
  onOpenRecord: (record: Household1120HealthRosterRow) => void;
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
      {projection.health_roster.map((row) => {
        const specializedCareCount = projection.care_arrangements.filter(
          (item) => item.person_id === row.person_id,
        ).length;
        return (
          <button
            aria-label={`Inspect care record for ${names.get(row.person_id) ?? "named person"}`}
            key={row.health_roster_id}
            onClick={() => onOpenRecord(row)}
            type="button"
          >
            <div>
              <strong>{names.get(row.person_id) ?? "Named person"}</strong>
              <small>{sentenceCase(row.severity_state)}</small>
            </div>
            <span>
              {specializedCareCount > 0
                ? `${specializedCareCount} specialized care arrangement${specializedCareCount === 1 ? "" : "s"}`
                : "Household care posture"}
            </span>
          </button>
        );
      })}
    </section>
  );
}

function ResponsibilityScene({
  council,
  model,
  sessionContext,
  projection,
  selected,
  onSelect,
  onInspectAssignment,
  onOpenPlan,
  onOpenStoresPosition,
  onOpenAdultKinSubject,
  onOpenHealthRecord,
  journeyContext,
}: {
  council: CouncilRoomReadyProjectionV1;
  model: HouseholdUatRuntimeModel;
  projection: Household1120ReadOnlyProjection;
  sessionContext: CourtOsSessionContextV1;
  selected: HouseholdResponsibilityKey;
  onSelect: (key: HouseholdResponsibilityKey) => void;
  onInspectAssignment: (responsibility: HouseholdResponsibilityRuntime) => void;
  onOpenPlan: (plan: Household1120EducationLearnerPlanRow) => void;
  onOpenStoresPosition: (position: Household1120StoresPositionRow) => void;
  onOpenAdultKinSubject: (subject: Household1120AdultKinRosterRow) => void;
  onOpenHealthRecord: (record: Household1120HealthRosterRow) => void;
  journeyContext?: React.ReactNode;
}) {
  const responsibility = model.responsibilities.find(
    (item) => item.definition.key === selected,
  );
  const householdPapersRef = useRef<HTMLDetailsElement>(null);
  if (!responsibility) return null;
  const source = responsibilityWorkspaceSource(responsibility.definition.designKey);
  const authorityRows = projection.responsibility_summary.filter(
    (row) =>
      row.source_legacy_responsibility_id ===
      `courtos.responsibility.${responsibility.definition.designKey}`,
  );
  const accountableHolders = new Set(
    authorityRows.flatMap((row) => row.holder_person_id ? [row.holder_person_id] : []),
  );
  if (responsibility.holder) accountableHolders.add(responsibility.holder.personId);
  const headOfHouseAssigned =
    sessionContext.acting_actor.status === "house_head" &&
    (authorityRows.some(
      (row) => row.holder_person_id === sessionContext.acting_actor.person_id,
    ) || responsibility.holder?.personId === sessionContext.acting_actor.person_id);
  const brief = buildCourtOsResponsibilityBrief({
    responsibility: responsibility.definition.designKey,
    currentState: responsibility.explanation,
    evidence: source.evidence,
    posture: source.posture,
    accountableHolderCount: accountableHolders.size,
    authorityScopeCount: authorityRows.length,
    openingRecordCount: responsibility.currentRecordCount,
    priorCycleRecordCount: responsibility.cycleRecordCount,
    headOfHouseAssigned,
  });
  const householdScribeScopes = authorityRows.length > 0
    ? courtOsAssignmentScopes(authorityRows)
    : [];
  const householdScribeScope = householdScribeScopes.length === 1
    ? householdScribeScopes[0]!
    : null;
  const householdScribeBriefIdentity = brief.sections
    .map((section) => `${section.key}:${section.state}`)
    .join("|");
  const scribePacket = useMemo(
    () => compileCourtScribeResponsibilityBriefPacketOrNull({
      session: sessionContext,
      projection_house_id: projection.query.house_id,
      authority_generation_id: projection.contract.generation_id,
      workspace_source: {
        package_id: "foundation_a_household_uat1_release_v1",
        source_digest: projection.contract.sqlite_sha256,
        source_status: projection.schema_version,
        source_owned: true,
      },
      effective_date: projection.contract.effective_date,
      responsibility_id: responsibility.definition.designKey,
      steward: responsibility.holder
        ? {
          person_id: responsibility.holder.personId,
          display_name: responsibility.holder.displayName,
        }
        : null,
      scope: householdScribeScope?.scope_id
        ? {
          scope_id: householdScribeScope.scope_id,
          scope_label: householdScribeScope.scope_label,
        }
        : null,
      authority_source: householdScribeScope?.source_row && householdScribeScope.scope_id
        ? {
          responsibility_summary_id: householdScribeScope.source_row.responsibility_summary_id,
          responsibility_demand_id: householdScribeScope.source_row.responsibility_demand_id,
          source_authority_status: householdScribeScope.source_row.source_authority_status,
          holder_person_id: householdScribeScope.source_row.holder_person_id,
          scope_id: householdScribeScope.scope_id,
        }
        : null,
      brief,
    }),
    [
      sessionContext.selected_house_id,
      sessionContext.acting_actor.status,
      sessionContext.acting_actor.person_id,
      sessionContext.acting_actor.authority_basis,
      sessionContext.knowledge.lens,
      sessionContext.capabilities.inspect_house_records,
      projection.query.house_id,
      projection.contract.generation_id,
      projection.contract.sqlite_sha256,
      projection.schema_version,
      projection.contract.effective_date,
      responsibility.definition.designKey,
      responsibility.holder?.personId,
      responsibility.holder?.displayName,
      householdScribeScope?.scope_id,
      householdScribeScope?.scope_label,
      householdScribeScope?.source_row?.responsibility_summary_id,
      householdScribeScope?.source_row?.responsibility_demand_id,
      householdScribeScope?.source_row?.source_authority_status,
      householdScribeScope?.source_row?.holder_person_id,
      brief.actionSurfaceEligible,
      householdScribeBriefIdentity,
    ],
  );
  const stewardPortrait = responsibility.holder
    ? portraitArtForPerson({
        personId: responsibility.holder.personId,
        label: responsibility.holder.displayName,
      })
    : null;
  const openHouseholdPapers = () => {
    const papers = householdPapersRef.current;
    if (!papers) return;
    papers.open = true;
    papers.scrollIntoView({ behavior: "smooth", block: "start" });
    window.requestAnimationFrame(() => papers.querySelector("summary")?.focus());
  };
  return (
    <section
      className="uat-scene uat-responsibility-scene"
      data-responsibility={selected}
      data-layout="room-folio"
      aria-label={responsibility.definition.title}
    >
      <ResponsibilityRail model={model} onSelect={onSelect} selected={selected} />
      <article
        aria-label={responsibility.definition.title}
        className="uat-workspace"
        data-surface="working-folio"
      >
        <CourtOsResponsibilityHeadsBrief
          brief={brief}
          domain="household"
          onManageStewardship={() => onInspectAssignment(responsibility)}
          onOpenHousePapers={openHouseholdPapers}
          responsibilityLabel={responsibility.definition.title}
          roomLabel="Household"
          scribePacket={scribePacket}
          steward={responsibility.holder
            ? { displayName: responsibility.holder.displayName, portrait: stewardPortrait }
            : null}
          stewardNote={
            responsibility.holder
              ? "Brings this account to the Head of House."
              : "No named steward is entered for this charge."
          }
        />
        <div className="uat-workspace-body uat-workspace-body--brief">
          <section className="uat-workspace-records" aria-label="Working records">
            {selected === "stores" ? (
              <StoresRecords
                onOpenPosition={onOpenStoresPosition}
                projection={projection}
                responsibility={responsibility}
              />
            ) : null}
            {selected === "adult_kin" ? (
              <AdultKinRecords
                onOpenSubject={onOpenAdultKinSubject}
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
                onOpenRecord={onOpenHealthRecord}
                projection={projection}
                responsibility={responsibility}
              />
            ) : null}
            <details className="uat-house-papers" ref={householdPapersRef}>
              <summary>House papers &amp; opening record</summary>
              <ResponsibilityReadiness responsibility={responsibility} />
            </details>
            {journeyContext}
          </section>
        </div>
      </article>
    </section>
  );
}

function RecordDialog({
  dialog,
  council,
  householdProjection,
  sessionContext,
  onClose,
}: {
  dialog: Exclude<DialogState, null>;
  council: CouncilRoomReadyProjectionV1;
  householdProjection: Household1120ReadOnlyProjection | null;
  sessionContext: CourtOsSessionContextV1;
  onClose: () => void;
}) {
  const planningHorizon = householdProjection
    ? threeYearStewardshipHorizonFrom(householdProjection.contract.effective_date)
    : null;
  const planningCycleLabel = planningHorizon
    ? `${planningHorizon.starts_at.slice(0, 4)}–${planningHorizon.ends_at.slice(0, 4)}`
    : "the coming three years";
  const scrimRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scrim = scrimRef.current;
    const app = scrim?.parentElement;
    if (!scrim || !app) return;
    const background = Array.from(app.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== scrim,
    );
    const prior = background.map((element) => ({
      element,
      inert: element.hasAttribute("inert"),
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    for (const element of background) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        scrim.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hidden && element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      for (const { element, inert, ariaHidden } of prior) {
        if (inert) element.setAttribute("inert", "");
        else element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
    };
  }, []);
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
    kicker = "Inner Council";
    title = dialog.person.person_ref.display_name;
    footerLabel = "Council profile inspected · no order issued";
    body = (
      <div className="uat-person-report">
        {portrait ? (
          <img src={portrait.src} alt={portrait.alt} />
        ) : (
          <MissingPortrait label={dialog.person.person_ref.display_name} />
        )}
        <dl>
          <div>
            <dt>Council portfolio</dt>
            <dd>{sentenceCase(dialog.person.portfolio)}</dd>
          </div>
          <div>
            <dt>Council seat</dt>
            <dd>{dialog.person.seat_rank ?? "Summoned attendee"}</dd>
          </div>
          <div>
            <dt>Membership posture</dt>
            <dd>{dialog.person.meta_label || "Inner Council seat"}</dd>
          </div>
        </dl>
        <p>
          No general report or matter commentary is available from this
          councillor at the opening of the cycle.
        </p>
      </div>
    );
  } else if (dialog.kind === "assignment") {
    kicker = dialog.responsibility.title;
    title = "Stewardship & assignment";
    body = (
      <div className="uat-assignment-sheet">
        <section className="uat-assignment-sheet-current" aria-label="Current stewardship">
          <small>Current stewardship</small>
          <strong>{dialog.responsibility.holder?.displayName ?? "No steward recorded"}</strong>
          <span>{dialog.responsibility.stateLabel}</span>
          <p>
            This plan covers responsibility stewardship for {planningCycleLabel}. It does not appoint an officeholder or execute a change.
          </p>
        </section>
        {householdProjection ? (
          <AssignmentDraftEditor
            council={council}
            projection={householdProjection}
            sourceGenerationId={FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION}
            responsibility={dialog.responsibility}
            sessionContext={sessionContext}
          />
        ) : (
          <p>Planning drafts require the current Household opening record.</p>
        )}
        {dialog.responsibility.provenance?.length ? (
          <details className="uat-house-papers">
            <summary>Supporting House papers</summary>
            <section className="uat-source-record">
              {dialog.responsibility.provenance.map((row) => (
                <article key={row.provenance_id}>
                  <strong>{sourceSurfaceLabel(row.record_key)}</strong>
                  <span>
                    {row.admission_state === "projected_read_ready"
                      ? "Available in the opening House record"
                      : row.withheld_reason ?? "Not available in the opening House record"}
                  </span>
                </article>
              ))}
            </section>
          </details>
        ) : null}
      </div>
    );
  } else if (dialog.kind === "education_plan") {
    const progressReport = householdProjection?.education_cycle_reports.find(
      (report) => report.learner_person_id === dialog.plan.learner_person_id,
    );
    const cycle = buildCourtOsEducationCyclePresentation(dialog.plan, progressReport);
    kicker = "Education & Formation";
    title = dialog.plan.learner_name;
    body = (
      <div className="uat-education-dossier" data-cycle-state={cycle.state}>
        <section className="uat-education-dossier__arrangement" aria-label="Current formation arrangement">
          <small>Present formation</small>
          <h3>{dialog.plan.recommended_track}</h3>
          <p>{dialog.plan.setting_entity ?? sentenceCase(dialog.plan.setting_type)}</p>
          <dl>
            <div><dt>Provider</dt><dd>{dialog.plan.primary_provider_name ?? "Not named"}</dd></div>
            <div><dt>Answers for the learner</dt><dd>{dialog.plan.responsible_party_name ?? "Not named"}</dd></div>
          </dl>
        </section>
        <section className="uat-education-dossier__cycle" aria-label="Prior formation account">
          <small>The prior account</small>
          <h3>{cycle.headline}</h3>
          <p>{cycle.course}</p>
          <div>
            <span>{cycle.accountSpan}</span>
            <span>{cycle.continuity}</span>
          </div>
        </section>
        <section className="uat-education-dossier__review" aria-label="Next review">
          <small>For the Head's review</small>
          <h3>{cycle.nextReview}</h3>
          <p>Confirm that the named provider, setting, and responsible party remain right for the coming three years.</p>
        </section>
        <details>
          <summary>Arrangement terms</summary>
          <dl>
            <div><dt>Arrangement</dt><dd>{educationPlanStateLabel(dialog.plan.contract_state)}</dd></div>
            <div><dt>Provider availability</dt><dd>{educationCapacityStateLabel(dialog.plan.capacity_availability_state)}</dd></div>
          </dl>
        </details>
      </div>
    );
  } else if (dialog.kind === "stores_position") {
    const activity = householdProjection?.economic_activity_lookback.filter(
      (row) => row.resource_id === dialog.position.resource_id,
    ) ?? [];
    const years = [...new Set(activity.map((row) => row.activity_year))].sort();
    kicker = "Household Stores";
    title = sentenceCase(dialog.position.resource_id);
    body = (
      <div className="uat-source-record">
        <dl>
          <div><dt>Opening position</dt><dd>{dialog.position.quantity_integer?.toLocaleString() ?? "Quantity not disclosed"}</dd></div>
          <div><dt>Account scope</dt><dd>{sentenceCase(dialog.position.position_kind ?? dialog.position.position_state)}</dd></div>
          <div><dt>Planning posture</dt><dd>{sentenceCase(dialog.position.availability_posture ?? dialog.position.position_state)}</dd></div>
          <div><dt>Location</dt><dd>{dialog.position.manor_label ?? dialog.position.manor_id ?? "House-wide position"}</dd></div>
          <div><dt>Account dated</dt><dd>{dialog.position.source_effective_date ?? "Not recorded"}</dd></div>
          <div><dt>Prior-cycle entries</dt><dd>{activity.length} recorded entries{years.length ? ` · ${years.join("–")}` : ""}</dd></div>
        </dl>
        <p>
          This is the opening planning position in the House account. The prior-cycle entries describe House movement, not a personal consumption account.
        </p>
      </div>
    );
  } else if (dialog.kind === "adult_kin_subject") {
    const person = householdProjection?.membership_context.find(
      (row) => row.protected_person_id === dialog.subject.person_id,
    );
    const arrangement = householdProjection?.adult_kin_arrangements.find(
      (row) => row.person_id === dialog.subject.person_id,
    );
    kicker = "Adult Kin Support";
    title = person?.display_name ?? "Named supported adult";
    body = (
      <div className="uat-source-record">
        <dl>
          <div><dt>Eligibility</dt><dd>{sentenceCase(dialog.subject.support_eligibility ?? dialog.subject.roster_state)}</dd></div>
          <div><dt>Why this remains Household work</dt><dd>{sentenceCase(dialog.subject.classification_reason ?? "continuing House accountability")}</dd></div>
          <div><dt>Support basis</dt><dd>{sentenceCase(dialog.subject.primary_support_basis ?? arrangement?.arrangement_state ?? "not recorded")}</dd></div>
          <div><dt>Residence</dt><dd>{dialog.subject.residence_label ?? person?.primary_residence_label ?? "Not recorded"}</dd></div>
          <div><dt>Independent provision</dt><dd>{sentenceCase(dialog.subject.independence_qualifier ?? "none")}</dd></div>
          <div><dt>Accountable manager</dt><dd>{dialog.subject.manager_person_name ?? "Not recorded"}</dd></div>
        </dl>
        <p>
          This person appears because the House retains a continuing placement or support responsibility. A person fully governed by office, marriage or dower, benefice, education, or care is excluded from this roster.
        </p>
      </div>
    );
  } else if (dialog.kind === "workspace_record") {
    kicker = dialog.responsibilityLabel;
    title = dialog.title;
    footerLabel = "Opening record inspected · no order issued";
    body = (
      <div className="uat-source-record">
        <dl>
          <div><dt>Record state</dt><dd>{playerFacingRecordText(sentenceCase(dialog.state))}</dd></div>
          <div><dt>Source register</dt><dd>{sourceRegisterLabel(dialog.sourcePackage)}</dd></div>
          <div><dt>Record boundary</dt><dd>{playerFacingRecordText(dialog.summary)}</dd></div>
        </dl>
        {dialog.evidence.length > 0 ? (
          <section aria-label="Record provenance">
            {dialog.evidence.map((reference) => {
              const presentation = playerFacingEvidenceReference(reference);
              return (
                <article key={`${reference.field}:${reference.value}`}>
                  <strong>{presentation.label}</strong>
                  <span>{presentation.value}</span>
                </article>
              );
            })}
          </section>
        ) : (
          <p>This evidence family is part of the responsibility’s opening House record.</p>
        )}
      </div>
    );
  } else {
    const person = householdProjection?.membership_context.find(
      (row) => row.protected_person_id === dialog.record.person_id,
    );
    const report = householdProjection?.health_cycle_reports.find(
      (row) =>
        row.person_id === dialog.record.person_id &&
        (!row.health_condition_id || row.health_condition_id === dialog.record.condition_id),
    );
    const care = householdProjection?.care_arrangements.find(
      (row) => row.person_id === dialog.record.person_id,
    );
    kicker = "Service & Care";
    title = person?.display_name ?? "Named care subject";
    body = (
      <div className="uat-source-record">
        <dl>
          <div><dt>Current record</dt><dd>{report?.current_presentation ?? sentenceCase(dialog.record.severity_state)}</dd></div>
          <div><dt>Course since last report</dt><dd>{report?.course_since_last_report ?? "No prior-cycle summary is recorded"}</dd></div>
          <div><dt>Household consequence</dt><dd>{report?.household_consequence ?? "Not recorded"}</dd></div>
          <div><dt>Prior care reading</dt><dd>{report?.prior_care_reading ?? "Not recorded"}</dd></div>
          <div><dt>Current care</dt><dd>{report?.current_care_arrangement ?? sentenceCase(care?.arrangement_state ?? "No specialized arrangement")}</dd></div>
          <div><dt>Review</dt><dd>{report?.review_prompt ?? "Review current care posture"}</dd></div>
        </dl>
        <p>
          {report
            ? `${report.evidence_label ?? "Assessed"}. ${report.evidence_attribution ?? "Completed-cycle Household record."}`
            : "No responsible-manager cycle summary is recorded here."}
        </p>
      </div>
    );
  }

  return (
    <div className="uat-dialog-scrim" ref={scrimRef} role="presentation">
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

function AssignmentDraftEditor({
  council,
  planningAvailable = true,
  projection,
  responsibility,
  sessionContext,
  sourceGenerationId,
}: {
  council: CouncilRoomReadyProjectionV1;
  planningAvailable?: boolean;
  projection: Household1120ReadOnlyProjection;
  responsibility: {
    designKey: CourtOsResponsibilityDesignKey;
    holder: { personId: string; displayName: string } | null;
    scopeId?: string;
    scopeLabel?: string;
    workspaceAssignments?: readonly CourtOsStewardshipWorkspaceAssignmentInputV1[];
  } | HouseholdResponsibilityRuntime | AssignmentPlanningSubject;
  sessionContext: CourtOsSessionContextV1;
  sourceGenerationId: string | null;
}) {
  const designKey = "definition" in responsibility
    ? responsibility.definition.designKey
    : responsibility.designKey;
  const scopeId = "definition" in responsibility ? undefined : responsibility.scopeId;
  const workspaceAssignments = "definition" in responsibility
    ? []
    : responsibility.workspaceAssignments ?? [];
  const planning = useMemo(
    () => buildCourtOsStewardshipPlanningProjection({
      projection,
      session: sessionContext,
      council,
      authority_source_generation_id: sourceGenerationId,
      workspace_assignment_rows: workspaceAssignments,
    }),
    [council, projection, sessionContext, sourceGenerationId, workspaceAssignments],
  );
  const exactResponsibility = planning.responsibilities.find(
    (candidate) => candidate.responsibility_id === designKey,
  );
  const exactScopes = (exactResponsibility?.scopes ?? []).filter(
    (scope) => scopeId === undefined || scope.scope_id === scopeId,
  );
  const selectedResponsibility = exactResponsibility
    ? [{ ...exactResponsibility, scopes: planningAvailable ? exactScopes : [] }]
    : [];

  if (!planning.context) {
    return (
      <section className="uat-assignment-draft" aria-label="Assignment planning draft">
        <p className="uat-assignment-draft-error" role="status">
          Assignment planning is unavailable for the current House authority record.
        </p>
      </section>
    );
  }

  return (
    <CourtOsStewardshipPlanner
      candidatesForScope={(scope) =>
        planning.candidates_by_scope.get(
          courtOsStewardshipScopeKey(scope.responsibility_id, scope.scope_id),
        ) ?? []
      }
      context={planning.context}
      initialResponsibilityId={designKey}
      initialScopeId={scopeId}
      responsibilities={selectedResponsibility}
      storage={courtOsPlayerPlanningStorage()}
    />
  );
}

export function RouteBar({
  route,
  selectedManor,
  onCouncil,
  onHouseCommand,
  onDomain,
}: {
  route: CourtOsRoute;
  selectedManor: CourtOsSpatialManor | null;
  onCouncil: () => void;
  onHouseCommand: () => void;
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
      <button
        aria-current={scene === "house_command" ? "step" : undefined}
        aria-label="Open House Command: assignments, delegation, and authority"
        disabled={scene === "house_command"}
        onClick={onHouseCommand}
        type="button"
      >
        <i aria-hidden="true" />
        House Command
      </button>
      {scene === "council_docket" ? (
        <button aria-current="step" disabled type="button">
          <i aria-hidden="true" />
          Council Docket
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

type ScenePresentation = {
  art: string;
  position: string;
  presentationKey: string;
};

function scenePresentation(
  route: CourtOsRoute,
  scene: Scene,
  houseId: string,
): ScenePresentation {
  if (scene === "council") {
    return { art: councilRoomArtForHouse(houseId), position: "50% 50%", presentationKey: "inner-council" };
  }
  if (scene === "house_command") {
    if (route.detail?.kind === "command_responsibility") {
      return {
        art: "/assets/courtos/rooms/house-command/office-post-appointments-v1.jpg",
        position: "50% 48%",
        presentationKey: "office-post-appointments-v1",
      };
    }
    return {
      art: "/assets/courtos/rooms/house-command/house-command-entry-v1.jpg",
      position: "50% 46%",
      presentationKey: "house-command-v1",
    };
  }
  if (scene === "council_docket") {
    return {
      art: "/assets/council-command-room/command-surfaces/council-empty-table-plate.png",
      position: "50% 50%",
      presentationKey: "council-docket-v1",
    };
  }
  if (route.place.kind === "responsibility") {
    const resolved = resolveCourtOsResponsibilityPresentation(
      route.place.domain,
      route.place.responsibility,
    );
    if (resolved.posture === "available") {
      return {
        art: resolved.setting.art,
        position: resolved.setting.focalPoint ?? resolved.variant.background.focalPoint,
        presentationKey: `${resolved.variant.key}:${resolved.setting.fixture}`,
      };
    }
  }
  if (route.place.kind === "domain") {
    const resolved = resolveCourtOsRoomPresentation(route.place.domain);
    if (resolved.posture === "available") {
      return {
        art: resolved.variant.art,
        position: resolved.variant.background.focalPoint,
        presentationKey: resolved.variant.key,
      };
    }
  }
  return { art: HOUSEHOLD_SOLAR_ART, position: "50% 50%", presentationKey: "withheld-room-fallback" };
}

function roomToneForScene(scene: Scene): string {
  const domain = COURTOS_DOMAINS.find((item) => item.key === scene);
  if (domain) return domain.visualTone;
  if (
    scene === "stores" ||
    scene === "adult_kin" ||
    scene === "education" ||
    scene === "service_care"
  ) {
    return "hearth";
  }
  if (scene === "manor_stewardship") return "estate";
  return "command";
}

export interface HouseholdVerticalSliceProps {
  /**
   * Injected from the admitted Journey + Knowledge read port.  Absence means
   * that no Journey claim is made; the shell never fabricates an empty runtime.
   */
  journeyCourtOsModel?: JourneyCourtOsReadModelV1 | null;
}

export function courtOsRouteForAssignmentDialog(input: {
  responsibility: CourtOsResponsibilityDesignKey;
  scopeId?: string | null;
}): CourtOsRoute {
  const target = courtOsResponsibilityRoute({
    responsibility: input.responsibility,
    scopeId: input.scopeId ?? null,
  });
  if (input.responsibility === "office_post_appointments") return target;
  return {
    ...target,
    detail: { kind: "assignment_basis" },
  };
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
  const [route, setRoute] = useState<CourtOsRoute>(() =>
    typeof window === "undefined"
      ? COURTOS_INITIAL_ROUTE
      : courtOsRouteFromSearch(window.location.search),
  );
  const scene = sceneForRoute(route);
  const responsibilityPlace =
    route.place.kind === "responsibility" ? route.place : null;
  const householdRoute =
    route.place.kind === "domain"
      ? route.place.domain === "household"
      : responsibilityPlace
        ? HOUSEHOLD_RESPONSIBILITIES.some(
            (responsibility) =>
              responsibility.designKey === responsibilityPlace.responsibility,
          )
        : false;
  // Council boot is intentionally light. Household data begins only when a
  // Household place is selected, including House Command where it supplies
  // the planning register.
  // The current unified opening projection carries the shared 24-responsibility
  // authority register as well as the four Household workspaces. Every
  // responsibility drill-down therefore needs that projection even when its
  // domain-owned records are fetched through the lazy workspace endpoint.
  const householdProjectionRequired =
    householdRoute || scene === "house_command" || responsibilityPlace !== null;
  const estateProjectionRequired =
    scene === "estate_holdings" || scene === "manor_stewardship";
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
    enabled: householdProjectionRequired,
    reloadKey,
  });
  const councilState = useCouncilRoom1120Data(resolvedHouseId ?? houseId, reloadKey);
  const spatialState = useCourtOsSpatialPortfolio(resolvedHouseId ?? houseId, {
    enabled: estateProjectionRequired,
  });
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

  const responsibilityWorkspaceState = useResponsibilityWorkspace({
    houseId: resolvedHouseId,
    responsibility:
      responsibilityPlace &&
      responsibilityPlace.responsibility !== "manor_stewardship" &&
      !HOUSEHOLD_RESPONSIBILITIES.some(
        (responsibility) => responsibility.designKey === responsibilityPlace.responsibility,
      )
        ? responsibilityPlace.responsibility
        : null,
    reloadKey,
  });
  // House Command supplements the House-wide authority register with the
  // three exact conditional-scope families. These are independent hooks so
  // the shared lazy workspace boundary remains intact outside House Command.
  const houseCommandWorksState = useResponsibilityWorkspace({
    houseId: resolvedHouseId,
    responsibility: scene === "house_command" ? "works_project_supervision" : null,
    reloadKey,
  });
  const houseCommandFranchiseState = useResponsibilityWorkspace({
    houseId: resolvedHouseId,
    responsibility: scene === "house_command" ? "franchise_operations" : null,
    reloadKey,
  });
  const houseCommandPortfolioState = useResponsibilityWorkspace({
    houseId: resolvedHouseId,
    responsibility: scene === "house_command" ? "portfolio_oversight" : null,
    reloadKey,
  });
  const houseCommandWorkspaceAssignments = useMemo(
    () => [
      ...stewardshipWorkspaceAssignments("works_project_supervision", houseCommandWorksState),
      ...stewardshipWorkspaceAssignments("franchise_operations", houseCommandFranchiseState),
      ...stewardshipWorkspaceAssignments("portfolio_oversight", houseCommandPortfolioState),
    ],
    [houseCommandFranchiseState, houseCommandPortfolioState, houseCommandWorksState],
  );
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
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById("courtos-active-surface")?.focus({ preventScroll: true });
      });
    });
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

  const projection = householdState.status === "ready" ? householdState.data : null;

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
      detail.kind === "command_responsibility" &&
      place.kind === "house_command" &&
      projection
    ) {
      const rows = projection.responsibility_summary.filter(
        (row) =>
          row.source_legacy_responsibility_id ===
          "courtos.responsibility.office_post_appointments",
      );
      const holder = rows.find(
        (row) => row.holder_person_id && row.holder_display_name,
      ) ?? null;
      return {
        kind: "assignment",
        responsibility: {
          designKey: "office_post_appointments",
          title: "Office & Post Appointments",
          holder: holder?.holder_person_id && holder.holder_display_name
            ? { personId: holder.holder_person_id, displayName: holder.holder_display_name }
            : null,
          stateLabel: rows.length > 0
            ? "Current appointing stewardship is ready for review"
            : "No appointing stewardship scope is recorded",
        },
      };
    }
    if (
      detail.kind === "assignment_basis" &&
      place.kind === "responsibility"
    ) {
      const householdResponsibility = householdRuntime?.data?.responsibilities.find(
        (candidate) => candidate.definition.designKey === place.responsibility,
      );
      if (householdResponsibility) {
        return {
          kind: "assignment",
          responsibility: assignmentSubjectForHousehold(householdResponsibility),
        };
      }
      const definition = courtOsResponsibility(place.responsibility);
      const authorityRows = (projection?.responsibility_summary ?? []).filter(
        (row) =>
          row.source_legacy_responsibility_id ===
          `courtos.responsibility.${place.responsibility}` &&
          (!place.scopeId || row.authority_scope_id === place.scopeId),
      );
      const authority = authorityRows.find(
        (row) => row.holder_person_id && row.holder_display_name,
      ) ?? null;
      const workspaceAssignments = stewardshipWorkspaceAssignments(
        place.responsibility,
        responsibilityWorkspaceState,
      );
      const workspaceScopes = responsibilityWorkspaceState.status === "ready"
        ? courtOsWorkspaceAssignmentScopes(responsibilityWorkspaceState.data.rows)
        : [];
      const workspaceScope = place.scopeId
        ? workspaceScopes.find((scope) => scope.scope_id === place.scopeId) ?? null
        : workspaceScopes.length === 1 ? workspaceScopes[0]! : null;
      const holder = authority?.holder_person_id && authority.holder_display_name
        ? { personId: authority.holder_person_id, displayName: authority.holder_display_name }
        : workspaceScope?.holder_person_id && workspaceScope.holder_display_name
          ? { personId: workspaceScope.holder_person_id, displayName: workspaceScope.holder_display_name }
          : null;
      return {
        kind: "assignment",
        responsibility: {
          designKey: place.responsibility,
          title: definition.label,
          holder,
          scopeId: place.scopeId ?? undefined,
          scopeLabel: authority?.authority_scope_label ?? workspaceScope?.scope_label ?? undefined,
          workspaceAssignments,
          stateLabel: authorityRows.length > 0 || workspaceScope
            ? "Current stewardship is ready for review"
            : "No stewardship scope is recorded",
        },
      };
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
    if (
      detail.kind === "stores_position" &&
      householdState.status === "ready"
    ) {
      const position = householdState.data.stores_positions.find(
        (candidate) => candidate.stores_position_id === detail.recordId,
      );
      return position ? { kind: "stores_position", position } : null;
    }
    if (
      detail.kind === "adult_kin_subject" &&
      householdState.status === "ready"
    ) {
      const subject = householdState.data.adult_kin_roster.find(
        (candidate) => candidate.support_roster_id === detail.recordId,
      );
      return subject ? { kind: "adult_kin_subject", subject } : null;
    }
    if (
      detail.kind === "health_record" &&
      householdState.status === "ready"
    ) {
      const record = householdState.data.health_roster.find(
        (candidate) => candidate.health_roster_id === detail.recordId,
      );
      return record ? { kind: "health_record", record } : null;
    }
    if (
      detail.kind === "workspace_record" &&
      place.kind === "responsibility"
    ) {
      const [recordKind, rawIndex] = detail.recordId.split(":");
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || index < 0) return null;
      const responsibility = courtOsResponsibility(place.responsibility);
      const source = responsibilityWorkspaceSource(place.responsibility);
      if (recordKind === "evidence") {
        const evidence = source.evidence[index];
        return evidence ? {
          kind: "workspace_record",
          recordId: detail.recordId,
          responsibilityLabel: responsibility.label,
          title: evidence,
          sourcePackage: source.packageId,
          state: source.posture,
          summary: source.boundary,
          evidence: [],
        } : null;
      }
      if (recordKind === "source" && responsibilityWorkspaceState.status === "ready") {
        const record = responsibilityWorkspaceState.data.rows[index];
        return record ? {
          kind: "workspace_record",
          recordId: detail.recordId,
          responsibilityLabel: responsibility.label,
          title: record.subject_label ?? record.scope_label ?? record.source_table.replace(/_/g, " "),
          sourcePackage: source.packageId,
          state: record.state ?? "opening read record",
          summary: record.source_table.replace(/_/g, " "),
          evidence: record.evidence_references,
        } : null;
      }
    }
    return null;
  }, [householdRuntime, householdState, projection, responsibilityWorkspaceState, route, shellRuntime]);

  function openDialog(next: Exclude<DialogState, null>) {
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (next.kind === "assignment") {
      detailPushedInSession.current = true;
      navigate(courtOsRouteForAssignmentDialog({
        responsibility: next.responsibility.designKey,
        scopeId: next.responsibility.scopeId,
      }));
      return;
    }
    let detail: CourtOsDetail;
    if (next.kind === "council_person") {
      detail = {
        kind: "council_person",
        personId: next.person.person_ref.entity_id,
      };
    } else if (next.kind === "education_plan") {
      detail = {
        kind: "education_plan",
        recordId: next.plan.education_assignment_id,
      };
    } else if (next.kind === "stores_position") {
      detail = {
        kind: "stores_position",
        recordId: next.position.stores_position_id,
      };
    } else if (next.kind === "adult_kin_subject") {
      detail = {
        kind: "adult_kin_subject",
        recordId: next.subject.support_roster_id,
      };
    } else if (next.kind === "workspace_record") {
      detail = {
        kind: "workspace_record",
        recordId: next.recordId,
      };
    } else {
      detail = {
        kind: "health_record",
        recordId: next.record.health_roster_id,
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
        detail="The Council record is unavailable. No substitute Council will be shown."
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

  if (householdProjectionRequired && householdState.status === "error") {
    return (
      <DataState
        code={householdState.error.code}
        detail="The Household read contract is unavailable. No substitute Household will be shown."
        onRetry={retrySources}
        state="error"
      />
    );
  }
  if (householdProjectionRequired && householdState.status === "blocked") {
    return <DataState code={householdState.error.code} detail={householdState.error.message} state="blocked" />;
  }
  if (householdProjectionRequired && householdRuntime?.error) {
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
    householdProjectionRequired &&
    (householdState.status !== "ready" || !householdRuntime?.data)
  ) {
    return <DataState state="loading" />;
  }

  const model = shellRuntime.data;
  const householdModel = householdRuntime?.data ?? null;
  const presentation = scenePresentation(route, scene, model.house.houseId);
  const selectedManor =
    spatialState.status === "ready"
      ? spatialState.portfolio?.manors.find((manor) => manor.manor_id === selectedManorId) ??
        spatialState.portfolio?.manors[0] ??
        null
      : null;

  return (
    <main className="uat-app" data-dialog-open={Boolean(dialog)}>
      <a className="uat-skip-link" href="#courtos-active-surface">
        Skip to the current CourtOS surface
      </a>
      <AppHeader model={model} route={route} />
      <div
        className="uat-venue"
        data-scene={scene}
        data-room-presentation={presentation.presentationKey}
        data-room-tone={roomToneForScene(scene)}
        id="courtos-active-surface"
        key={`${model.house.houseId}:${scene}`}
        tabIndex={-1}
        style={{
          backgroundImage: `url("${presentation.art}")`,
          backgroundPosition: presentation.position,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
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
        {scene === "house_command" && projection ? (
          <HouseCommandReadSurface
            council={councilState.data}
            focusedResponsibility={
              route.detail?.kind === "command_responsibility"
                ? route.detail.responsibility
                : null
            }
            houseName={model.house.displayName}
            onManageAssignment={(responsibility) =>
              openDialog({ kind: "assignment", responsibility })
            }
            onOpenResponsibility={(responsibility) =>
              navigate(courtOsResponsibilityRoute({ responsibility }))
            }
            projection={projection}
            sessionContext={courtOsState.context}
            workspaceAssignments={houseCommandWorkspaceAssignments}
            journeyContext={
              journeyCourtOsModel ? (
                <JourneyHouseCommandContext
                  model={journeyCourtOsModel}
                  onDomainCommand={openJourneyOwningWorkspace}
                />
              ) : null
            }
          />
        ) : null}
        {(scene === "council_docket" || (scene === "house_command" && !projection)) ? (
          <ReservedCourtOsSurface
            hasAdmittedHouseActorProjection={false}
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
        {estateProjectionRequired ? (
          <React.Suspense
            fallback={
              <section className="uat-estate-route-loading" role="status">
                <small>Estate &amp; Holdings</small>
                <strong>Preparing the land record</strong>
              </section>
            }
          >
            <EstateHoldingsScene
            authority={projection?.responsibility_summary ?? []}
            assignmentContext={
              scene === "manor_stewardship" && projection && selectedManor ? (
                <AssignmentDraftEditor
                  council={councilState.data}
                  projection={projection}
                  sourceGenerationId={FOUNDATION_A_UAT1_RESPONSIBILITY_AUTHORITY_SOURCE_GENERATION}
                  responsibility={{
                    designKey: "manor_stewardship",
                    scopeId: selectedManor.manor_id,
                    scopeLabel: selectedManor.display_name,
                    holder: (() => {
                      const authority = manorStewardshipAuthority(
                        selectedManor,
                        projection.responsibility_summary,
                      );
                      return authority?.holder_person_id && authority.holder_display_name
                        ? {
                            personId: authority.holder_person_id,
                            displayName: authority.holder_display_name,
                          }
                        : null;
                    })(),
                  }}
                  sessionContext={courtOsState.context}
                />
              ) : null
            }
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
          </React.Suspense>
        ) : null}
        {route.place.kind === "domain" &&
        route.place.domain !== "household" &&
        route.place.domain !== "estate_holdings" ? (
          <DomainRoomScene
            authority={projection?.responsibility_summary ?? []}
            domain={courtOsDomain(route.place.domain)}
            houseId={model.house.houseId}
            houseName={model.house.displayName}
            onOpenResponsibility={(responsibility) =>
              navigate(courtOsResponsibilityRoute({ responsibility }))
            }
          />
        ) : null}
        {responsibilityPlace &&
        projection &&
        responsibilityPlace.responsibility !== "manor_stewardship" &&
        !HOUSEHOLD_RESPONSIBILITIES.some(
          (responsibility) =>
            responsibility.designKey === responsibilityPlace.responsibility,
        ) ? (
          <ResponsibilityWorkspaceScene
            authority={projection?.responsibility_summary ?? []}
            council={councilState.data}
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
            onScopeChange={(scopeId) =>
              navigate(
                courtOsResponsibilityRoute({
                  responsibility: responsibilityPlace.responsibility,
                  scopeId,
                }),
                { replace: true },
              )
            }
            onOpenAssignment={(responsibility) =>
              openDialog({ kind: "assignment", responsibility })
            }
            onOpenWorkspaceRecord={(record) => openDialog(record)}
            onRetryWorkspace={retrySources}
            projection={projection!}
            responsibilityKey={responsibilityPlace.responsibility}
            routeScopeId={responsibilityPlace.scopeId}
            sessionContext={courtOsState.context}
            workspaceState={responsibilityWorkspaceState}
          />
        ) : null}
        {scene === "stores" || scene === "adult_kin" || scene === "education" || scene === "service_care" ? (
          householdModel && projection ? <ResponsibilityScene
            council={councilState.data}
            model={householdModel}
            onInspectAssignment={(responsibility) =>
              openDialog({
                kind: "assignment",
                responsibility: assignmentSubjectForHousehold(responsibility),
              })
            }
            onOpenPlan={(plan) =>
              openDialog({ kind: "education_plan", plan })
            }
            onOpenStoresPosition={(position) =>
              openDialog({ kind: "stores_position", position })
            }
            onOpenAdultKinSubject={(subject) =>
              openDialog({ kind: "adult_kin_subject", subject })
            }
            onOpenHealthRecord={(record) =>
              openDialog({ kind: "health_record", record })
            }
            onSelect={(key) => navigateScene(key)}
            projection={projection}
            sessionContext={courtOsState.context}
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
        onHouseCommand={() => {
          navigateScene("house_command");
        }}
        onDomain={(domain) => {
          navigateScene(domain);
        }}
        route={route}
        selectedManor={selectedManor}
      />
      <span className="uat-source-stamp">
        As of {model.effectiveDate} · Inner Council
      </span>
      {dialog ? (
        <RecordDialog
          council={councilState.data}
          dialog={dialog}
          householdProjection={projection}
          onClose={closeDialog}
          sessionContext={courtOsState.context}
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
        detail="This player session can open only its configured House. No operational record has been requested."
        state="blocked"
      />
    );
  }
  return <AuthorizedHouseholdVerticalSlice {...props} />;
}
