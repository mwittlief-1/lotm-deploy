import { afterEach, describe, expect, it, vi } from "vitest";

const packageResources =
  process.env.COURTOS_PACKAGED_RESOURCES_ROOT ?? process.cwd();
const pearwickHouseId = "t0h_bcae5bd911ab10f4c7fdfea0";
const pearwickHouseholdId = "uatentity_2feb6d3c5a81604f9bebeb8c";
const priorDataRoot = process.env.COURTOS_DATA_ROOT;

afterEach(() => {
  if (priorDataRoot === undefined) delete process.env.COURTOS_DATA_ROOT;
  else process.env.COURTOS_DATA_ROOT = priorDataRoot;
  vi.resetModules();
});

describe("CourtOS production-resource Household runtime", () => {
  it("opens the admitted Pearwick Household projection from the selected production resource root", async () => {
    process.env.COURTOS_DATA_ROOT = packageResources;
    vi.resetModules();
    const { handleDesktopCourtOsApi } = await import("../../desktop/courtosDesktopService");
    const response = await handleDesktopCourtOsApi(
      new Request(
        `merecross://app/api/household/1120?houseId=${pearwickHouseId}&householdEntityId=${pearwickHouseholdId}`,
      ),
    );
    const payload = await response.json() as {
      ok: boolean;
      data?: { query?: { house_id?: string }; membership_context?: unknown[] };
      error?: { code?: string; message?: string };
    };

    expect(response.status, payload.error?.message).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data?.query?.house_id).toBe(pearwickHouseId);
    expect(payload.data?.membership_context?.length).toBeGreaterThan(0);
  });

  it("serves the native county/manor composition endpoint from the desktop protocol", async () => {
    process.env.COURTOS_DATA_ROOT = process.cwd();
    vi.resetModules();
    const { handleDesktopCourtOsApi } = await import("../../desktop/courtosDesktopService");
    const response = await handleDesktopCourtOsApi(new Request(
      `merecross://app/api/spatial/1120/visual-composition?houseId=${pearwickHouseId}&manorId=manor_hx_44835&lod=mid_hex`,
    ));
    const payload = await response.json() as {
      ok: boolean;
      data?: { schema_version?: string; lod?: string; chunks?: unknown[] };
      error?: { message?: string };
    };

    expect(response.status, payload.error?.message).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data).toMatchObject({
      schema_version: "courtos_spatial_visual_composition_v1",
      lod: "mid_hex",
    });
    expect(payload.data?.chunks).toHaveLength(23);
  });
});
