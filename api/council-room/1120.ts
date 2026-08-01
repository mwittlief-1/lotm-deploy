import { productionCourtOs1120Service } from "../../src/server/courtos1120Api/productionRuntime";
import { createCourtOs1120FetchHandler } from "../../src/server/courtos1120Api/webAdapter";

export const fetch = createCourtOs1120FetchHandler(
  "council-room",
  productionCourtOs1120Service,
);

export default { fetch };
