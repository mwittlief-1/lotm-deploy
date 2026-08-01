import type {
  CourtOs1120ApiServiceProvider,
  CourtOs1120Endpoint,
} from "./contracts";
import { handleCourtOs1120Request } from "./handler";

export function createCourtOs1120FetchHandler(
  endpoint: CourtOs1120Endpoint,
  serviceProvider: CourtOs1120ApiServiceProvider,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const result = await handleCourtOs1120Request(
      endpoint,
      { method: request.method, url: request.url },
      serviceProvider,
    );
    return Response.json(result.body, {
      status: result.status,
      headers: result.headers,
    });
  };
}
