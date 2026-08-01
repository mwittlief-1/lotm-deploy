import type { IncomingMessage, ServerResponse } from "node:http";

import type {
  CourtOs1120ApiService,
  CourtOs1120Endpoint,
} from "./contracts";
import { handleCourtOs1120Request } from "./handler";

export function createCourtOs1120NodeHandler(
  endpoint: CourtOs1120Endpoint,
  service: CourtOs1120ApiService,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async (request, response) => {
    const result = await handleCourtOs1120Request(
      endpoint,
      { method: request.method, url: request.url },
      service,
    );
    for (const [name, value] of Object.entries(result.headers)) {
      response.setHeader(name, value);
    }
    response.statusCode = result.status;
    response.end(JSON.stringify(result.body));
  };
}
