import {
  courtOsDomain,
  courtOsResponsibility,
  courtOsResponsibilityLocation,
  type CourtOsDomainDefinition,
  type CourtOsResponsibilityDefinition,
  type CourtOsResponsibilityDesignKey,
} from "./courtosInformationArchitecture";
import {
  COURTOS_ACCEPTED_P2_1_RESPONSIBILITY_DEPTH_LINEAGE,
  gateCourtOsP2_1ResponsibilityDepthLineage,
} from "../courtosProductCheckpoint";

export type CourtOsWorkspaceAvailability = "withheld";

/**
 * The common, fail-closed presentation contract for a responsibility whose
 * domain read projection has not yet been admitted. It deliberately contains
 * no owner, matter, receipt, or operating-status inference.
 */
export interface CourtOsWorkspaceShell {
  responsibility: CourtOsResponsibilityDefinition;
  domain: CourtOsDomainDefinition | null;
  venue: string;
  availability: CourtOsWorkspaceAvailability;
  availabilityLabel: string;
  scopeLabel: string;
  sourceBoundaryLabel: string;
  emptyRecordTitle: string;
  emptyRecordDetail: string;
  workbench: readonly CourtOsWorkspaceWorkbenchSection[];
}

export interface CourtOsWorkspaceWorkbenchSection {
  key: "record" | "plan" | "evidence";
  eyebrow: string;
  title: string;
  detail: string;
}

const WITHHELD_WORKBENCH: readonly CourtOsWorkspaceWorkbenchSection[] = [
  {
    key: "record",
    eyebrow: "Opening record",
    title: "Current state withheld",
    detail:
      "A House-and-scope projection is required before CourtOS may display the operating record.",
  },
  {
    key: "plan",
    eyebrow: "Planning leaf",
    title: "No editable decision",
    detail:
      "An admitted actor, authority basis, and exact scope are required before a plan can be opened or saved.",
  },
  {
    key: "evidence",
    eyebrow: "Review & evidence",
    title: "No report released",
    detail:
      "Evidence, receipts, Matters, and reports remain absent until their owning contract publishes them.",
  },
] as const;

function scopeLabel(scope: CourtOsResponsibilityDefinition["scope"]): string {
  const labels: Record<CourtOsResponsibilityDefinition["scope"], string> = {
    house: "House scope",
    manor: "Manor scope",
    portfolio: "Portfolio scope",
    project: "Project scope",
    facility: "Facility scope",
    right: "Right scope",
    channel: "Channel scope",
    archive: "Archive scope",
    target: "Relationship target scope",
    instrument: "Institutional instrument scope",
    appointing_scope: "Appointing scope",
  };
  return labels[scope];
}

export function buildCourtOsWorkspaceShell(
  responsibilityKey: CourtOsResponsibilityDesignKey,
): CourtOsWorkspaceShell {
  const depthLineage = gateCourtOsP2_1ResponsibilityDepthLineage(
    COURTOS_ACCEPTED_P2_1_RESPONSIBILITY_DEPTH_LINEAGE,
  );
  if (depthLineage.status !== "accepted") {
    throw new Error("CourtOS responsibility workspace lineage is not accepted.");
  }
  const responsibility = courtOsResponsibility(responsibilityKey);
  const location = courtOsResponsibilityLocation(responsibilityKey);
  const domain =
    location.kind === "operational_domain" ? courtOsDomain(location.domain) : null;

  return {
    responsibility,
    domain,
    venue: domain?.venue ?? "House Command",
    availability: "withheld",
    availabilityLabel: "Record unavailable",
    scopeLabel: scopeLabel(responsibility.scope),
    sourceBoundaryLabel: "No substitute report",
    emptyRecordTitle: "No admitted operational projection",
    emptyRecordDetail:
      "CourtOS knows where this responsibility belongs, but no versioned source view is admitted for this House and scope. No assignment, status, matter, receipt, or evidence has been invented.",
    workbench: WITHHELD_WORKBENCH,
  };
}
