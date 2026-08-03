import {
  courtOsDomain,
  courtOsResponsibility,
  courtOsResponsibilityLocation,
  type CourtOsDomainDefinition,
  type CourtOsResponsibilityDefinition,
  type CourtOsResponsibilityDesignKey,
} from "./courtosInformationArchitecture";

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
}

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
  };
}
