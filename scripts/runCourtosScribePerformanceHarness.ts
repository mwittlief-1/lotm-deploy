import {
  CourtScribeFiscalLocalHost,
  courtScribeLocalInstall,
} from "../desktop/courtScribeLocalHost";
import type { CourtScribeFiscalBriefRequestV1 } from "../src/ui/scribe/courtScribeFiscalBrief";
import type { CourtScribeBriefingPacketV1 } from "../src/ui/scribe/courtScribeBriefingContract";
import { resolve } from "node:path";

function packet(requestId: string): CourtScribeFiscalBriefRequestV1 {
  return {
    schema_version: "courtos_scribe_fiscal_brief_packet_v1",
    request_id: requestId,
    run_identity: { source_generation_id: "performance-harness", effective_date: "1120-01-01" },
    actor_context: {
      house_id: "t0h_performance_harness",
      actor_person_id: "t0p_performance_harness_head",
      authority_basis: "performance_harness_only",
      knowledge_lens: "qa_projection",
      responsibility: "house_fiscal_administration",
    },
    task: "briefing",
    style_card: { role: "house_fiscal_steward", voice: "measured_household_account" },
    confirmed: [{
      claim_id: "fiscal:steward",
      status: "confirmed",
      fact: { kind: "accountable_steward", subject_label: "Recorded steward" },
      numeric_values: [],
      source_ids: ["performance:authority"],
      source_status: "qa_projection",
    }, {
      claim_id: "fiscal:position:coin",
      status: "confirmed",
      fact: { kind: "opening_position", resource_id: "coin", quantity: 560000 },
      numeric_values: [560000],
      source_ids: ["performance:position"],
      source_status: "qa_projection",
    }],
    reported: [{
      claim_id: "fiscal:posting:1119",
      status: "reported",
      fact: {
        kind: "prior_cycle_posting",
        resource_id: "coin",
        quantity: -3200,
        activity_year: 1119,
        flow_family: "household_regular",
        direction: "outflow",
      },
      numeric_values: [1119, -3200],
      source_ids: ["performance:posting"],
      source_status: "qa_projection",
    }],
    allowed_assessments: [],
    allowed_action_ids: [],
    allowed_query_kinds: [],
    disclosure_limits: {
      allow_counterparty_identity: false,
      allow_personal_financial_detail: false,
      allow_hidden_state: false,
      require_claim_citations: true,
      preserve_source_status: true,
    },
    output_budget: { min_words: 60, max_words: 180 },
  };
}

function briefingPacket(requestId = "performance:responsibility"): CourtScribeBriefingPacketV1 {
  return {
    schema_version: "courtos_scribe_briefing_packet_v1",
    request_id: requestId,
    run_identity: { source_generation_id: "performance-harness", effective_date: "1120-01-01" },
    actor_context: {
      house_id: "t0h_performance_harness",
      actor_person_id: "t0p_performance_harness_head",
      authority_basis: "performance_harness_only",
      knowledge_lens: "qa_projection",
      responsibility_id: "household_stores_provisioning_procurement",
    },
    presentation_context: "responsibility_briefing",
    style_card: { role: "responsibility_steward", cadence: "measured", register: "household_account" },
    claims: [{
      claim_id: "brief:steward",
      status: "confirmed",
      fact: { kind: "accountable_person", person_id: "t0p_steward", display_name: "Recorded steward" },
      source_ids: ["performance:authority"],
      source_status: "qa_projection",
    }, {
      claim_id: "brief:scope",
      status: "confirmed",
      fact: { kind: "responsibility_scope", scope_id: "scope:test", scope_label: "The House-wide charge" },
      source_ids: ["performance:scope"],
      source_status: "qa_projection",
    }, {
      claim_id: "brief:posture",
      status: "reported",
      fact: { kind: "current_posture", posture: "settled" },
      source_ids: ["performance:posture"],
      source_status: "qa_projection",
    }],
    disclosure_limits: {
      allow_hidden_state: false,
      allow_raw_character_traits: false,
      allow_unadmitted_personal_detail: false,
      require_claim_citations: true,
      preserve_source_status: true,
    },
    output_budget: { max_clauses: 5 },
  };
}

function emitCheckpoint(label: string, detail: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify({
    schema_version: "courtos_scribe_performance_checkpoint_v1",
    label,
    ...detail,
  })}\n`);
}

async function timedWithDeadline<T>(
  label: string,
  deadlineMs: number,
  operation: () => Promise<T>,
): Promise<{ value: T; elapsed_ms: number }> {
  emitCheckpoint(`${label}:start`, { deadline_ms: deadlineMs });
  let deadline: ReturnType<typeof setTimeout> | null = null;
  const startedAt = performance.now();
  try {
    const value = await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        deadline = setTimeout(
          () => reject(new Error(`${label}_deadline_exceeded`)),
          deadlineMs,
        );
      }),
    ]);
    const result = {
      value,
      elapsed_ms: Math.round((performance.now() - startedAt) * 10) / 10,
    };
    emitCheckpoint(`${label}:complete`, { elapsed_ms: result.elapsed_ms });
    return result;
  } finally {
    if (deadline) clearTimeout(deadline);
  }
}

const install = courtScribeLocalInstall(process.env.COURTOS_SCRIBE_ROOT
  ? resolve(process.env.COURTOS_SCRIBE_ROOT)
  : resolve(process.cwd(), "poc/local-slm-financial-narrative-v1"));
const host = new CourtScribeFiscalLocalHost(install);
let finalReport: Record<string, unknown>;
try {
  emitCheckpoint("harness:start", {
    install_available: install.available,
    install_reason: install.reason,
    requested_backend: process.env.COURTOS_SCRIBE_BACKEND ?? "metal_then_cpu",
  });
  const warm = await timedWithDeadline("warm", 125_000, () => host.warm());
  emitCheckpoint("warm:telemetry", host.status() as unknown as Record<string, unknown>);
  const genericOnly = process.env.COURTOS_SCRIBE_GENERIC_ONLY === "1";
  const first = genericOnly ? null : await timedWithDeadline(
    "fiscal_first", 35_000, () => host.fiscalBrief(packet("performance:first")),
  );
  const cached = genericOnly ? null : await timedWithDeadline(
    "fiscal_cache", 5_000, () => host.fiscalBrief(packet("performance:first")),
  );
  const resident = genericOnly ? null : await timedWithDeadline(
    "fiscal_resident", 35_000, () => host.fiscalBrief(packet("performance:resident")),
  );
  const responsibility = await timedWithDeadline(
    "responsibility_first", 35_000, () => host.briefing(briefingPacket()),
  );
  const responsibilityCached = await timedWithDeadline(
    "responsibility_cache", 5_000, () => host.briefing(briefingPacket()),
  );
  const responsibilityResident = await timedWithDeadline(
    "responsibility_resident", 35_000,
    () => host.briefing(briefingPacket("performance:responsibility:resident")),
  );
  finalReport = {
    schema_version: "courtos_scribe_performance_report_v1",
    install: { available: install.available, reason: install.reason },
    warm: { ok: warm.value, elapsed_ms: warm.elapsed_ms },
    first: first ? { generated: first.value !== null, elapsed_ms: first.elapsed_ms } : null,
    cached: cached ? { generated: cached.value !== null, elapsed_ms: cached.elapsed_ms } : null,
    resident: resident ? { generated: resident.value !== null, elapsed_ms: resident.elapsed_ms } : null,
    responsibility: {
      generated: responsibility.value !== null,
      elapsed_ms: responsibility.elapsed_ms,
    },
    responsibility_cached: {
      generated: responsibilityCached.value !== null,
      elapsed_ms: responsibilityCached.elapsed_ms,
    },
    responsibility_resident: {
      generated: responsibilityResident.value !== null,
      elapsed_ms: responsibilityResident.elapsed_ms,
    },
    runtime: host.status(),
  };
} catch (error) {
  finalReport = {
    schema_version: "courtos_scribe_performance_report_v1",
    install: { available: install.available, reason: install.reason },
    failure: error instanceof Error ? error.message : String(error),
    runtime: host.status(),
  };
} finally {
  host.dispose();
}
emitCheckpoint("harness:complete", finalReport);
