import React from "react";

export type FiscalEvidenceAvailability = "available" | "degraded" | "unavailable";

export interface World1116FiscalResourceEvidence {
  recordId: string | null;
  evidenceKind: "balance" | "custody";
  resourceId: string | null;
  quantity: number | null;
  unit: string | null;
  openingStatus: string | null;
  ownerLabel: string | null;
  locationLabel: string | null;
  authorityStatus: string | null;
  sourceDisposition: string | null;
  provenanceRef: string | null;
  unresolvedReason: string | null;
  qualification: string | null;
}

export interface World1116FiscalCapacityEvidence {
  recordId: string | null;
  manorId: string | null;
  quantity: number | null;
  unit: string | null;
  authorityStatus: string | null;
  sourceDisposition: string | null;
  provenanceRef: string | null;
  unresolvedReason: string | null;
}

export interface World1116FiscalOfficeEvidence {
  recordId: string | null;
  officeId: string | null;
  holderId: string | null;
  holderLabel: string | null;
  officeTitle: string | null;
  entityLabel: string | null;
  evidenceStatus: string | null;
  authorityStatus: string | null;
  sourceDisposition: string | null;
  provenanceRef: string | null;
  unresolvedReason: string | null;
}

export interface World1116FiscalGapEvidence {
  gapId: string | null;
  gapKind: string | null;
  affectedRef: string | null;
  unresolvedReason: string | null;
}

export interface World1116FiscalOfficePayload {
  session: {
    generation: string;
    sqliteSha256: string;
    stagingStatus: "accepted_queryable_non_runtime";
    runtimeExecutionOccurred: false;
    publicationClass: string | null;
    manifest: {
      identity: string | null;
      sha256: string | null;
      schemaVersion: string | null;
      status: "published" | "not_published";
    };
  };
  availability: FiscalEvidenceAvailability;
  warnings: readonly string[];
  governance: Readonly<Record<string, boolean>>;
  resources: readonly World1116FiscalResourceEvidence[];
  capacity: readonly World1116FiscalCapacityEvidence[];
  offices: readonly World1116FiscalOfficeEvidence[];
  gaps: readonly World1116FiscalGapEvidence[];
  roleCount: number;
  relevantRoles: readonly {
    role: string;
    available: boolean;
    authorityStatus: string | null;
    sourceDisposition: string | null;
    unresolvedReason: string | null;
  }[];
}

type World1116FiscalOfficeApiResponse =
  | { ok: true; data: World1116FiscalOfficePayload }
  | { ok: false; error: { code: string; message: string } };

export type World1116FiscalOfficeLoadState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: World1116FiscalOfficePayload; error: null }
  | { status: "error"; data: null; error: { code: string; message: string } };

export function useWorld1116FiscalOfficeData(): World1116FiscalOfficeLoadState {
  const [state, setState] = React.useState<World1116FiscalOfficeLoadState>({
    status: "loading",
    data: null,
    error: null
  });

  React.useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/world1116/fiscal-office", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = (await response.json()) as World1116FiscalOfficeApiResponse;
        if (!response.ok || !payload.ok) {
          const error = payload.ok
            ? { code: `HTTP_${response.status}`, message: "World 1116 read model request failed." }
            : payload.error;
          throw Object.assign(new Error(error.message), { code: error.code });
        }
        setState({ status: "ready", data: payload.data, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        const code =
          error && typeof error === "object" && "code" in error && typeof error.code === "string"
            ? error.code
            : "READ_MODEL_UNAVAILABLE";
        setState({ status: "error", data: null, error: { code, message } });
      });

    return () => controller.abort();
  }, []);

  return state;
}
