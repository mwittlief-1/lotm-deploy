import mapGenRuntimeContract from "../../../config/courtos-mapgen-runtime-contract.v1.json";

export const COURTOS_CARTOGRAPHY_THEME_ID = "merecross_courtos_cartography_v1";
export const COURTOS_CARTOGRAPHY_THEME_SCHEMA = "merecross_cartography_theme_v1";
export const COURTOS_CARTOGRAPHY_THEME_VERSION = "1.0.0";
export const COURTOS_SPATIAL_SCHEMA = "merecross_spatial_adapter_v1";
export const COURTOS_SPATIAL_PROTOCOL_VERSION = 1;

export type CourtOsMapLevel = "realm" | "county" | "estate";

export type CourtOsRendererKey =
  | "merecross_realm_v1"
  | "glastonmere_county_v1"
  | "orchardmere_county_v1"
  | "pearwick_estate_pilot_v1";

export const COURTOS_REQUIRED_RENDERERS = Object.freeze(
  mapGenRuntimeContract.required_renderers.map((renderer) => ({
    rendererKey: renderer.renderer_key as CourtOsRendererKey,
    path: renderer.path,
  })),
);

const RENDERER_PATHS: Readonly<Record<CourtOsRendererKey, string>> =
  Object.freeze(
    Object.fromEntries(
      COURTOS_REQUIRED_RENDERERS.map((renderer) => [
        renderer.rendererKey,
        renderer.path,
      ]),
    ) as Record<CourtOsRendererKey, string>,
  );

export function resolveMapGenBaseUrl({
  configuredBaseUrl,
  legacyViewerUrl,
  development,
}: {
  configuredBaseUrl?: string | null;
  legacyViewerUrl?: string | null;
  development: boolean;
}): string | null {
  const candidate = configuredBaseUrl?.trim() || legacyViewerUrl?.trim();
  if (candidate) {
    try {
      return new URL(candidate).toString();
    } catch {
      return null;
    }
  }
  // The accepted MapGen renderers are bundled with CourtOS. Development may
  // still override this URL while MapGen is worked on independently, but the
  // production/desktop candidate must not depend on a second local server.
  if (typeof window !== "undefined") return `${window.location.origin}/`;
  return development ? "http://127.0.0.1:4173/" : null;
}

export function rendererUrl({
  baseUrl,
  rendererKey,
  parentOrigin,
  manorId,
}: {
  baseUrl: string;
  rendererKey: CourtOsRendererKey | string;
  parentOrigin: string;
  manorId?: string | null;
}): URL {
  const path = RENDERER_PATHS[rendererKey as CourtOsRendererKey];
  if (!path) throw new Error(`Unknown CourtOS spatial renderer: ${rendererKey}`);
  const base = new URL(baseUrl);
  const url = new URL(path, `${base.origin}/`);
  url.searchParams.set("embedded", "1");
  url.searchParams.set("courtos", "1");
  url.searchParams.set("parentOrigin", new URL(parentOrigin).origin);
  url.searchParams.set("theme", COURTOS_CARTOGRAPHY_THEME_ID);
  if (manorId) url.searchParams.set("manorId", manorId);
  return url;
}

type SpatialReadyMessage = {
  type: "merecross:spatial:ready:v1";
  payload: {
    schemaVersion: typeof COURTOS_SPATIAL_SCHEMA;
    protocolVersion: typeof COURTOS_SPATIAL_PROTOCOL_VERSION;
    rendererKey: string;
    themeId: typeof COURTOS_CARTOGRAPHY_THEME_ID;
    themeSchemaVersion: typeof COURTOS_CARTOGRAPHY_THEME_SCHEMA;
    themeVersion: typeof COURTOS_CARTOGRAPHY_THEME_VERSION;
    firstUsableFrame: true;
  };
};

export function isSpatialReadyMessage(value: unknown): value is SpatialReadyMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; payload?: Record<string, unknown> };
  const payload = message.payload;
  return Boolean(
    message.type === "merecross:spatial:ready:v1" &&
    payload &&
    payload.schemaVersion === COURTOS_SPATIAL_SCHEMA &&
    payload.protocolVersion === COURTOS_SPATIAL_PROTOCOL_VERSION &&
    typeof payload.rendererKey === "string" &&
    payload.themeId === COURTOS_CARTOGRAPHY_THEME_ID &&
    payload.themeSchemaVersion === COURTOS_CARTOGRAPHY_THEME_SCHEMA &&
    payload.themeVersion === COURTOS_CARTOGRAPHY_THEME_VERSION &&
    payload.firstUsableFrame === true
  );
}
