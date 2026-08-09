import { useEffect, useState } from "react";

import { createCourtOsRequestDeadline } from "../courtosRequestDeadline";
import type {
  CourtOsSpatialVisualLod,
  CourtOsSpatialVisualProofV1,
  CourtOsSpatialVisualState,
} from "./courtosSpatialVisualClient";

const proofCache = new Map<string, Promise<CourtOsSpatialVisualProofV1>>();
const compositionCache = new Map<string, Promise<CourtOsSpatialVisualProofV1>>();
const MAX_PROOF_CACHE_ENTRIES = 24;
const MAX_COMPOSITION_CACHE_ENTRIES = 12;

type CourtOsSpatialVisualCompositionV1 = {
  schema_version: "courtos_spatial_visual_composition_v1";
  source_sha256: string;
  house_id: string;
  manor_id: string;
  lod: Exclude<CourtOsSpatialVisualLod, "macro">;
  macro: CourtOsSpatialVisualProofV1;
  chunks: CourtOsSpatialVisualProofV1[];
};

function trimOldest<T>(cache: Map<string, T>, limit: number) {
  while (cache.size > limit) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

function isVisualProof(value: unknown): value is CourtOsSpatialVisualProofV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CourtOsSpatialVisualProofV1>;
  return candidate.schema_version === "courtos_spatial_visual_proof_v1"
    && candidate.disposition === "interpretive_renderer_export"
    && candidate.source_status === "versioned_renderer_export"
    && (candidate.lod === "macro" || candidate.lod === "mid_hex" || candidate.lod === "fine_cell")
    && Boolean(candidate.macro && Array.isArray(candidate.macro.parents))
    && typeof candidate.source_sha256 === "string"
    && /^[a-f0-9]{64}$/.test(candidate.source_sha256);
}

function isVisualComposition(value: unknown): value is CourtOsSpatialVisualCompositionV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CourtOsSpatialVisualCompositionV1>;
  return candidate.schema_version === "courtos_spatial_visual_composition_v1"
    && (candidate.lod === "mid_hex" || candidate.lod === "fine_cell")
    && typeof candidate.source_sha256 === "string"
    && /^[a-f0-9]{64}$/.test(candidate.source_sha256)
    && isVisualProof(candidate.macro)
    && Array.isArray(candidate.chunks)
    && candidate.chunks.every(isVisualProof);
}

function proofKey(
  houseId: string,
  manorId: string,
  lod: CourtOsSpatialVisualLod,
  parentHexId: string | undefined,
  generation: number,
) {
  return `${generation}\u0000${houseId}\u0000${manorId}\u0000${lod}\u0000${parentHexId ?? ""}`;
}

function fetchProofCached(
  houseId: string,
  manorId: string,
  lod: CourtOsSpatialVisualLod,
  parentHexId: string | undefined,
  generation: number,
): Promise<CourtOsSpatialVisualProofV1> {
  const key = proofKey(houseId, manorId, lod, parentHexId, generation);
  const cached = proofCache.get(key);
  if (cached) return cached;
  const request = (async () => {
    const deadline = createCourtOsRequestDeadline();
    try {
      const parameters = new URLSearchParams({ houseId, manorId, lod });
      if (parentHexId) parameters.set("parentHexId", parentHexId);
      const response = await fetch(`/api/spatial/1120/visual?${parameters.toString()}`, {
        signal: deadline.signal,
      });
      if (!response.ok) throw new Error(`Spatial visual proof returned ${response.status}.`);
      const envelope: unknown = await response.json();
      const data = envelope && typeof envelope === "object" && "data" in envelope
        ? (envelope as { data?: unknown }).data
        : null;
      if (!isVisualProof(data)) throw new Error("Spatial visual proof failed its source or schema gate.");
      if (data.house_id !== houseId || data.manor_id !== manorId || data.lod !== lod) {
        throw new Error("Spatial visual proof does not match the selected House, manor, or level.");
      }
      return data;
    } finally {
      deadline.clear();
    }
  })();
  proofCache.set(key, request);
  trimOldest(proofCache, MAX_PROOF_CACHE_ENTRIES);
  request.catch(() => proofCache.delete(key));
  return request;
}

function compositionKey(
  houseId: string,
  manorId: string,
  lod: CourtOsSpatialVisualLod,
  generation: number,
) {
  return `${generation}\u0000${houseId}\u0000${manorId}\u0000${lod}`;
}

export function loadCourtOsSpatialVisualComposition(
  houseId: string,
  manorId: string,
  lod: CourtOsSpatialVisualLod,
  generation = 0,
): Promise<CourtOsSpatialVisualProofV1> {
  const key = compositionKey(houseId, manorId, lod, generation);
  const cached = compositionCache.get(key);
  if (cached) return cached;
  const request = lod === "macro"
    ? fetchProofCached(houseId, manorId, "macro", undefined, generation)
    : (async () => {
      const deadline = createCourtOsRequestDeadline();
      try {
        const parameters = new URLSearchParams({ houseId, manorId, lod });
        const response = await fetch(`/api/spatial/1120/visual-composition?${parameters.toString()}`, {
          signal: deadline.signal,
        });
        if (!response.ok) throw new Error(`Spatial visual composition returned ${response.status}.`);
        const envelope: unknown = await response.json();
        const data = envelope && typeof envelope === "object" && "data" in envelope
          ? (envelope as { data?: unknown }).data
          : null;
        if (!isVisualComposition(data) || data.house_id !== houseId || data.manor_id !== manorId || data.lod !== lod) {
          throw new Error("Spatial visual composition failed its source, scope, or schema gate.");
        }
        if (data.macro.source_sha256 !== data.source_sha256
          || data.chunks.some((chunk) => chunk.source_sha256 !== data.source_sha256)) {
          throw new Error("Spatial visual composition contains mixed source identities.");
        }
        if (
          data.macro.house_id !== houseId
          || data.macro.manor_id !== manorId
          || data.macro.lod !== "macro"
          || data.chunks.some((chunk) => (
            chunk.house_id !== houseId
            || chunk.manor_id !== manorId
            || chunk.lod !== lod
          ))
        ) {
          throw new Error("Spatial visual composition contains mixed House, manor, or level scope.");
        }
        const fabric = data.macro.manor_fabric;
        const chunks = data.chunks;
        const macro = data.macro;
      return {
        ...macro,
        lod,
        parent: chunks.find((chunk) => chunk.parent)?.parent,
        manor_fabric: fabric,
        clusters: lod === "mid_hex" ? chunks.flatMap((chunk) => chunk.clusters ?? []) : undefined,
        mid_cells: lod === "mid_hex" ? chunks.flatMap((chunk) => chunk.mid_cells ?? []) : undefined,
        fine_cells: lod === "fine_cell" ? chunks.flatMap((chunk) => chunk.fine_cells ?? []) : undefined,
      } as CourtOsSpatialVisualProofV1;
      } finally {
        deadline.clear();
      }
    })();
  compositionCache.set(key, request);
  trimOldest(compositionCache, MAX_COMPOSITION_CACHE_ENTRIES);
  request.catch(() => compositionCache.delete(key));
  return request;
}

function scheduleIdle(work: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const browserWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (typeof browserWindow.requestIdleCallback === "function") {
    const id = browserWindow.requestIdleCallback(work, { timeout: 1_800 });
    return () => browserWindow.cancelIdleCallback?.(id);
  }
  const id = globalThis.setTimeout(work, 600);
  return () => globalThis.clearTimeout(id);
}

/**
 * Cached, progressive composition: the realm view opens first, county detail
 * warms only after the browser is idle, and manor detail warms after county.
 * No source fact is derived or changed by the cache.
 */
export function useCachedCourtOsSpatialVisualComposition({
  houseId,
  manorId,
  lod,
  enabled,
  reloadKey = 0,
}: {
  houseId: string | null;
  manorId: string | null;
  lod: CourtOsSpatialVisualLod;
  enabled: boolean;
  reloadKey?: number;
}): CourtOsSpatialVisualState {
  const [state, setState] = useState<CourtOsSpatialVisualState>({ status: "loading" });

  useEffect(() => {
    if (!enabled || !houseId || !manorId) {
      setState({ status: "loading" });
      return;
    }
    let alive = true;
    const markName = `courtos-spatial:${houseId}:${manorId}:${lod}:${reloadKey}`;
    performance.mark(`${markName}:start`);
    setState({ status: "loading" });
    loadCourtOsSpatialVisualComposition(houseId, manorId, lod, reloadKey)
      .then((value) => {
        if (!alive) return;
        performance.mark(`${markName}:ready`);
        performance.measure(markName, `${markName}:start`, `${markName}:ready`);
        setState({ status: "ready", value });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      alive = false;
    };
  }, [houseId, manorId, lod, enabled, reloadKey]);

  useEffect(() => {
    if (state.status !== "ready" || !houseId || !manorId) return;
    const nextLod = lod === "macro" ? "mid_hex" : lod === "mid_hex" ? "fine_cell" : null;
    if (!nextLod) return;
    return scheduleIdle(() => {
      void loadCourtOsSpatialVisualComposition(houseId, manorId, nextLod, reloadKey).catch(() => undefined);
    });
  }, [state.status, houseId, manorId, lod, reloadKey]);

  return state;
}

export function clearCourtOsSpatialVisualCacheForTests() {
  proofCache.clear();
  compositionCache.clear();
}
