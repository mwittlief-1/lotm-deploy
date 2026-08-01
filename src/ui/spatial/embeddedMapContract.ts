export const COURTOS_CARTOGRAPHY_THEME_ID = "merecross_courtos_cartography_v1";
export const COURTOS_CARTOGRAPHY_THEME_SCHEMA = "merecross_cartography_theme_v1";
export const COURTOS_CARTOGRAPHY_THEME_VERSION = "1.0.0";
export const COURTOS_SPATIAL_SCHEMA = "merecross_spatial_adapter_v1";
export const COURTOS_SPATIAL_PROTOCOL_VERSION = 1;

export type CourtOsMapLevel = "realm" | "county" | "estate";

export type CourtOsRendererKey =
  | "merecross_realm_v1"
  | "orchardmere_county_v1"
  | "pearwick_estate_pilot_v1";

const RENDERER_PATHS: Readonly<Record<CourtOsRendererKey, string>> = Object.freeze({
  merecross_realm_v1: "merecross-3d-prototype.html",
  orchardmere_county_v1: "orchardmere-county-viewer.html",
  pearwick_estate_pilot_v1: "pearwick-estate-pilot.html",
});

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
  return development ? "http://127.0.0.1:4173/" : null;
}

export function rendererUrl({
  baseUrl,
  rendererKey,
  parentOrigin,
}: {
  baseUrl: string;
  rendererKey: CourtOsRendererKey | string;
  parentOrigin: string;
}): URL {
  const path = RENDERER_PATHS[rendererKey as CourtOsRendererKey];
  if (!path) throw new Error(`Unknown CourtOS spatial renderer: ${rendererKey}`);
  const base = new URL(baseUrl);
  const url = new URL(path, `${base.origin}/`);
  url.searchParams.set("embedded", "1");
  url.searchParams.set("courtos", "1");
  url.searchParams.set("parentOrigin", new URL(parentOrigin).origin);
  url.searchParams.set("theme", COURTOS_CARTOGRAPHY_THEME_ID);
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
