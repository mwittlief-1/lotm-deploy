import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";

import type {
  CourtScribeFiscalBriefRequestV1,
  CourtScribeFiscalBriefResponseV1,
} from "../src/ui/scribe/courtScribeFiscalBrief";
import type {
  CourtScribeRuntimeBackendV1,
  CourtScribeRuntimePhaseV1,
  CourtScribeRuntimeTelemetryV1,
} from "../src/ui/scribe/courtScribeRuntime";
import {
  isCourtScribeBriefingPacket,
  validateCourtScribeBriefingPlan,
  type CourtScribeBriefingPacketV1,
  type CourtScribeBriefingPlanV1,
} from "../src/ui/scribe/courtScribeBriefingContract";

const MODEL_FILE = "Qwen3-4B-Instruct-Q4_K_M.gguf";
const MODEL_SHA256 = "7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5";
const RUNTIME_DIRECTORY = "llama-b10099";
const RUNTIME_SHA256 = "eb234dbcc44181988b6722972f1f2faaca93d5395bc453c3227255a3d3888671";
const SERVER_SHA256 = "a4998768a70ba2be02617ec9d8773accc2952516f4f5a8f38f621ece54cbf04b";
const MAX_RUNTIME_MS = 120_000;
const ADMISSION_IO_TIMEOUT_MS = 20_000;
const DEVICE_PROBE_TIMEOUT_MS = 5_000;
const MAX_CPU_DIAGNOSTIC_RUNTIME_MS = 30_000;
const INTERACTIVE_WARM_BUDGET_MS = 1_100;
// The deterministic account is already visible, so this budget does not block
// interaction. Six seconds admits the measured cold-prompt CPU selection
// (4.2–5.1s) while retaining a firm local-request ceiling; warm resident and
// Metal paths normally complete well inside it.
const INTERACTIVE_INFERENCE_BUDGET_MS = 6_000;
const WARM_START_TIMEOUT_MS = 20_000;
const CPU_WARM_START_TIMEOUT_MS = 45_000;
const WARM_PRIME_TIMEOUT_MS = 8_000;
const RESPONSE_CACHE_LIMIT = 64;

export interface CourtScribeLocalInstallV1 {
  root: string;
  model_path: string;
  executable_path: string;
  server_path: string;
  available: boolean;
  reason: string | null;
}

export function courtScribeLocalInstall(root: string): CourtScribeLocalInstallV1 {
  if (process.platform !== "darwin" || process.arch !== "arm64") {
    return {
      root,
      model_path: "",
      executable_path: "",
      server_path: "",
      available: false,
      reason: "native_scribe_not_packaged_for_this_platform",
    };
  }
  const modelPath = join(root, "local-models", MODEL_FILE);
  const executablePath = join(root, "local-runtime", RUNTIME_DIRECTORY, "llama-cli");
  const serverPath = join(root, "local-runtime", RUNTIME_DIRECTORY, "llama-server");
  // Never synchronously probe a multi-gigabyte File Provider path on the main
  // thread. Exact existence, size, and hashes are checked by the cancellable
  // asynchronous admission phase before any native process can be spawned.
  return { root, model_path: modelPath, executable_path: executablePath, server_path: serverPath, available: true, reason: null };
}

async function sha256(path: string, signal?: AbortSignal): Promise<string> {
  // File Provider reads can leave Node's in-process fs.open request stuck
  // beyond an AbortSignal. Isolate hashing in a killable native subprocess so
  // the Scribe host retains a real end-to-end admission deadline.
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn("/usr/bin/shasum", ["-a", "256", "--", path], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    child.unref();
    let output = "";
    let settled = false;
    const finish = (error: Error | null, value?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolvePromise(value ?? "");
    };
    const abort = () => {
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
      finish(new Error("CourtOS Scribe hash deadline exceeded"));
    };
    const deadline = setTimeout(abort, ADMISSION_IO_TIMEOUT_MS);
    deadline.unref();
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => { output += chunk; });
    child.once("error", () => finish(new Error("CourtOS Scribe hash process failed")));
    child.once("exit", (code) => {
      const match = output.match(/^([a-f0-9]{64})\b/i);
      if (code === 0 && match?.[1]) finish(null, match[1].toLowerCase());
      else finish(new Error("CourtOS Scribe hash process failed"));
    });
  });
}

function quoted(value: string): string {
  return JSON.stringify(`"${value}"`);
}

type ModelAlias = { alias: string; claim_id: string; kind: string; status: string; fact: unknown };
function modelAliases(request: CourtScribeFiscalBriefRequestV1): readonly ModelAlias[] {
  return [...request.confirmed, ...request.reported].map((claim, index) => ({
    alias: `c${index + 1}`, claim_id: claim.claim_id, kind: claim.fact.kind,
    status: claim.status, fact: claim.fact,
  }));
}

type BriefingAlias = {
  alias: string;
  claim_id: string;
  kind: CourtScribeBriefingPacketV1["claims"][number]["fact"]["kind"];
  status: CourtScribeBriefingPacketV1["claims"][number]["status"];
  fact: CourtScribeBriefingPacketV1["claims"][number]["fact"];
};

function briefingAliases(packet: CourtScribeBriefingPacketV1): readonly BriefingAlias[] {
  return packet.claims.map((claim, index) => ({
    alias: `c${index + 1}`,
    claim_id: claim.claim_id,
    kind: claim.fact.kind,
    status: claim.status,
    fact: claim.fact,
  }));
}

function aliasesForBriefingKind(
  packet: CourtScribeBriefingPacketV1,
  kind: BriefingAlias["kind"],
): string {
  return briefingAliases(packet).filter((claim) => claim.kind === kind)
    .map((claim) => quoted(claim.alias)).join(" | ");
}

export function courtScribeBriefingGrammar(packet: CourtScribeBriefingPacketV1): string {
  const speaker = aliasesForBriefingKind(packet, "accountable_person");
  const centralKind = packet.presentation_context === "council_matter_review"
    ? "matter_record" as const
    : "responsibility_scope" as const;
  const central = aliasesForBriefingKind(packet, centralKind);
  const posture = aliasesForBriefingKind(packet, "current_posture");
  const history = aliasesForBriefingKind(packet, "prior_cycle_record");
  const centralKey = packet.presentation_context === "council_matter_review" ? "m" : "o";
  return [
    `root ::= "{" ws "\\"s\\"" ws ":" ws (${speaker}) "," ws "\\"${centralKey}\\"" ws ":" ws (${central})${posture ? '("," ws "\\"p\\"" ws ":" ws (' + posture + '))?' : ""}${history ? '("," ws "\\"h\\"" ws ":" ws (' + history + '))?' : ""} ws "}"`,
    'ws ::= [ \\t\\n\\r]*',
  ].join("\n");
}

export function courtScribeBriefingPrompt(packet: CourtScribeBriefingPacketV1): string {
  return [
    "You are CourtOS Scribe, a local presentation selector with no authority.",
    "Use only the supplied JSON packet. Do not write prose or add facts, names, numbers, causes, actions, questions, assessments, or hidden state.",
    "Return the compact JSON required by the grammar. s is the speaker; o is responsibility scope or m is the Matter; optional p is current posture; optional h is prior-cycle context.",
    "CourtOS renders all player-visible language deterministically from cited claims after validation.",
    `Selection packet (aliases only):\n${JSON.stringify({
      context: packet.presentation_context,
      style: packet.style_card,
      claims: briefingAliases(packet).map(({ alias, kind, status, fact }) => ({ alias, kind, status, fact })),
    })}`,
  ].join("\n\n");
}

/**
 * Restricts the model to a finite, typed sentence-plan envelope. The model
 * selects clause/claim pairs only; CourtOS renders all player-visible wording
 * from those structured claims.
 */
export function courtScribeFiscalGrammar(
  request: CourtScribeFiscalBriefRequestV1,
): string {
  const stewardClaimRule = request.confirmed
    .filter((claim) => claim.status === "confirmed" && claim.fact.kind === "accountable_steward")
    .map((claim) => quoted(modelAliases(request).find((x) => x.claim_id === claim.claim_id)!.alias)).join(" | ");
  const openingClaimRule = request.confirmed
    .filter((claim) => claim.status === "confirmed" && claim.fact.kind === "opening_position")
    .map((claim) => quoted(modelAliases(request).find((x) => x.claim_id === claim.claim_id)!.alias)).join(" | ");
  const postingClaimRule = request.reported
    .filter((claim) => claim.status === "reported" && claim.fact.kind === "prior_cycle_posting")
    .map((claim) => quoted(modelAliases(request).find((x) => x.claim_id === claim.claim_id)!.alias)).join(" | ");
  const rules = [
    // The native wire response stays intentionally tiny: three claim aliases
    // under fixed semantic slots. CourtOS expands it to the public typed clause
    // plan before the renderer can see it.
    `root ::= "{" ws "\\"s\\"" ws ":" ws (${stewardClaimRule}) "," ws "\\"p\\"" ws ":" ws (${openingClaimRule})${postingClaimRule ? '("," ws "\\"h\\"" ws ":" ws (' + postingClaimRule + '))?' : ""} ws "}"`,
  ];
  rules.push('ws ::= [ \\t\\n\\r]*');
  return rules.join("\n");
}

export function courtScribeFiscalPrompt(
  request: CourtScribeFiscalBriefRequestV1,
): string {
  return [
    "You are CourtOS Scribe, a local language layer with no authority.",
    "Use only the supplied JSON packet. Do not write prose. Do not add facts, numbers, persons, counterparties, receipts, causes, assessments, actions, queries, or unknowns.",
    "Return the compact JSON object required by the grammar. Select the supplied aliases only: s is the steward record, p is the opening position, and optional h is one prior-cycle posting.",
    "CourtOS, not this model, renders player-visible wording and claim citations from selected clauses.",
    `Selection packet (aliases only):\n${JSON.stringify({ claims: modelAliases(request).map(({ alias, kind, status, fact }) => ({ alias, kind, status, fact })) })}`,
  ].join("\n\n");
}

export function parseLastJsonObject(text: string): unknown {
  const starts = [...text.matchAll(/\{/g)].map((match) => match.index).reverse();
  for (const start of starts) {
    if (start === undefined) continue;
    let depth = 0;
    let quotedString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const character = text[index];
      if (quotedString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') quotedString = false;
      } else if (character === '"') quotedString = true;
      else if (character === "{") depth += 1;
      else if (character === "}" && --depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, index + 1));
          // Output contains nested clause objects. Search past those inner
          // objects until the enclosing native response is found.
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
            (Object.hasOwn(parsed, "clauses") ||
              (Object.hasOwn(parsed, "s") &&
                (Object.hasOwn(parsed, "p") || Object.hasOwn(parsed, "o") || Object.hasOwn(parsed, "m"))))) return parsed;
        } catch {
          // A brace inside model preamble is not necessarily JSON; continue
          // looking for the outer response object.
        }
      }
    }
  }
  return null;
}

function isFiscalResponse(value: unknown): value is CourtScribeFiscalBriefResponseV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const response = value as Partial<CourtScribeFiscalBriefResponseV1>;
  return objectWithOnlyKeys(value, ["clauses"]) && Array.isArray(response.clauses) &&
    response.clauses.every((clause) => isFiscalClause(clause));
}

type CourtScribeFiscalWireResponseV1 = { s: string; p: string; h?: string };
function isFiscalWireResponse(value: unknown): value is CourtScribeFiscalWireResponseV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const response = value as Partial<CourtScribeFiscalWireResponseV1>;
  return objectWithOnlyKeys(value, ["s", "p", "h"]) &&
    typeof response.s === "string" && typeof response.p === "string" &&
    (response.h === undefined || typeof response.h === "string");
}

type CourtScribeBriefingWireResponseV1 = {
  s: string;
  o?: string;
  m?: string;
  p?: string;
  h?: string;
};
function isBriefingWireResponse(value: unknown): value is CourtScribeBriefingWireResponseV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const response = value as Partial<CourtScribeBriefingWireResponseV1>;
  return objectWithOnlyKeys(value, ["s", "o", "m", "p", "h"]) &&
    typeof response.s === "string" &&
    (typeof response.o === "string" || typeof response.m === "string") &&
    !(response.o && response.m) &&
    (response.p === undefined || typeof response.p === "string") &&
    (response.h === undefined || typeof response.h === "string");
}

function objectWithOnlyKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).every((key) => keys.includes(key));
}

function isFiscalClause(value: unknown): boolean {
  return objectWithOnlyKeys(value, ["kind", "claim_id"]) &&
    ["steward_record", "opening_position_record", "prior_cycle_posting_record"].includes(String(value.kind)) &&
    typeof value.claim_id === "string";
}

function isFiscalClaim(value: unknown): boolean {
  return objectWithOnlyKeys(value, [
    "claim_id", "status", "fact", "numeric_values", "source_ids", "source_status",
  ]) &&
    typeof value.claim_id === "string" &&
    // Candidate facts are not admitted evidence. Refuse them at the host
    // boundary rather than merely preventing their later selection.
    ["confirmed", "reported"].includes(String(value.status)) &&
    isFiscalFact(value.fact) &&
    Array.isArray(value.numeric_values) && value.numeric_values.every((item) => typeof item === "number") &&
    Array.isArray(value.source_ids) && value.source_ids.every((item) => typeof item === "string") &&
    typeof value.source_status === "string" && value.source_status.length > 0;
}

/** The host accepts only the renderer's compact, explicitly typed fiscal facts. */
function isFiscalFact(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const fact = value as Record<string, unknown>;
  if (fact.kind === "accountable_steward") {
    return objectWithOnlyKeys(fact, ["kind", "subject_label"]) &&
      typeof fact.subject_label === "string" && fact.subject_label.length > 0;
  }
  if (fact.kind === "opening_position") {
    return objectWithOnlyKeys(fact, ["kind", "resource_id", "quantity"]) &&
      typeof fact.resource_id === "string" && typeof fact.quantity === "number";
  }
  if (fact.kind === "prior_cycle_posting") {
    return objectWithOnlyKeys(fact, [
      "kind", "resource_id", "quantity", "activity_year", "flow_family", "direction",
    ]) && typeof fact.resource_id === "string" && typeof fact.quantity === "number" &&
      typeof fact.activity_year === "number" && typeof fact.flow_family === "string" &&
      typeof fact.direction === "string";
  }
  return false;
}

/** Reject arbitrary renderer objects before they can become a model prompt. */
export function isCourtScribeFiscalBriefRequest(
  value: unknown,
): value is CourtScribeFiscalBriefRequestV1 {
  if (!objectWithOnlyKeys(value, [
    "schema_version", "request_id", "run_identity", "actor_context", "task", "style_card",
    "confirmed", "reported", "allowed_assessments", "allowed_action_ids", "allowed_query_kinds",
    "disclosure_limits", "output_budget",
  ])) return false;
  if (value.schema_version !== "courtos_scribe_fiscal_brief_packet_v1" ||
    typeof value.request_id !== "string" || value.task !== "briefing" ||
    !Array.isArray(value.confirmed) || !value.confirmed.every(isFiscalClaim) ||
    !Array.isArray(value.reported) || !value.reported.every(isFiscalClaim) ||
    !Array.isArray(value.allowed_assessments) || value.allowed_assessments.length > 0 ||
    !Array.isArray(value.allowed_action_ids) || value.allowed_action_ids.length > 0 ||
    !Array.isArray(value.allowed_query_kinds) || value.allowed_query_kinds.length > 0) return false;
  const run = value.run_identity;
  const actor = value.actor_context;
  const style = value.style_card;
  const limits = value.disclosure_limits;
  const budget = value.output_budget;
  return objectWithOnlyKeys(run, ["source_generation_id", "effective_date"]) &&
    typeof run.source_generation_id === "string" && typeof run.effective_date === "string" &&
    objectWithOnlyKeys(actor, ["house_id", "actor_person_id", "authority_basis", "knowledge_lens", "responsibility"]) &&
    typeof actor.house_id === "string" && typeof actor.actor_person_id === "string" &&
    typeof actor.authority_basis === "string" &&
    (actor.knowledge_lens === "source_bounded_house_records" || actor.knowledge_lens === "qa_projection") &&
    actor.responsibility === "house_fiscal_administration" &&
    objectWithOnlyKeys(style, ["role", "voice"]) &&
    style.role === "house_fiscal_steward" && style.voice === "measured_household_account" &&
    objectWithOnlyKeys(limits, ["allow_counterparty_identity", "allow_personal_financial_detail", "allow_hidden_state", "require_claim_citations", "preserve_source_status"]) &&
    limits.allow_counterparty_identity === false &&
    limits.allow_personal_financial_detail === false &&
    limits.allow_hidden_state === false &&
    limits.require_claim_citations === true &&
    limits.preserve_source_status === true &&
    objectWithOnlyKeys(budget, ["min_words", "max_words"]) &&
    budget.min_words === 60 && budget.max_words === 180;
}

type ScribeBackend = CourtScribeRuntimeBackendV1;
type ResidentScribe = {
  child: ChildProcess;
  port: number;
  backend: ScribeBackend;
  primed: boolean;
};

function elapsedMs(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

/** Cache identity is the complete validated packet, never a caller-supplied ID alone. */
export function courtScribeRequestDigest(request: unknown): string {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function availableLoopbackPort(): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close(() => reject(new Error("CourtOS Scribe could not reserve a loopback port")));
        return;
      }
      probe.close((error) => error ? reject(error) : resolvePromise(address.port));
    });
  });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  lifecycleSignal?: AbortSignal,
): Promise<Response | null> {
  const controller = new AbortController();
  const abortFromLifecycle = () => controller.abort();
  if (lifecycleSignal?.aborted) controller.abort();
  else lifecycleSignal?.addEventListener("abort", abortFromLifecycle, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    lifecycleSignal?.removeEventListener("abort", abortFromLifecycle);
  }
}

function stopNativeChild(child: ChildProcess): void {
  if (child.exitCode !== null) return;
  try {
    child.kill("SIGTERM");
  } catch {
    // A failed signal must never hold the Electron main process open.
  }
  const forceKill = setTimeout(() => {
    if (child.exitCode === null) {
      try {
        child.kill("SIGKILL");
      } catch {
        // The child may already have disappeared between the status check and signal.
      }
    }
  }, 1_000);
  forceKill.unref();
  child.once("exit", () => clearTimeout(forceKill));
  child.unref();
}

async function nativeMetalAvailable(
  serverPath: string,
  signal: AbortSignal,
): Promise<boolean> {
  return new Promise<boolean>((resolvePromise) => {
    let child: ChildProcess;
    try {
      child = spawn(serverPath, ["--list-devices"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      resolvePromise(false);
      return;
    }
    child.unref();
    let output = "";
    let settled = false;
    const finish = (available: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      signal.removeEventListener("abort", abort);
      resolvePromise(available);
    };
    const abort = () => {
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
      finish(false);
    };
    const deadline = setTimeout(abort, DEVICE_PROBE_TIMEOUT_MS);
    deadline.unref();
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => { output += chunk; });
    child.stderr?.on("data", (chunk: string) => { output += chunk; });
    child.once("error", () => finish(false));
    child.once("exit", (code) => finish(
      code === 0 && /\bMetal\d*\b/i.test(output),
    ));
  });
}

/**
 * A process-local, offline host. Its sole input is the compiled packet and it
 * returns no durable artifact. The renderer remains responsible for the final
 * packet-aware response validator and deterministic fallback.
 */
export class CourtScribeFiscalLocalHost {
  private modelAdmitted: boolean | null = null;
  private readonly install: CourtScribeLocalInstallV1;
  private resident: ResidentScribe | null = null;
  private warmPromise: Promise<boolean> | null = null;
  private readonly responseCache = new Map<string, CourtScribeFiscalBriefResponseV1>();
  private readonly requestInFlight = new Map<string, Promise<CourtScribeFiscalBriefResponseV1 | null>>();
  private readonly briefingCache = new Map<string, CourtScribeBriefingPlanV1>();
  private readonly briefingInFlight = new Map<string, Promise<CourtScribeBriefingPlanV1 | null>>();
  private readonly lifecycleAbort = new AbortController();
  private disposed = false;
  private telemetry: CourtScribeRuntimeTelemetryV1 = {
    schema_version: "courtos_scribe_runtime_telemetry_v1",
    phase: "cold",
    backend: null,
    model_verified: null,
    resident_primed: false,
    cache_entries: 0,
    verification_ms: null,
    startup_ms: null,
    prime_ms: null,
    last_request_ms: null,
    last_request_outcome: null,
    last_failure_reason: null,
  };

  constructor(install: CourtScribeLocalInstallV1) {
    this.install = install;
  }

  status(): CourtScribeRuntimeTelemetryV1 {
    return {
      ...this.telemetry,
      cache_entries: this.responseCache.size + this.briefingCache.size,
    };
  }

  private setPhase(phase: CourtScribeRuntimePhaseV1): void {
    this.telemetry = { ...this.telemetry, phase };
  }

  private fail(reason: string): false {
    this.telemetry = { ...this.telemetry, phase: "unavailable", last_failure_reason: reason };
    return false;
  }

  private async admitted(signal: AbortSignal): Promise<boolean> {
    if (this.disposed) return false;
    if (!this.install.available) return this.fail(this.install.reason ?? "native_scribe_unavailable");
    if (this.modelAdmitted !== null) return this.modelAdmitted;
    this.setPhase("verifying");
    const startedAt = performance.now();
    let modelHash: string;
    let runtimeHash: string;
    let serverHash: string;
    try {
      [modelHash, runtimeHash, serverHash] = await Promise.all([
        sha256(this.install.model_path, signal),
        sha256(this.install.executable_path, signal),
        sha256(this.install.server_path, signal),
      ]);
    } catch {
      this.modelAdmitted = signal.aborted ? null : false;
      this.telemetry = {
        ...this.telemetry,
        model_verified: signal.aborted ? null : false,
        verification_ms: elapsedMs(startedAt),
        last_failure_reason: signal.aborted
          ? "native_scribe_warm_deadline_exceeded"
          : "native_scribe_admission_io_failed",
      };
      return this.fail(signal.aborted
        ? "native_scribe_warm_deadline_exceeded"
        : "native_scribe_admission_io_failed");
    }
    this.modelAdmitted = modelHash === MODEL_SHA256 &&
      runtimeHash === RUNTIME_SHA256 && serverHash === SERVER_SHA256;
    this.telemetry = {
      ...this.telemetry,
      model_verified: this.modelAdmitted,
      verification_ms: elapsedMs(startedAt),
      last_failure_reason: this.modelAdmitted ? null : "native_scribe_hash_or_size_mismatch",
    };
    if (!this.modelAdmitted && process.env.COURTOS_SCRIBE_DIAGNOSTIC === "1") {
      console.error(`[CourtOS Scribe admission rejected] model_sha=${modelHash} runtime_sha=${runtimeHash}`);
    }
    if (!this.modelAdmitted) this.setPhase("unavailable");
    return this.modelAdmitted;
  }

  private async startResident(backend: ScribeBackend, signal: AbortSignal): Promise<boolean> {
    if (!(await this.admitted(signal))) return false;
    if (this.disposed) return false;
    this.setPhase("starting");
    const startedAt = performance.now();
    const port = await availableLoopbackPort().catch(() => null);
    if (port === null) return this.fail("native_scribe_loopback_port_unavailable");
    const backendArguments = backend === "cpu"
      ? ["--device", "none", "--gpu-layers", "0", "--no-kv-offload", "--no-op-offload"]
      : ["--gpu-layers", "99"];
    let child: ChildProcess;
    try {
      child = spawn(this.install.server_path, [
        "-m", this.install.model_path,
        "--host", "127.0.0.1",
        "--port", String(port),
        "--no-webui",
        "--parallel", "1",
        "--ctx-size", "2048",
        "--reasoning", "off",
        "--reasoning-budget", "0",
        ...backendArguments,
      ], { stdio: ["ignore", "ignore", "ignore"] });
    } catch {
      return this.fail(`native_scribe_${backend}_spawn_failed`);
    }
    const resident: ResidentScribe = { child, port, backend, primed: false };
    // Electron owns lifecycle explicitly; the native child must never keep a
    // diagnostic harness or a closing app alive after the host is disposed.
    child.unref();
    let spawnFailed = false;
    child.once("error", () => {
      spawnFailed = true;
      if (this.resident === resident) this.resident = null;
      this.telemetry = {
        ...this.telemetry,
        phase: this.disposed ? "disposed" : "unavailable",
        backend: null,
        resident_primed: false,
        last_failure_reason: this.disposed
          ? null
          : `native_scribe_${backend}_spawn_failed`,
      };
    });
    child.once("exit", () => {
      if (this.resident === resident) {
        this.resident = null;
        this.telemetry = {
          ...this.telemetry,
          phase: this.disposed ? "disposed" : "unavailable",
          backend: null,
          resident_primed: false,
          last_failure_reason: this.disposed ? null : "native_scribe_resident_exited",
        };
      }
    });
    const startupBudget = backend === "cpu"
      ? CPU_WARM_START_TIMEOUT_MS
      : WARM_START_TIMEOUT_MS;
    for (let elapsed = 0; elapsed < startupBudget; elapsed += 125) {
      if (signal.aborted || spawnFailed || child.exitCode !== null) break;
      const response = await fetchWithTimeout(
        `http://127.0.0.1:${port}/health`,
        { method: "GET" },
        300,
        signal,
      );
      if (response?.ok) {
        if (this.disposed) {
          stopNativeChild(child);
          return false;
        }
        this.resident = resident;
        this.telemetry = {
          ...this.telemetry,
          phase: "warming",
          backend,
          startup_ms: elapsedMs(startedAt),
          last_failure_reason: null,
        };
        await this.primeResident(resident, signal);
        if (signal.aborted) {
          if (this.resident === resident) this.resident = null;
          stopNativeChild(child);
          return this.fail("native_scribe_warm_deadline_exceeded");
        }
        this.telemetry = {
          ...this.telemetry,
          phase: "ready",
          backend,
          resident_primed: resident.primed,
        };
        return true;
      }
      await sleep(125);
    }
    if (!spawnFailed) stopNativeChild(child);
    return this.fail(signal.aborted
      ? "native_scribe_warm_deadline_exceeded"
      : spawnFailed
      ? `native_scribe_${backend}_spawn_failed`
      : `native_scribe_${backend}_startup_failed`);
  }

  /**
   * Executes one tiny constrained completion while CourtOS is idle. This pays
   * the first Metal-kernel and model-slot costs outside the first briefing.
   * A failed prime does not expose output and does not make the server unsafe;
   * the first real request may still use it within its interactive budget.
   */
  private async primeResident(resident: ResidentScribe, signal: AbortSignal): Promise<void> {
    const startedAt = performance.now();
    const primePacket: CourtScribeFiscalBriefRequestV1 = {
      schema_version: "courtos_scribe_fiscal_brief_packet_v1",
      request_id: "native-warm-prime",
      run_identity: { source_generation_id: "native-warm-prime", effective_date: "1120-01-01" },
      actor_context: {
        house_id: "native-warm-prime",
        actor_person_id: "native-warm-prime",
        authority_basis: "native_warm_prime",
        knowledge_lens: "qa_projection",
        responsibility: "house_fiscal_administration",
      },
      task: "briefing",
      style_card: { role: "house_fiscal_steward", voice: "measured_household_account" },
      confirmed: [{
        claim_id: "native:prime:steward",
        status: "confirmed",
        fact: { kind: "accountable_steward", subject_label: "Recorded steward" },
        numeric_values: [],
        source_ids: ["native:prime"],
        source_status: "qa_projection",
      }, {
        claim_id: "native:prime:position",
        status: "confirmed",
        fact: { kind: "opening_position", resource_id: "coin", quantity: 1 },
        numeric_values: [1],
        source_ids: ["native:prime"],
        source_status: "qa_projection",
      }],
      reported: [],
      allowed_assessments: [],
      allowed_action_ids: [],
      allowed_query_kinds: [],
      disclosure_limits: {
        allow_counterparty_identity: false,
        allow_personal_financial_detail: false,
        allow_hidden_state: false,
        require_claim_citations: true,
        preserve_source_status: true,
      },
      output_budget: { min_words: 60, max_words: 180 },
    };
    const response = await fetchWithTimeout(
      `http://127.0.0.1:${resident.port}/completion`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: courtScribeFiscalPrompt(primePacket),
          grammar: courtScribeFiscalGrammar(primePacket),
          temperature: 0,
          n_predict: 32,
          cache_prompt: true,
        }),
      },
      WARM_PRIME_TIMEOUT_MS,
      signal,
    );
    const genericPrimePacket: CourtScribeBriefingPacketV1 = {
      schema_version: "courtos_scribe_briefing_packet_v1",
      request_id: "native-generic-warm-prime",
      run_identity: { source_generation_id: "native-warm-prime", effective_date: "1120-01-01" },
      actor_context: {
        house_id: "native-warm-prime",
        actor_person_id: "native-warm-prime",
        authority_basis: "native_warm_prime",
        knowledge_lens: "qa_projection",
        responsibility_id: "native_warm_prime",
      },
      presentation_context: "responsibility_briefing",
      style_card: { role: "responsibility_steward", cadence: "measured", register: "household_account" },
      claims: [{
        claim_id: "native:prime:speaker",
        status: "confirmed",
        fact: { kind: "accountable_person", person_id: "native-prime", display_name: "Recorded steward" },
        source_ids: ["native:prime"],
        source_status: "qa_projection",
      }, {
        claim_id: "native:prime:scope",
        status: "confirmed",
        fact: { kind: "responsibility_scope", scope_id: "native-prime", scope_label: "Recorded charge" },
        source_ids: ["native:prime"],
        source_status: "qa_projection",
      }],
      disclosure_limits: {
        allow_hidden_state: false,
        allow_raw_character_traits: false,
        allow_unadmitted_personal_detail: false,
        require_claim_citations: true,
        preserve_source_status: true,
      },
      output_budget: { max_clauses: 5 },
    };
    const genericResponse = await fetchWithTimeout(
      `http://127.0.0.1:${resident.port}/completion`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: courtScribeBriefingPrompt(genericPrimePacket),
          grammar: courtScribeBriefingGrammar(genericPrimePacket),
          temperature: 0,
          n_predict: 24,
          cache_prompt: true,
        }),
      },
      WARM_PRIME_TIMEOUT_MS,
      signal,
    );
    resident.primed = Boolean(response?.ok && genericResponse?.ok);
    this.telemetry = {
      ...this.telemetry,
      prime_ms: elapsedMs(startedAt),
      resident_primed: resident.primed,
    };
  }

  /**
   * Starts the offline model only after CourtOS is interactive. A resident
   * server keeps model weights in memory, so later briefings avoid per-request
   * process/model startup.
   */
  async warm(): Promise<boolean> {
    if (this.disposed) return false;
    if (this.resident) return true;
    if (this.warmPromise) return this.warmPromise;
    const warmAbort = new AbortController();
    const abortWarm = () => warmAbort.abort();
    this.lifecycleAbort.signal.addEventListener("abort", abortWarm, { once: true });
    const deadline = setTimeout(() => warmAbort.abort(), MAX_RUNTIME_MS);
    deadline.unref();
    this.warmPromise = (async () => {
      const forcedCpu = process.env.COURTOS_SCRIBE_BACKEND === "cpu";
      if (!(await this.admitted(warmAbort.signal))) return false;
      const useMetal = !forcedCpu && await nativeMetalAvailable(
        this.install.server_path,
        warmAbort.signal,
      );
      return this.startResident(useMetal ? "metal" : "cpu", warmAbort.signal);
    })().finally(() => {
      clearTimeout(deadline);
      this.lifecycleAbort.signal.removeEventListener("abort", abortWarm);
      this.warmPromise = null;
    });
    return this.warmPromise;
  }

  dispose(): void {
    this.disposed = true;
    this.lifecycleAbort.abort();
    if (this.resident) stopNativeChild(this.resident.child);
    this.resident = null;
    this.responseCache.clear();
    this.requestInFlight.clear();
    this.briefingCache.clear();
    this.briefingInFlight.clear();
    this.telemetry = {
      ...this.telemetry,
      phase: "disposed",
      backend: null,
      resident_primed: false,
      cache_entries: 0,
    };
  }

  private async complete(
    request: CourtScribeFiscalBriefRequestV1,
  ): Promise<CourtScribeFiscalBriefResponseV1 | null> {
    const resident = this.resident;
    if (!resident) return null;
    const requestedCpuDiagnosticTimeout = Number.parseInt(
      process.env.COURTOS_SCRIBE_CPU_DIAGNOSTIC_TIMEOUT_MS ?? "",
      10,
    );
    const timeoutMs = resident.backend === "cpu" &&
      Number.isFinite(requestedCpuDiagnosticTimeout) &&
      requestedCpuDiagnosticTimeout > INTERACTIVE_INFERENCE_BUDGET_MS
      ? Math.min(requestedCpuDiagnosticTimeout, MAX_CPU_DIAGNOSTIC_RUNTIME_MS)
      : INTERACTIVE_INFERENCE_BUDGET_MS;
    const response = await fetchWithTimeout(
      `http://127.0.0.1:${resident.port}/completion`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: courtScribeFiscalPrompt(request),
          grammar: courtScribeFiscalGrammar(request),
          temperature: 0,
          n_predict: 48,
          cache_prompt: true,
        }),
      },
      timeoutMs,
      this.lifecycleAbort.signal,
    );
    if (!response?.ok) return null;
    const payload = await response.json().catch(() => null) as { content?: unknown } | null;
    const parsed = typeof payload?.content === "string"
      ? parseLastJsonObject(payload.content)
      : null;
    const rawResponse = isFiscalWireResponse(parsed) ? parsed : null;
    const aliases = new Map(modelAliases(request).map((entry) => [entry.alias, entry.claim_id]));
    const normalized = rawResponse
      ? { clauses: [
        { kind: "steward_record", claim_id: aliases.get(rawResponse.s) },
        { kind: "opening_position_record", claim_id: aliases.get(rawResponse.p) },
        ...(rawResponse.h
          ? [{ kind: "prior_cycle_posting_record", claim_id: aliases.get(rawResponse.h) }]
          : []),
      ] }
      : null;
    if ((!normalized || !isFiscalResponse(normalized)) && process.env.COURTOS_SCRIBE_DIAGNOSTIC === "1") {
      console.error(`[CourtOS Scribe resident invalid output] ${String(payload?.content ?? "<empty>").slice(-4000)}`);
    }
    return isFiscalResponse(normalized) ? normalized : null;
  }

  private async completeBriefing(
    packet: CourtScribeBriefingPacketV1,
  ): Promise<CourtScribeBriefingPlanV1 | null> {
    const resident = this.resident;
    if (!resident) return null;
    const requestedCpuDiagnosticTimeout = Number.parseInt(
      process.env.COURTOS_SCRIBE_CPU_DIAGNOSTIC_TIMEOUT_MS ?? "",
      10,
    );
    const timeoutMs = resident.backend === "cpu" &&
      Number.isFinite(requestedCpuDiagnosticTimeout) &&
      requestedCpuDiagnosticTimeout > INTERACTIVE_INFERENCE_BUDGET_MS
      ? Math.min(requestedCpuDiagnosticTimeout, MAX_CPU_DIAGNOSTIC_RUNTIME_MS)
      : INTERACTIVE_INFERENCE_BUDGET_MS;
    const response = await fetchWithTimeout(
      `http://127.0.0.1:${resident.port}/completion`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: courtScribeBriefingPrompt(packet),
          grammar: courtScribeBriefingGrammar(packet),
          temperature: 0,
          n_predict: 32,
          cache_prompt: true,
        }),
      },
      timeoutMs,
      this.lifecycleAbort.signal,
    );
    if (!response?.ok) return null;
    const payload = await response.json().catch(() => null) as { content?: unknown } | null;
    const parsed = typeof payload?.content === "string"
      ? parseLastJsonObject(payload.content)
      : null;
    if (!isBriefingWireResponse(parsed)) {
      if (process.env.COURTOS_SCRIBE_DIAGNOSTIC === "1") {
        console.error(`[CourtOS Scribe generic invalid output] ${String(payload?.content ?? "<empty>").slice(-4000)}`);
      }
      return null;
    }
    const aliases = new Map(briefingAliases(packet).map((entry) => [entry.alias, entry.claim_id]));
    const centralAlias = packet.presentation_context === "council_matter_review"
      ? parsed.m
      : parsed.o;
    const variant = packet.style_card.cadence === "direct"
      ? "emphasis" as const
      : packet.style_card.cadence === "deliberative" ? "transition" as const : "plain" as const;
    const clauses: CourtScribeBriefingPlanV1["clauses"] = [
      { kind: "speaker_record", claim_id: aliases.get(parsed.s) ?? "", variant },
      {
        kind: packet.presentation_context === "council_matter_review" ? "matter_record" : "scope_record",
        claim_id: centralAlias ? aliases.get(centralAlias) ?? "" : "",
        variant,
      },
      ...(parsed.p ? [{
        kind: "posture_record" as const,
        claim_id: aliases.get(parsed.p) ?? "",
        variant,
      }] : []),
      ...(parsed.h ? [{
        kind: "prior_cycle_record" as const,
        claim_id: aliases.get(parsed.h) ?? "",
        variant,
      }] : []),
    ];
    const plan = { clauses };
    const validation = validateCourtScribeBriefingPlan(packet, plan);
    if (!validation.ok && process.env.COURTOS_SCRIBE_DIAGNOSTIC === "1") {
      console.error(`[CourtOS Scribe generic invalid plan] ${validation.reason} ${JSON.stringify(parsed)}`);
    }
    return validation.ok ? plan : null;
  }

  async briefing(packet: unknown): Promise<CourtScribeBriefingPlanV1 | null> {
    const startedAt = performance.now();
    if (this.disposed || !isCourtScribeBriefingPacket(packet)) {
      this.telemetry = {
        ...this.telemetry,
        last_request_ms: elapsedMs(startedAt),
        last_request_outcome: "withheld",
        last_failure_reason: this.disposed ? "native_scribe_disposed" : "invalid_briefing_packet",
      };
      return null;
    }
    const digest = `briefing:${courtScribeRequestDigest(packet)}`;
    const cached = this.briefingCache.get(digest);
    if (cached) {
      this.briefingCache.delete(digest);
      this.briefingCache.set(digest, cached);
      this.telemetry = {
        ...this.telemetry,
        last_request_ms: elapsedMs(startedAt),
        last_request_outcome: "cache_hit",
        last_failure_reason: null,
      };
      return cached;
    }
    const existing = this.briefingInFlight.get(digest);
    if (existing) return existing;
    const operation = (async () => {
      const ready = await Promise.race([
        this.warm(),
        sleep(INTERACTIVE_WARM_BUDGET_MS).then(() => false),
      ]);
      if (!ready) return null;
      const plan = await this.completeBriefing(packet);
      if (plan) {
        this.briefingCache.set(digest, plan);
        while (this.briefingCache.size > RESPONSE_CACHE_LIMIT) {
          const oldest = this.briefingCache.keys().next().value as string | undefined;
          if (!oldest) break;
          this.briefingCache.delete(oldest);
        }
      }
      return plan;
    })();
    this.briefingInFlight.set(digest, operation);
    try {
      const plan = await operation;
      this.telemetry = {
        ...this.telemetry,
        last_request_ms: elapsedMs(startedAt),
        last_request_outcome: plan ? "generated" : "withheld",
        last_failure_reason: plan ? null : "native_scribe_unavailable_or_timed_out",
      };
      return plan;
    } finally {
      this.briefingInFlight.delete(digest);
    }
  }

  async fiscalBrief(
    request: unknown,
  ): Promise<CourtScribeFiscalBriefResponseV1 | null> {
    const startedAt = performance.now();
    if (this.disposed || !isCourtScribeFiscalBriefRequest(request)) {
      this.telemetry = {
        ...this.telemetry,
        last_request_ms: elapsedMs(startedAt),
        last_request_outcome: "withheld",
        last_failure_reason: this.disposed ? "native_scribe_disposed" : "invalid_fiscal_packet",
      };
      return null;
    }
    const digest = courtScribeRequestDigest(request);
    const cached = this.responseCache.get(digest);
    if (cached) {
      // Refresh insertion order for a small process-local LRU.
      this.responseCache.delete(digest);
      this.responseCache.set(digest, cached);
      this.telemetry = {
        ...this.telemetry,
        last_request_ms: elapsedMs(startedAt),
        last_request_outcome: "cache_hit",
        last_failure_reason: null,
      };
      return cached;
    }
    const existing = this.requestInFlight.get(digest);
    if (existing) return existing;
    const operation = (async () => {
      const ready = await Promise.race([
        this.warm(),
        sleep(INTERACTIVE_WARM_BUDGET_MS).then(() => false),
      ]);
      if (!ready) return null;
      const response = await this.complete(request);
      if (response) {
        this.responseCache.set(digest, response);
        while (this.responseCache.size > RESPONSE_CACHE_LIMIT) {
          const oldest = this.responseCache.keys().next().value as string | undefined;
          if (!oldest) break;
          this.responseCache.delete(oldest);
        }
      }
      return response;
    })();
    this.requestInFlight.set(digest, operation);
    try {
      const response = await operation;
      this.telemetry = {
        ...this.telemetry,
        last_request_ms: elapsedMs(startedAt),
        last_request_outcome: response ? "generated" : "withheld",
        last_failure_reason: response ? null : "native_scribe_unavailable_or_timed_out",
      };
      return response;
    } finally {
      this.requestInFlight.delete(digest);
    }
  }
}

/** Development root for the existing pinned local PoC asset bundle. */
export function developmentCourtScribeRoot(): string {
  // The host is imported both from TypeScript source (`desktop/`) by focused
  // diagnostics and from `desktop/dist` by Electron. Resolve both layouts,
  // but never fall back to a network or arbitrary model path.
  return basename(import.meta.dirname) === "dist"
    ? resolve(import.meta.dirname, "..", "..", "poc", "local-slm-financial-narrative-v1")
    : resolve(import.meta.dirname, "..", "poc", "local-slm-financial-narrative-v1");
}
