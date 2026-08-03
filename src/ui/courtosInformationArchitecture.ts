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
  objectLabel: string;
  objectDetail: string;
  art: string;
  responsibilities: readonly CourtOsResponsibilityDefinition[];
};

export type CourtOsResponsibilityLocation =
  | { kind: "house_command" }
  | { kind: "operational_domain"; domain: CourtOsDomainKey };

const HOUSEHOLD_ART =
  "/assets/council-command-room/household-vertical-slice/household-place-wide-v1.png";
const DYNASTY_ART =
  "/assets/council-command-room/command-surfaces/family-tree.png";
const ESTATE_ART =
  "/assets/council-command-room/command-surfaces/estate-portfolio.png";
const FINANCE_ART =
  "/assets/council-command-room/command-surfaces/atlas-table.png";
const RECORDS_ART =
  "/assets/council-command-room/command-surfaces/dossier-folio.png";
const READINESS_ART =
  "/assets/council-command-room/command-surfaces/orders-board.png";
const AUDIENCE_ART =
  "/assets/council-command-room/command-surfaces/council-table.png";
const CHAPEL_ART =
  "/assets/council-command-room/command-surfaces/council-empty-table-plate.png";

export const COURTOS_DOMAINS: readonly CourtOsDomainDefinition[] = [
  {
    key: "household",
    label: "Household",
    venue: "The Household Solar",
    visualTone: "hearth",
    purpose: "Provision, adult dependants, formation, service, and continuing care.",
    objectLabel: "Hearth & provision chest",
    objectDetail: "The people and ordinary work that sustain the House.",
    art: HOUSEHOLD_ART,
    responsibilities: [
      { key: "household_stores_provisioning_procurement", label: "Household Stores, Provisioning & Procurement", shortLabel: "Stores & Provisioning", scope: "house" },
      { key: "adult_kin_support", label: "Adult Kin Support", shortLabel: "Adult Kin", scope: "house" },
      { key: "education_formation", label: "Education & Formation", shortLabel: "Education", scope: "house" },
      { key: "household_service_care", label: "Household Service & Care", shortLabel: "Service & Care", scope: "house" },
    ],
  },
  {
    key: "marriage_dynasty",
    label: "Marriage & Dynasty",
    venue: "The Dynasty Chamber",
    visualTone: "dynasty",
    purpose: "Marriage planning, family continuity, patronage, hospitality, and gifts.",
    objectLabel: "Sealed family folio",
    objectDetail: "Unions, successors, guests, and cultivated obligations.",
    art: DYNASTY_ART,
    responsibilities: [
      { key: "marriage_dynasty_stewardship", label: "Marriage & Dynasty Stewardship", shortLabel: "Dynasty Stewardship", scope: "house" },
      { key: "patronage_hospitality_gifts", label: "Patronage, Hospitality & Gifts", shortLabel: "Patronage & Hospitality", scope: "house" },
    ],
  },
  {
    key: "estate_holdings",
    label: "Estate & Holdings",
    venue: "The Estate Office",
    visualTone: "estate",
    purpose: "Manors, estate fabric, works, franchises, and portfolio stewardship.",
    objectLabel: "Manor model & survey map",
    objectDetail: "The House lands and the work bound to each place.",
    art: ESTATE_ART,
    responsibilities: [
      { key: "manor_stewardship", label: "Manor Stewardship", shortLabel: "Manor Stewardship", scope: "manor" },
      { key: "estate_fabric_maintenance_oversight", label: "Estate Fabric & Maintenance Oversight", shortLabel: "Estate Fabric", scope: "house" },
      { key: "works_project_supervision", label: "Works Project Supervision", shortLabel: "Works Projects", scope: "project" },
      { key: "franchise_operations", label: "Franchise Operations", shortLabel: "Franchises", scope: "facility" },
      { key: "portfolio_oversight", label: "Portfolio Oversight", shortLabel: "Portfolio Oversight", scope: "portfolio", conditional: true },
    ],
  },
  {
    key: "resources_finance",
    label: "Resources & Finance",
    venue: "The Counting Chamber",
    visualTone: "ledger",
    purpose: "Fiscal custody, local accounts, remittance, and revenue rights.",
    objectLabel: "Abacus & account rolls",
    objectDetail: "What entered custody, what moved, and what remains uncertain.",
    art: FINANCE_ART,
    responsibilities: [
      { key: "house_fiscal_administration", label: "House Fiscal Administration", shortLabel: "House Fiscal", scope: "house" },
      { key: "manor_fiscal_administration", label: "Manor Fiscal Administration", shortLabel: "Manor Fiscal", scope: "manor" },
      { key: "revenue_right_administration_collection", label: "Revenue Right Administration & Collection", shortLabel: "Revenue Rights", scope: "right" },
    ],
  },
  {
    key: "records_correspondence",
    label: "Records & Correspondence",
    venue: "The Records Room",
    visualTone: "record",
    purpose: "Intake, archive custody, correspondence, dispatch, and source-aware evidence.",
    objectLabel: "Writing desk & archive chest",
    objectDetail: "What arrived, what is preserved, and what may be sent.",
    art: RECORDS_ART,
    responsibilities: [
      { key: "reception_intake", label: "Reception & Intake", shortLabel: "Reception & Intake", scope: "channel" },
      { key: "records_archives", label: "Records & Archives", shortLabel: "Records & Archives", scope: "archive" },
      { key: "correspondence_dispatch", label: "Correspondence & Dispatch", shortLabel: "Correspondence", scope: "channel" },
    ],
  },
  {
    key: "security_readiness",
    label: "Security & Readiness",
    venue: "The Readiness Chamber",
    visualTone: "readiness",
    purpose: "Protection, training, martial stores, horses, and credible readiness.",
    objectLabel: "Shield & readiness map",
    objectDetail: "The protection of people, places, stores, and obligations.",
    art: READINESS_ART,
    responsibilities: [
      { key: "security_asset_protection", label: "Security & Asset Protection", shortLabel: "Asset Protection", scope: "manor" },
      { key: "martial_readiness_training", label: "Martial Readiness & Training", shortLabel: "Readiness & Training", scope: "portfolio" },
      { key: "martial_stores_horse_capacity", label: "Martial Stores & Horse Capacity", shortLabel: "Stores & Horses", scope: "portfolio" },
    ],
  },
  {
    key: "court_relations",
    label: "Court & Relations",
    venue: "The Audience Chamber",
    visualTone: "audience",
    purpose: "External relationships, court presence, and representation.",
    objectLabel: "Audience chairs & realm map",
    objectDetail: "The people and institutions the House must cultivate or watch.",
    art: AUDIENCE_ART,
    responsibilities: [
      { key: "external_relations_representation", label: "External Relations & Representation", shortLabel: "External Relations", scope: "target" },
    ],
  },
  {
    key: "church",
    label: "Church",
    venue: "The House Chapel",
    visualTone: "chapel",
    purpose: "Household observance, chaplaincy, rights, and institutional affairs.",
    objectLabel: "Kneeler & chapel book",
    objectDetail: "The House's observance and its exact institutional obligations.",
    art: CHAPEL_ART,
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
