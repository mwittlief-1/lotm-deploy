import type { BoundedRegistryManifest, BoundedRegistryManifestEntry, RunState, RunStateSchemaVersion } from "./types";

export const RUN_STATE_SCHEMA_VERSION = "run_state_schema_v0.3.1" as const satisfies RunStateSchemaVersion;
export const BOUNDED_REGISTRY_MANIFEST_SCHEMA_VERSION = "bounded_registry_manifest_v1" as const;

export const BOUNDED_REGISTRY_MANIFEST_ENTRY_IDS = [
  "flags",
  "houses",
  "kinship_edges",
  "people",
  "player_house_id",
  "relationships"
] as const;

const BOUNDED_REGISTRY_MANIFEST_ENTRIES = [
  {
    registry_id: "flags",
    state_path: "flags",
    entry_kind: "record",
    migration_tracked: true,
    registry_schema_version: null
  },
  {
    registry_id: "houses",
    state_path: "houses",
    entry_kind: "record",
    migration_tracked: true,
    registry_schema_version: null
  },
  {
    registry_id: "kinship_edges",
    state_path: "kinship_edges",
    entry_kind: "edge_list",
    migration_tracked: true,
    registry_schema_version: null,
    legacy_paths: ["kinship"]
  },
  {
    registry_id: "people",
    state_path: "people",
    entry_kind: "record",
    migration_tracked: true,
    registry_schema_version: null
  },
  {
    registry_id: "player_house_id",
    state_path: "player_house_id",
    entry_kind: "pointer",
    migration_tracked: true,
    registry_schema_version: null
  },
  {
    registry_id: "relationships",
    state_path: "relationships",
    entry_kind: "edge_list",
    migration_tracked: true,
    registry_schema_version: null
  }
] as const satisfies readonly BoundedRegistryManifestEntry[];

function cloneBoundedRegistryManifestEntry(entry: BoundedRegistryManifestEntry): BoundedRegistryManifestEntry {
  return {
    registry_id: entry.registry_id,
    state_path: entry.state_path,
    entry_kind: entry.entry_kind,
    migration_tracked: entry.migration_tracked,
    registry_schema_version: entry.registry_schema_version,
    legacy_paths: entry.legacy_paths ? [...entry.legacy_paths] : undefined
  };
}

export function buildBoundedRegistryManifest(): BoundedRegistryManifest {
  return {
    schema_version: BOUNDED_REGISTRY_MANIFEST_SCHEMA_VERSION,
    entries: BOUNDED_REGISTRY_MANIFEST_ENTRIES.map((entry) => cloneBoundedRegistryManifestEntry(entry))
  };
}

export function ensureStateSchemaScaffold(state: RunState): RunState {
  const anyState = state as RunState;
  anyState.state_schema_version = RUN_STATE_SCHEMA_VERSION;
  anyState.bounded_registry_manifest = buildBoundedRegistryManifest();
  return state;
}
