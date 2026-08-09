import type { CourtOsResponsibilityWorkspaceRecordV1 } from "../../ui/readModels/household1120/types";
import { COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES } from "../../ui/responsibilityWorkspaceCatalog";
import {
  FoundationAResponsibilityWorkspaceProjection,
  type ResponsibilityWorkspaceRowV1,
} from "./responsibilityWorkspaceProjection";

function recordKind(
  posture: "read_ready" | "conditional_empty" | "withheld_fail_closed",
  row: ResponsibilityWorkspaceRowV1,
): CourtOsResponsibilityWorkspaceRecordV1["record_kind"] {
  if (posture !== "read_ready" || /withheld|empty/i.test(row.source_table)) return "withheld";
  if (/authority|assignment/i.test(row.source_table)) return "authority_scope";
  if (/target|delegate/i.test(row.source_table)) return "target";
  if (/subject|succession|entity|operator/i.test(row.source_table)) return "subject";
  return "evidence";
}

/**
 * Compatibility facade used by the Household response. The strict SQLite
 * projector owns all package reads, admission checks, and House scoping; this
 * class only maps its stable rows into the existing workspace-record DTO.
 */
export class ResponsibilityWorkspaceReadModel {
  private readonly projection: FoundationAResponsibilityWorkspaceProjection;

  constructor(repositoryRoot: string) {
    this.projection = new FoundationAResponsibilityWorkspaceProjection(
      `${repositoryRoot.replace(/\/$/, "")}/data/genrun`,
    );
  }

  async recordsForHouse(
    houseId: string,
    _admittedManorIds: readonly string[] = [],
  ): Promise<CourtOsResponsibilityWorkspaceRecordV1[]> {
    const workspaces = await Promise.all(
      COURTOS_RESPONSIBILITY_WORKSPACE_SOURCES.map((source) =>
        this.projection.projection({ houseId, responsibility: source.responsibility }),
      ),
    );
    return workspaces
      .flatMap((workspace) =>
        workspace.rows.map((row, index) => ({
          responsibility_key: workspace.query.responsibility,
          record_id: `${row.source_table}:${row.subject_id ?? row.scope_id ?? index + 1}`,
          record_kind: recordKind(workspace.workspace.posture, row),
          scope_id: row.scope_id,
          scope_label: row.scope_label,
          subject_id: row.subject_id,
          subject_label: row.subject_label,
          state_label: row.state ?? workspace.workspace.posture,
          evidence_label:
            row.evidence_references[0]?.value ?? workspace.evidence[0] ?? row.source_table,
          source_package_id: workspace.source_binding.package_id,
          runtime_authority: false as const,
        })),
      )
      .sort(
        (left, right) =>
          left.responsibility_key.localeCompare(right.responsibility_key) ||
          left.record_id.localeCompare(right.record_id),
      );
  }

  async close(): Promise<void> {
    await this.projection.close();
  }
}
