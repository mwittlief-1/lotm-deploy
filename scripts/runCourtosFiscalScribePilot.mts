import { COURTOS_PLAYER_CONTEXT } from "../src/courtosPlayerContext";
import {
  compileCourtScribeFiscalBriefRequest,
  deterministicCourtScribeFiscalBrief,
  renderCourtScribeFiscalClausePlan,
  validateCourtScribeFiscalBriefResponse,
} from "../src/ui/scribe/courtScribeFiscalBrief";
import {
  CourtScribeFiscalLocalHost,
  courtScribeLocalInstall,
  developmentCourtScribeRoot,
  isCourtScribeFiscalBriefRequest,
} from "../desktop/courtScribeLocalHost";
import {
  createCourtOs1120ReadModelService,
  repositoryCourtOs1120Sources,
} from "../src/server/courtos1120Api/readModelService";

type CourtProjection = {
  selected_entity?: { entity_id?: string };
};

const houseId = COURTOS_PLAYER_CONTEXT.house_id;
const service = createCourtOs1120ReadModelService(
  repositoryCourtOs1120Sources(),
  { accessMode: "player_runtime" },
);
let host: CourtScribeFiscalLocalHost | null = null;

try {
  const court = await service.courtOs({ houseId }) as CourtProjection;
  const householdEntityId = court.selected_entity?.entity_id;
  if (!householdEntityId) throw new Error("Selected player House has no Household entity.");
  const [projection, session] = await Promise.all([
    service.household({ houseId, householdEntityId }),
    service.sessionContext({ houseId }),
  ]);
  const request = compileCourtScribeFiscalBriefRequest({
    projection: projection as Parameters<typeof compileCourtScribeFiscalBriefRequest>[0]["projection"],
    session,
  });
  const install = courtScribeLocalInstall(developmentCourtScribeRoot());
  host = new CourtScribeFiscalLocalHost(install);
  const warmStartedAt = performance.now();
  const warm = await host.warm();
  const warmElapsedMs = Math.round(performance.now() - warmStartedAt);
  const firstStartedAt = performance.now();
  const response = await host.fiscalBrief(request);
  const firstElapsedMs = Math.round(performance.now() - firstStartedAt);
  // Same admitted facts, distinct request identity: measures a genuinely new
  // selection through the already-resident model rather than the response
  // cache used by a repeated screen render.
  const secondStartedAt = performance.now();
  const warmedResponse = await host.fiscalBrief({
    ...request,
    request_id: `${request.request_id}:resident-probe`,
  });
  const secondElapsedMs = Math.round(performance.now() - secondStartedAt);
  const validation = response
    ? validateCourtScribeFiscalBriefResponse(request, response)
    : { ok: false as const, reason: "local_scribe_unavailable_or_invalid" };
  const result = response && validation.ok
    ? {
      mode: "generated" as const,
      prose: renderCourtScribeFiscalClausePlan(request, response.clauses),
      cited_claim_ids: response.clauses.map((clause) => clause.claim_id),
    }
    : deterministicCourtScribeFiscalBrief(request);
  console.log(JSON.stringify({
    mode: result.mode,
    validation,
    packet: {
      request_id: request.request_id,
      house_id: request.actor_context.house_id,
      actor_person_id: request.actor_context.actor_person_id,
      claim_count: request.confirmed.length + request.reported.length,
      host_request_valid: isCourtScribeFiscalBriefRequest(request),
    },
    native_install: { available: install.available, reason: install.reason },
    warm,
    timing_ms: {
      warm: warmElapsedMs,
      first_selection: firstElapsedMs,
      resident_selection: secondElapsedMs,
    },
    resident_probe: warmedResponse
      ? validateCourtScribeFiscalBriefResponse(request, warmedResponse)
      : { ok: false, reason: "local_scribe_unavailable_or_invalid" },
    brief: result.prose,
  }, null, 2));
} finally {
  host?.dispose();
  await service.close();
}
