export type CourtOsDomainKey =
  | "household"
  | "marriage_dynasty"
  | "estate_holdings"
  | "resources_finance"
  | "records_correspondence"
  | "security_readiness"
  | "court_relations"
  | "church";

export type CourtOsResponsibilityDesignKey =
  | "office_post_appointments"
  | "household_stores_provisioning_procurement"
  | "adult_kin_support"
  | "education_formation"
  | "household_service_care"
  | "marriage_dynasty_stewardship"
  | "patronage_hospitality_gifts"
  | "manor_stewardship"
  | "estate_fabric_maintenance_oversight"
  | "works_project_supervision"
  | "franchise_operations"
  | "portfolio_oversight"
  | "house_fiscal_administration"
  | "manor_fiscal_administration"
  | "revenue_right_administration_collection"
  | "reception_intake"
  | "records_archives"
  | "correspondence_dispatch"
  | "security_asset_protection"
  | "martial_readiness_training"
  | "martial_stores_horse_capacity"
  | "external_relations_representation"
  | "household_observance_chaplaincy"
  | "church_rights_institutional_affairs";

export type CourtOsResponsibilityDefinition = {
  key: CourtOsResponsibilityDesignKey;
  label: string;
  shortLabel: string;
  scope: "house" | "manor" | "portfolio" | "project" | "facility" | "right" | "channel" | "archive" | "target" | "instrument" | "appointing_scope";
  conditional?: boolean;
};

export type CourtOsRoomComposition =
  | "hearth_solar"
  | "dynasty_folio_chamber"
  | "estate_survey_office"
  | "counting_ledger_chamber"
  | "records_scriptorium"
  | "readiness_muster_room"
  | "audience_receiving_room"
  | "chapel_oratory";

export type CourtOsRoomAnchor =
  | "near_left"
  | "near_center"
  | "near_right"
  | "mid_left"
  | "mid_center"
  | "mid_right"
  | "far_left"
  | "far_center"
  | "far_right";

export type CourtOsRoomPresentationVariant = {
  /** Stable authored-venue identity. It is never derived from a House name or id. */
  key: string;
  art: string;
  composition: CourtOsRoomComposition;
  titleAnchor?: "top_left" | "top_center" | "top_right";
  /** Human-auditable shorthand retained for art-direction and snapshot review. */
  anchorMap: string;
  /** Room backdrops are always a single authored environment, never tiled scenery. */
  background: {
    fit: "cover";
    repeat: "no-repeat";
    focalPoint: `${number}% ${number}%`;
  };
  settings: readonly {
    responsibility: CourtOsResponsibilityDesignKey;
    anchor: CourtOsRoomAnchor;
    /** Semantic fixture identity; presentation only, never a source-data assertion. */
    fixture: string;
    /** A dedicated enclosed setting for this responsibility, not a reskinned room entry. */
    art: string;
    focalPoint?: `${number}% ${number}%`;
  }[];
};

export type CourtOsDomainDefinition = {
  key: CourtOsDomainKey;
  label: string;
  venue: string;
  /** A semantic treatment token, not an entitlement or source-data claim. */
  visualTone:
    | "hearth"
    | "dynasty"
    | "estate"
    | "ledger"
    | "record"
    | "readiness"
    | "audience"
    | "chapel";
  purpose: string;
  /** Stable CourtOS navigation contract shared by every operational room. */
  interactionPattern: "place_responsibility";
  objectLabel: string;
  objectDetail: string;
  art: string;
  /**
   * Presentation variants change only the authored environment and its anchor
   * map. Navigation, responsibility state, authority, and planning remain on
   * the stable domain contract.
   */
  presentationVariants: readonly CourtOsRoomPresentationVariant[];
  responsibilities: readonly CourtOsResponsibilityDefinition[];
};

const PLACE_RESPONSIBILITY_FLOW = {
  interactionPattern: "place_responsibility",
} as const;

export type CourtOsResponsibilityLocation =
  | { kind: "house_command" }
  | { kind: "operational_domain"; domain: CourtOsDomainKey };

const HOUSEHOLD_ART =
  "/assets/courtos/rooms/household/household-solar-entry-v2.jpg";
const DYNASTY_ART =
  "/assets/courtos/rooms/marriage-dynasty/dynasty-chamber-entry-v1.jpg";
const ESTATE_ART =
  "/assets/courtos/rooms/estate-holdings/estate-office-entry-v1.jpg";
const FINANCE_ART =
  "/assets/fiscal-office/candleton-fiscal-office-room.jpg";
const RECORDS_ART =
  "/assets/courtos/rooms/records-correspondence/records-room-entry-v2.jpg";
const READINESS_ART =
  "/assets/courtos/rooms/security-readiness/readiness-chamber-entry-v2.jpg";
const AUDIENCE_ART =
  "/assets/courtos/rooms/court-relations/audience-chamber-entry-v1.jpg";
const CHAPEL_ART =
  "/assets/courtos/rooms/church/house-chapel-entry-v1.jpg";

export const COURTOS_DOMAINS: readonly CourtOsDomainDefinition[] = [
  {
    ...PLACE_RESPONSIBILITY_FLOW,
    key: "household",
    label: "Household",
    venue: "The Household Solar",
    visualTone: "hearth",
    purpose: "Provision, adult dependants, formation, service, and continuing care.",
    objectLabel: "Hearth & provision chest",
    objectDetail: "The people and ordinary work that sustain the House.",
    art: HOUSEHOLD_ART,
    presentationVariants: [
      {
        key: "household-solar-hearth-v1",
        art: HOUSEHOLD_ART,
        composition: "hearth_solar",
        anchorMap: "provision-chest|kinship-bench|tutors-desk|care-hearth",
        background: { fit: "cover", repeat: "no-repeat", focalPoint: "50% 48%" },
        settings: [
          { responsibility: "household_stores_provisioning_procurement", anchor: "near_left", fixture: "provision-chest", art: "/assets/courtos/rooms/household/household-stores-v2.jpg" },
          { responsibility: "adult_kin_support", anchor: "mid_center", fixture: "kinship-bench", art: "/assets/courtos/rooms/household/adult-kin-support-v3.jpg" },
          { responsibility: "education_formation", anchor: "near_right", fixture: "tutors-desk", art: "/assets/courtos/rooms/household/education-formation-v3.jpg" },
          { responsibility: "household_service_care", anchor: "mid_right", fixture: "care-hearth", art: "/assets/courtos/rooms/household/household-service-care-v2.jpg" },
        ],
      },
    ],
    responsibilities: [
      { key: "household_stores_provisioning_procurement", label: "Household Stores, Provisioning & Procurement", shortLabel: "Stores & Provisioning", scope: "house" },
      { key: "adult_kin_support", label: "Adult Kin Support", shortLabel: "Adult Kin", scope: "house" },
      { key: "education_formation", label: "Education & Formation", shortLabel: "Education", scope: "house" },
      { key: "household_service_care", label: "Household Service & Care", shortLabel: "Service & Care", scope: "house" },
    ],
  },
  {
    ...PLACE_RESPONSIBILITY_FLOW,
    key: "marriage_dynasty",
    label: "Marriage & Dynasty",
    venue: "The Dynasty Chamber",
    visualTone: "dynasty",
    purpose: "Marriage planning, family continuity, patronage, hospitality, and gifts.",
    objectLabel: "Sealed family folio",
    objectDetail: "Unions, successors, guests, and cultivated obligations.",
    art: DYNASTY_ART,
    presentationVariants: [
      {
        key: "dynasty-folio-chamber-v1",
        art: DYNASTY_ART,
        composition: "dynasty_folio_chamber",
        anchorMap: "lineage-table|hospitality-board",
        background: { fit: "cover", repeat: "no-repeat", focalPoint: "52% 46%" },
        settings: [
          { responsibility: "marriage_dynasty_stewardship", anchor: "mid_left", fixture: "lineage-table", art: "/assets/courtos/rooms/marriage-dynasty/marriage-dynasty-stewardship-v1.jpg" },
          { responsibility: "patronage_hospitality_gifts", anchor: "mid_right", fixture: "hospitality-board", art: "/assets/courtos/rooms/marriage-dynasty/patronage-hospitality-gifts-v1.jpg" },
        ],
      },
    ],
    responsibilities: [
      { key: "marriage_dynasty_stewardship", label: "Marriage & Dynasty Stewardship", shortLabel: "Dynasty Stewardship", scope: "house" },
      { key: "patronage_hospitality_gifts", label: "Patronage, Hospitality & Gifts", shortLabel: "Patronage & Hospitality", scope: "house" },
    ],
  },
  {
    ...PLACE_RESPONSIBILITY_FLOW,
    key: "estate_holdings",
    label: "Estate & Holdings",
    venue: "The Estate Office",
    visualTone: "estate",
    purpose: "Manors, estate fabric, works, franchises, and portfolio stewardship.",
    objectLabel: "Manor model & survey map",
    objectDetail: "The House lands and the work bound to each place.",
    art: ESTATE_ART,
    presentationVariants: [
      {
        key: "estate-survey-office-v1",
        art: ESTATE_ART,
        composition: "estate_survey_office",
        anchorMap: "manor-map|fabric-board|works-model|franchise-roll|portfolio-rack",
        background: { fit: "cover", repeat: "no-repeat", focalPoint: "48% 45%" },
        settings: [
          { responsibility: "manor_stewardship", anchor: "near_center", fixture: "manor-map", art: "/assets/courtos/rooms/estate-holdings/manor-stewardship-v1.jpg" },
          { responsibility: "estate_fabric_maintenance_oversight", anchor: "mid_left", fixture: "fabric-board", art: "/assets/courtos/rooms/estate-holdings/estate-fabric-maintenance-oversight-v2.jpg" },
          { responsibility: "works_project_supervision", anchor: "mid_right", fixture: "works-model", art: "/assets/courtos/rooms/estate-holdings/works-project-supervision-v1.jpg" },
          { responsibility: "franchise_operations", anchor: "far_left", fixture: "franchise-roll", art: "/assets/courtos/rooms/estate-holdings/franchise-operations-v1.jpg" },
          { responsibility: "portfolio_oversight", anchor: "far_right", fixture: "portfolio-rack", art: "/assets/courtos/rooms/estate-holdings/portfolio-oversight-v2.jpg" },
        ],
      },
    ],
    responsibilities: [
      { key: "manor_stewardship", label: "Manor Stewardship", shortLabel: "Manor Stewardship", scope: "manor" },
      { key: "estate_fabric_maintenance_oversight", label: "Estate Fabric & Maintenance Oversight", shortLabel: "Estate Fabric", scope: "house" },
      { key: "works_project_supervision", label: "Works Project Supervision", shortLabel: "Works Projects", scope: "project" },
      { key: "franchise_operations", label: "Franchise Operations", shortLabel: "Franchises", scope: "facility" },
      { key: "portfolio_oversight", label: "Portfolio Oversight", shortLabel: "Portfolio Oversight", scope: "portfolio", conditional: true },
    ],
  },
  {
    ...PLACE_RESPONSIBILITY_FLOW,
    key: "resources_finance",
    label: "Resources & Finance",
    venue: "The Counting Chamber",
    visualTone: "ledger",
    purpose: "Fiscal custody, local accounts, remittance, and revenue rights.",
    objectLabel: "Counting board & account rolls",
    objectDetail: "What entered custody, what moved, and what remains uncertain.",
    art: FINANCE_ART,
    presentationVariants: [
      {
        key: "counting-chamber-ledger-v1",
        art: FINANCE_ART,
        composition: "counting_ledger_chamber",
        titleAnchor: "top_left",
        anchorMap: "great-ledger|manor-rolls|sealed-grants",
        background: { fit: "cover", repeat: "no-repeat", focalPoint: "50% 44%" },
        settings: [
          { responsibility: "house_fiscal_administration", anchor: "near_center", fixture: "great-ledger", art: "/assets/courtos/rooms/resources-finance/house-fiscal-administration-v1.jpg" },
          { responsibility: "manor_fiscal_administration", anchor: "mid_left", fixture: "manor-rolls", art: "/assets/courtos/rooms/resources-finance/manor-fiscal-administration-v1.jpg" },
          { responsibility: "revenue_right_administration_collection", anchor: "mid_right", fixture: "sealed-grants", art: "/assets/courtos/rooms/resources-finance/revenue-right-administration-collection-v2.jpg" },
        ],
      },
    ],
    responsibilities: [
      { key: "house_fiscal_administration", label: "House Fiscal Administration", shortLabel: "House Fiscal", scope: "house" },
      { key: "manor_fiscal_administration", label: "Manor Fiscal Administration", shortLabel: "Manor Fiscal", scope: "manor" },
      { key: "revenue_right_administration_collection", label: "Revenue Right Administration & Collection", shortLabel: "Revenue Rights", scope: "right" },
    ],
  },
  {
    ...PLACE_RESPONSIBILITY_FLOW,
    key: "records_correspondence",
    label: "Records & Correspondence",
    venue: "The Records Room",
    visualTone: "record",
    purpose: "Intake, archive custody, correspondence, dispatch, and source-aware evidence.",
    objectLabel: "Writing desk & archive chest",
    objectDetail: "What arrived, what is preserved, and what may be sent.",
    art: RECORDS_ART,
    presentationVariants: [
      {
        key: "records-scriptorium-v1",
        art: RECORDS_ART,
        composition: "records_scriptorium",
        titleAnchor: "top_left",
        anchorMap: "intake-desk|archive-cupboard|dispatch-table",
        background: { fit: "cover", repeat: "no-repeat", focalPoint: "54% 48%" },
        settings: [
          { responsibility: "reception_intake", anchor: "near_left", fixture: "intake-desk", art: "/assets/courtos/rooms/records-correspondence/reception-intake-v1.jpg" },
          { responsibility: "records_archives", anchor: "mid_center", fixture: "archive-cupboard", art: "/assets/courtos/rooms/records-correspondence/records-archives-v1.jpg" },
          { responsibility: "correspondence_dispatch", anchor: "near_right", fixture: "dispatch-table", art: "/assets/courtos/rooms/records-correspondence/correspondence-dispatch-v1.jpg" },
        ],
      },
    ],
    responsibilities: [
      { key: "reception_intake", label: "Reception & Intake", shortLabel: "Reception & Intake", scope: "channel" },
      { key: "records_archives", label: "Records & Archives", shortLabel: "Records & Archives", scope: "archive" },
      { key: "correspondence_dispatch", label: "Correspondence & Dispatch", shortLabel: "Correspondence", scope: "channel" },
    ],
  },
  {
    ...PLACE_RESPONSIBILITY_FLOW,
    key: "security_readiness",
    label: "Security & Readiness",
    venue: "The Readiness Chamber",
    visualTone: "readiness",
    purpose: "Protection, training, martial stores, horses, and credible readiness.",
    objectLabel: "Shield & readiness map",
    objectDetail: "The protection of people, places, stores, and obligations.",
    art: READINESS_ART,
    presentationVariants: [
      {
        key: "readiness-muster-room-v1",
        art: READINESS_ART,
        composition: "readiness_muster_room",
        anchorMap: "watch-map|muster-board|arms-rack",
        background: { fit: "cover", repeat: "no-repeat", focalPoint: "48% 43%" },
        settings: [
          { responsibility: "security_asset_protection", anchor: "mid_left", fixture: "watch-map", art: "/assets/courtos/rooms/security-readiness/security-asset-protection-v2.jpg" },
          { responsibility: "martial_readiness_training", anchor: "near_center", fixture: "muster-board", art: "/assets/courtos/rooms/security-readiness/martial-readiness-training-v2.jpg" },
          { responsibility: "martial_stores_horse_capacity", anchor: "mid_right", fixture: "arms-rack", art: "/assets/courtos/rooms/security-readiness/martial-stores-horse-capacity-v1.jpg" },
        ],
      },
    ],
    responsibilities: [
      { key: "security_asset_protection", label: "Security & Asset Protection", shortLabel: "Asset Protection", scope: "manor" },
      { key: "martial_readiness_training", label: "Martial Readiness & Training", shortLabel: "Readiness & Training", scope: "portfolio" },
      { key: "martial_stores_horse_capacity", label: "Martial Stores & Horse Capacity", shortLabel: "Stores & Horses", scope: "portfolio" },
    ],
  },
  {
    ...PLACE_RESPONSIBILITY_FLOW,
    key: "court_relations",
    label: "Court & Relations",
    venue: "The Audience Chamber",
    visualTone: "audience",
    purpose: "External relationships, court presence, and representation.",
    objectLabel: "Audience chairs & realm map",
    objectDetail: "The people and institutions the House must cultivate or watch.",
    art: AUDIENCE_ART,
    presentationVariants: [
      {
        key: "audience-receiving-room-v1",
        art: AUDIENCE_ART,
        composition: "audience_receiving_room",
        anchorMap: "receiving-table",
        background: { fit: "cover", repeat: "no-repeat", focalPoint: "50% 42%" },
        settings: [
          { responsibility: "external_relations_representation", anchor: "near_center", fixture: "receiving-table", art: "/assets/courtos/rooms/court-relations/external-relations-representation-v1.jpg" },
        ],
      },
    ],
    responsibilities: [
      { key: "external_relations_representation", label: "External Relations & Representation", shortLabel: "External Relations", scope: "target" },
    ],
  },
  {
    ...PLACE_RESPONSIBILITY_FLOW,
    key: "church",
    label: "Church",
    venue: "The House Chapel",
    visualTone: "chapel",
    purpose: "Household observance, chaplaincy, rights, and institutional affairs.",
    objectLabel: "Kneeler & chapel book",
    objectDetail: "The House's observance and its exact institutional obligations.",
    art: CHAPEL_ART,
    presentationVariants: [
      {
        key: "chapel-oratory-v1",
        art: CHAPEL_ART,
        composition: "chapel_oratory",
        anchorMap: "house-kneeler|rights-lectern",
        background: { fit: "cover", repeat: "no-repeat", focalPoint: "50% 42%" },
        settings: [
          { responsibility: "household_observance_chaplaincy", anchor: "near_left", fixture: "house-kneeler", art: "/assets/courtos/rooms/church/household-observance-chaplaincy-v1.jpg" },
          { responsibility: "church_rights_institutional_affairs", anchor: "mid_right", fixture: "rights-lectern", art: "/assets/courtos/rooms/church/church-rights-institutional-affairs-v1.jpg" },
        ],
      },
    ],
    responsibilities: [
      { key: "household_observance_chaplaincy", label: "Household Observance & Chaplaincy", shortLabel: "Observance & Chaplaincy", scope: "house" },
      { key: "church_rights_institutional_affairs", label: "Church Rights & Institutional Affairs", shortLabel: "Church Rights", scope: "instrument", conditional: true },
    ],
  },
] as const;

export const COURTOS_COMMAND_RESPONSIBILITIES: readonly CourtOsResponsibilityDefinition[] = [
  {
    key: "office_post_appointments",
    label: "Office & Post Appointments",
    shortLabel: "Office Appointments",
    scope: "appointing_scope",
  },
] as const;

export const COURTOS_RESPONSIBILITIES: readonly CourtOsResponsibilityDefinition[] = [
  ...COURTOS_COMMAND_RESPONSIBILITIES,
  ...COURTOS_DOMAINS.flatMap((domain) => domain.responsibilities),
] as const;

export function courtOsDomain(key: CourtOsDomainKey): CourtOsDomainDefinition {
  const domain = COURTOS_DOMAINS.find((candidate) => candidate.key === key);
  if (!domain) throw new Error(`Unknown CourtOS domain: ${key}`);
  return domain;
}

export function courtOsResponsibility(
  key: CourtOsResponsibilityDesignKey,
): CourtOsResponsibilityDefinition {
  const responsibility = COURTOS_RESPONSIBILITIES.find(
    (candidate) => candidate.key === key,
  );
  if (responsibility) return responsibility;
  throw new Error(`Unknown CourtOS responsibility: ${key}`);
}

export function courtOsResponsibilityLocation(
  key: CourtOsResponsibilityDesignKey,
): CourtOsResponsibilityLocation {
  if (
    COURTOS_COMMAND_RESPONSIBILITIES.some(
      (responsibility) => responsibility.key === key,
    )
  ) {
    return { kind: "house_command" };
  }
  const domain = COURTOS_DOMAINS.find((candidate) =>
    candidate.responsibilities.some((responsibility) => responsibility.key === key),
  );
  if (!domain) throw new Error(`No CourtOS location owns responsibility: ${key}`);
  return { kind: "operational_domain", domain: domain.key };
}

export function courtOsDomainForResponsibility(
  key: CourtOsResponsibilityDesignKey,
): CourtOsDomainDefinition {
  const location = courtOsResponsibilityLocation(key);
  if (location.kind === "house_command") {
    throw new Error(`Responsibility belongs to House Command, not an operational domain: ${key}`);
  }
  return courtOsDomain(location.domain);
}
