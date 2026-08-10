import type { CourtOsResponsibilityDesignKey } from "./courtosInformationArchitecture";
import type { CourtOsResponsibilityDataPosture } from "./responsibilityWorkspaceCatalog";

export interface CourtOsResponsibilityBriefVocabularyV1 {
  responsibility: CourtOsResponsibilityDesignKey;
  accountLabel: string;
  changeLabel: string;
  attentionLabel: string;
  decisionLabel: string;
  quietAttention: string;
  decisionPrompt: string;
}

export interface CourtOsResponsibilityBriefInputV1 {
  responsibility: CourtOsResponsibilityDesignKey;
  currentState: string;
  evidence: readonly string[];
  posture: CourtOsResponsibilityDataPosture;
  accountableHolderCount: number;
  authorityScopeCount: number;
  openingRecordCount: number;
  priorCycleRecordCount?: number;
  headOfHouseAssigned: boolean;
}

export interface CourtOsResponsibilityBriefSectionV1 {
  key: "account" | "change" | "attention" | "decision";
  label: string;
  heading: string;
  body: string;
  state: "settled" | "watch" | "decision" | "withheld";
}

export interface CourtOsResponsibilityBriefV1 {
  responsibility: CourtOsResponsibilityDesignKey;
  sections: readonly CourtOsResponsibilityBriefSectionV1[];
  actionSurfaceEligible: boolean;
  evidenceSummary: string;
}

/** A globally admitted source is not itself a current House charge. */
export function courtOsResponsibilityWorkspacePostureForHouse(input: {
  sourcePosture: CourtOsResponsibilityDataPosture;
  assignmentScopeCount: number;
  openingRecordCount: number;
}): CourtOsResponsibilityDataPosture {
  return input.sourcePosture === "read_ready" &&
    input.assignmentScopeCount === 0 &&
    input.openingRecordCount === 0
    ? "conditional_empty"
    : input.sourcePosture;
}

const BRIEF_VOCABULARY: readonly CourtOsResponsibilityBriefVocabularyV1[] = [
  { responsibility: "office_post_appointments", accountLabel: "The household of office", changeLabel: "Appointments since the last sitting", attentionLabel: "Seats requiring the Head's notice", decisionLabel: "Stewardship of office", quietAttention: "No recorded office exception is before the Head.", decisionPrompt: "Review who holds each office and post for the coming three years." },
  { responsibility: "household_stores_provisioning_procurement", accountLabel: "The state of the stores", changeLabel: "Movement since the last account", attentionLabel: "Shortage, custody, and supply", decisionLabel: "Provision for the next turn", quietAttention: "No recorded shortage or custody exception is before the Head.", decisionPrompt: "Review the keeper of stores and the House's provision for the coming three years." },
  { responsibility: "adult_kin_support", accountLabel: "Kin under House support", changeLabel: "Changes in residence and support", attentionLabel: "Needs requiring judgment", decisionLabel: "Care of supported kin", quietAttention: "No recorded support exception is before the Head.", decisionPrompt: "Review who answers for each supported adult during the coming three years." },
  { responsibility: "education_formation", accountLabel: "Learners and their formation", changeLabel: "Progress since the last report", attentionLabel: "Learners requiring attention", decisionLabel: "Formation for the next turn", quietAttention: "No recorded formation exception is before the Head.", decisionPrompt: "Review who answers for each learner's formation during the coming three years." },
  { responsibility: "household_service_care", accountLabel: "Health, care, and household service", changeLabel: "Changes since the last report", attentionLabel: "Care requiring the Head's notice", decisionLabel: "Care for the next turn", quietAttention: "No recorded care exception is before the Head.", decisionPrompt: "Review who answers for care and service during the coming three years." },
  { responsibility: "marriage_dynasty_stewardship", accountLabel: "The House line and its bonds", changeLabel: "Changes in kinship and succession", attentionLabel: "Questions of lineage", decisionLabel: "Dynastic stewardship", quietAttention: "No recorded dynastic exception is before the Head.", decisionPrompt: "Review who keeps watch over marriage, succession, and the House line." },
  { responsibility: "patronage_hospitality_gifts", accountLabel: "Hospitality and patronage", changeLabel: "Calls upon the House", attentionLabel: "Guests, gifts, and obligations", decisionLabel: "The House's open hand", quietAttention: "No recorded hospitality exception is before the Head.", decisionPrompt: "Review who answers for hospitality, patronage, and gifts." },
  { responsibility: "manor_stewardship", accountLabel: "The manors under stewardship", changeLabel: "Changes since the last inspection", attentionLabel: "Manors requiring notice", decisionLabel: "Stewardship for the next turn", quietAttention: "No recorded stewardship exception is before the Head.", decisionPrompt: "Review the accountable steward for each manor during the coming three years." },
  { responsibility: "estate_fabric_maintenance_oversight", accountLabel: "The condition of the estate fabric", changeLabel: "Wear and repair since inspection", attentionLabel: "Fabric requiring attention", decisionLabel: "Maintenance oversight", quietAttention: "No recorded maintenance exception is before the Head.", decisionPrompt: "Review who keeps the estate fabric in view during the coming three years." },
  { responsibility: "works_project_supervision", accountLabel: "Works presently in hand", changeLabel: "Progress since the last account", attentionLabel: "Works requiring judgment", decisionLabel: "Supervision of works", quietAttention: "No recorded works exception is before the Head.", decisionPrompt: "Review the supervisor for each recorded work." },
  { responsibility: "franchise_operations", accountLabel: "Franchises and operating places", changeLabel: "Changes in operation", attentionLabel: "Facilities requiring judgment", decisionLabel: "Operating stewardship", quietAttention: "No recorded franchise exception is before the Head.", decisionPrompt: "Review who answers for each recorded franchise operation." },
  { responsibility: "portfolio_oversight", accountLabel: "The estate portfolio", changeLabel: "Changes across the holdings", attentionLabel: "Patterns across manors", decisionLabel: "Oversight of the whole", quietAttention: "No recorded portfolio exception is before the Head.", decisionPrompt: "Review who keeps the House's eligible multi-manor portfolio in view." },
  { responsibility: "house_fiscal_administration", accountLabel: "The House account", changeLabel: "Movement since the last reckoning", attentionLabel: "Pressure upon the treasury", decisionLabel: "Fiscal stewardship", quietAttention: "No recorded fiscal exception is before the Head.", decisionPrompt: "Review who answers for the House account during the coming three years." },
  { responsibility: "manor_fiscal_administration", accountLabel: "The manor accounts", changeLabel: "Remittance since the last reckoning", attentionLabel: "Accounts requiring notice", decisionLabel: "Custody of the manor books", quietAttention: "No recorded manor-account exception is before the Head.", decisionPrompt: "Review who answers for each recorded manor account." },
  { responsibility: "revenue_right_administration_collection", accountLabel: "Rights and collections", changeLabel: "Changes since the last account", attentionLabel: "Rights requiring proof", decisionLabel: "Administration of revenue rights", quietAttention: "No exact current revenue right is recorded for this scope.", decisionPrompt: "No collection decision is available until an exact right is recorded." },
  { responsibility: "reception_intake", accountLabel: "The House threshold", changeLabel: "Arrivals since the last sitting", attentionLabel: "Persons awaiting reception", decisionLabel: "Keeping the threshold", quietAttention: "Reception remains closed where its exact operator or place is not recorded.", decisionPrompt: "No reception decision is available until its keeper and place are entered in the House papers." },
  { responsibility: "records_archives", accountLabel: "The record in custody", changeLabel: "Additions since the last review", attentionLabel: "Records requiring examination", decisionLabel: "Custody of memory", quietAttention: "No recorded archive exception is before the Head.", decisionPrompt: "Review who keeps the House record and its boundaries." },
  { responsibility: "correspondence_dispatch", accountLabel: "Correspondence in hand", changeLabel: "Dispatch since the last account", attentionLabel: "Letters requiring notice", decisionLabel: "Keeping the correspondence", quietAttention: "No recorded correspondence exception is before the Head.", decisionPrompt: "Review who answers for correspondence and dispatch." },
  { responsibility: "security_asset_protection", accountLabel: "The House's guarded places", changeLabel: "Changes in protection", attentionLabel: "Assets requiring watch", decisionLabel: "Custody and protection", quietAttention: "No recorded protection exception is before the Head.", decisionPrompt: "Review who answers for each recorded protection scope." },
  { responsibility: "martial_readiness_training", accountLabel: "Readiness of the House", changeLabel: "Training since the last muster", attentionLabel: "Readiness requiring notice", decisionLabel: "Readiness for the next turn", quietAttention: "No recorded readiness exception is before the Head.", decisionPrompt: "Review who answers for training and muster posture." },
  { responsibility: "martial_stores_horse_capacity", accountLabel: "Arms, horses, and capacity", changeLabel: "Changes since the last account", attentionLabel: "Capacity requiring notice", decisionLabel: "Custody of martial provision", quietAttention: "No recorded martial-store exception is before the Head.", decisionPrompt: "Review who answers for martial stores and horse capacity." },
  { responsibility: "external_relations_representation", accountLabel: "The House beyond its walls", changeLabel: "Changes among active relations", attentionLabel: "Relations requiring the Head", decisionLabel: "Representation of the House", quietAttention: "No recorded external-relations exception is before the Head.", decisionPrompt: "Review who represents the House to each active target." },
  { responsibility: "household_observance_chaplaincy", accountLabel: "Observance of the household", changeLabel: "Changes since the last observance", attentionLabel: "Spiritual care requiring notice", decisionLabel: "Household observance", quietAttention: "No recorded observance exception is before the Head.", decisionPrompt: "Review who answers for household observance and its parish route." },
  { responsibility: "church_rights_institutional_affairs", accountLabel: "The House and the Church", changeLabel: "Changes in institutional affairs", attentionLabel: "Rights requiring proof", decisionLabel: "Institutional stewardship", quietAttention: "No exact current Church-right instance is recorded.", decisionPrompt: "No institutional-right decision is available until an exact right is recorded." },
] as const;

/**
 * Resident coverage list for the production presentation layer. Keeping this
 * next to the authored vocabulary lets the focused UI suite prove that the
 * workbench has exactly 24 entries without reading a generated data package.
 * The imported design-key type still prevents drift at the integration gate.
 */
export const COURTOS_RESPONSIBILITY_BRIEF_KEYS = BRIEF_VOCABULARY.map(
  (item) => item.responsibility,
);

export const COURTOS_RESPONSIBILITY_BRIEF_VOCABULARY: ReadonlyMap<
  CourtOsResponsibilityDesignKey,
  CourtOsResponsibilityBriefVocabularyV1
> = new Map(BRIEF_VOCABULARY.map((item) => [item.responsibility, item]));

const CURRENT_ACCOUNT_SUMMARIES = {
  office_post_appointments: "Current offices and posts are entered with the person who answers for each.",
  household_stores_provisioning_procurement: "The House's recorded stores, custody places, and provision routes form the opening account.",
  adult_kin_support: "Each adult under managed House support is entered with the basis and keeper of that support.",
  education_formation: "Current learners are entered with their formation, provider, host, and responsible party.",
  household_service_care: "The current care roll records the people under care, their responsible manager, and any specialized arrangement.",
  marriage_dynasty_stewardship: "The House line, current unions, succession position, and named dynastic charges are entered for review.",
  patronage_hospitality_gifts: "The House's present hospitality and patronage charge is entered with its accountable keeper.",
  manor_stewardship: "Each manor in this House scope is entered with its accountable steward and observed condition.",
  estate_fabric_maintenance_oversight: "The estate's recorded fabric and condition are entered with the person keeping them in view.",
  works_project_supervision: "Each present work is entered separately with its place and accountable supervisor.",
  franchise_operations: "Each recorded operating place is entered separately with its accountable keeper.",
  portfolio_oversight: "The House's eligible multi-manor holdings are gathered into one account without replacing their local stewardship.",
  house_fiscal_administration: "The opening House account records fiscal stewardship, resource positions, custody, and the course of prior postings.",
  manor_fiscal_administration: "Each manor account remains separate, with its own recorded keeper, custody, and remittance posture.",
  revenue_right_administration_collection: "No exact current revenue right is entered for this House scope.",
  reception_intake: "No keeper and place for reception are entered with enough certainty to open this charge.",
  records_archives: "The House's record families are entered with their custody, verification, and ownership boundaries.",
  correspondence_dispatch: "Current correspondence charges and eligible operators are entered without turning delivery into House knowledge.",
  security_asset_protection: "The House's recorded guarded places, posts, and custody functions are entered for review.",
  martial_readiness_training: "The House's current service, training, and muster posture is entered with its accountable keeper.",
  martial_stores_horse_capacity: "The recorded direction of arms, horses, and martial capacity is entered without claiming an inventory that does not exist.",
  external_relations_representation: "Each active relation is entered with the person who represents the House and the bounds of that charge.",
  household_observance_chaplaincy: "Household observance is entered with its accountable keeper, parish route, and provider context.",
  church_rights_institutional_affairs: "No exact current Church right is entered for this House scope.",
} as const satisfies Record<CourtOsResponsibilityDesignKey, string>;

function vocabularyFor(
  responsibility: CourtOsResponsibilityDesignKey,
): CourtOsResponsibilityBriefVocabularyV1 {
  const vocabulary = COURTOS_RESPONSIBILITY_BRIEF_VOCABULARY.get(responsibility);
  if (!vocabulary) {
    throw new Error(`No Head's Brief vocabulary exists for ${responsibility}.`);
  }
  return vocabulary;
}

function priorCycleEvidence(evidence: readonly string[]): readonly string[] {
  return evidence.filter((item) => /1117|1118|1119|prior|cycle|movement|progress|report/i.test(item));
}

function playerFacingState(value: string): string {
  return value
    .replace(/\bUAT1\b/g, "the opening planning cycle")
    .replace(/\badmitted\b/gi, "recorded")
    .replace(/\bwithheld fail-closed\b/gi, "not entered without a verified record")
    .replace(/\bwithheld\b/gi, "not entered in the House papers")
    .replace(/\bfail-closed\b/gi, "closed without a verified entry")
    .replace(/\bruntime\b/gi, "turn");
}

export function buildCourtOsResponsibilityBrief(
  input: CourtOsResponsibilityBriefInputV1,
): CourtOsResponsibilityBriefV1 {
  const vocabulary = vocabularyFor(input.responsibility);
  const priorEvidence = priorCycleEvidence(input.evidence);
  const unavailable = input.posture === "withheld_fail_closed";
  const conditional = input.posture === "conditional_empty";
  const currentAccount = unavailable
    ? "No verified charge is entered in the House papers."
    : conditional
      ? CURRENT_ACCOUNT_SUMMARIES[input.responsibility]
      : CURRENT_ACCOUNT_SUMMARIES[input.responsibility] ?? playerFacingState(input.currentState);
  const scopePhrase = input.authorityScopeCount === 1
    ? "One accountable scope is recorded."
    : input.authorityScopeCount > 1
      ? `${input.authorityScopeCount} accountable scopes are recorded.`
      : "No accountable scope is recorded.";
  const recordPhrase = input.openingRecordCount > 0
    ? "The supporting House papers contain the opening entries behind this account."
    : "The named House papers form the complete opening account.";
  const changeBody = (input.priorCycleRecordCount ?? 0) > 0
    ? `${input.priorCycleRecordCount} prior-cycle ${input.priorCycleRecordCount === 1 ? "account is" : "accounts are"} available for comparison in the House papers. Nothing in that record is treated as a new turn result.`
    : priorEvidence.length > 0
      ? "A prior account is held in the House papers. Its recorded course is reflected here and remains available for examination."
    : "This opening account is the baseline. No later change report has yet been received.";
  const attentionBody = unavailable
    ? "No verified charge is entered in the House papers. No person, place, or authority is assumed."
    : conditional
      ? vocabulary.quietAttention
      : input.accountableHolderCount > 1
        ? `${input.accountableHolderCount} named holders answer across the recorded scopes. Review the scope before addressing a steward.`
        : vocabulary.quietAttention;
  const decisionBody = unavailable || conditional
    ? vocabulary.decisionPrompt
    : `${vocabulary.decisionPrompt} ${scopePhrase}`;

  return {
    responsibility: input.responsibility,
    actionSurfaceEligible: input.headOfHouseAssigned && !unavailable && !conditional,
    evidenceSummary: recordPhrase,
    sections: [
      { key: "account", label: "Current account", heading: vocabulary.accountLabel, body: currentAccount, state: unavailable ? "withheld" : conditional ? "watch" : "settled" },
      { key: "change", label: "Since the prior report", heading: vocabulary.changeLabel, body: changeBody, state: priorEvidence.length > 0 || (input.priorCycleRecordCount ?? 0) > 0 ? "settled" : "watch" },
      { key: "attention", label: "For the Head's attention", heading: vocabulary.attentionLabel, body: attentionBody, state: unavailable ? "withheld" : conditional || input.accountableHolderCount > 1 ? "watch" : "settled" },
      { key: "decision", label: "Decision and stewardship", heading: vocabulary.decisionLabel, body: decisionBody, state: unavailable || conditional ? "withheld" : "decision" },
    ],
  };
}
