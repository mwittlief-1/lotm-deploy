export const COURTOS_REQUEST_TIMEOUT_MS = 15_000;
// Frozen Household releases verify and open a larger SQLite package on the
// first request. Keep that honest cold start in the loading state instead of
// presenting a false source failure moments before the verified session is ready.
export const COURTOS_LARGE_READ_TIMEOUT_MS = 120_000;

export interface CourtOsRequestDeadline {
  readonly signal: AbortSignal;
  cancel(): void;
  clear(): void;
  didTimeOut(): boolean;
}

export function createCourtOsRequestDeadline(
  timeoutMs = COURTOS_REQUEST_TIMEOUT_MS,
): CourtOsRequestDeadline {
  const controller = new AbortController();
  let reason: "timeout" | "cancelled" | null = null;
  const timeout = globalThis.setTimeout(() => {
    reason = "timeout";
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cancel() {
      if (!reason) reason = "cancelled";
      globalThis.clearTimeout(timeout);
      controller.abort();
    },
    clear() {
      globalThis.clearTimeout(timeout);
    },
    didTimeOut() {
      return reason === "timeout";
    },
  };
}

export function courtOsTimeoutError(code: string, label: string) {
  return {
    code,
    message: `${label} took too long to answer. Try the record again.`,
  };
}
