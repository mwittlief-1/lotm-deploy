import Database from "better-sqlite3";

import type {
  CourtOsHousePlanV1,
  CourtOsPlanOperationResultV1,
  CourtOsPlanningStoreCommitV1,
  CourtOsPlanningStoreV1,
  CourtOsStoredPlanVersionV1,
} from "./contracts";
import { CourtOsPlanningError } from "./planLifecycle";

interface HeadRow {
  current_version: number;
  current_digest: string;
}

interface PlanRow {
  plan_json: string;
  receipt_json: string;
}

interface IdempotencyRow {
  request_digest: string;
  result_json: string;
}

export class CourtOsSqlitePlanningStoreV1 implements CourtOsPlanningStoreV1 {
  private readonly database: Database.Database;

  constructor(databasePath: string) {
    if (!databasePath.trim()) {
      throw new Error("CourtOS planning database path is required.");
    }
    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("foreign_keys = ON");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS courtos_plan_head_v1 (
        house_id TEXT NOT NULL,
        turn_id TEXT NOT NULL,
        current_version INTEGER NOT NULL,
        current_digest TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft', 'submitted')),
        PRIMARY KEY (house_id, turn_id)
      );
      CREATE TABLE IF NOT EXISTS courtos_plan_version_v1 (
        house_id TEXT NOT NULL,
        turn_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft', 'submitted')),
        content_digest TEXT NOT NULL,
        source_generation_id TEXT NOT NULL,
        supersedes_version INTEGER,
        created_at TEXT NOT NULL,
        plan_json TEXT NOT NULL,
        receipt_json TEXT NOT NULL,
        PRIMARY KEY (house_id, turn_id, version),
        UNIQUE (plan_id, version)
      );
      CREATE TABLE IF NOT EXISTS courtos_plan_idempotency_v1 (
        house_id TEXT NOT NULL,
        turn_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_digest TEXT NOT NULL,
        result_json TEXT NOT NULL,
        PRIMARY KEY (house_id, turn_id, operation, idempotency_key)
      );
    `);
  }

  currentPlan(input: {
    houseId: string;
    turnId: string;
  }): CourtOsHousePlanV1 | null {
    const row = this.database
      .prepare(
        `SELECT version.plan_json, version.receipt_json
         FROM courtos_plan_head_v1 AS head
         JOIN courtos_plan_version_v1 AS version
           ON version.house_id = head.house_id
          AND version.turn_id = head.turn_id
          AND version.version = head.current_version
         WHERE head.house_id = ? AND head.turn_id = ?`,
      )
      .get(input.houseId, input.turnId) as PlanRow | undefined;
    return row ? (JSON.parse(row.plan_json) as CourtOsHousePlanV1) : null;
  }

  planVersion(input: {
    houseId: string;
    turnId: string;
    version: number;
  }): CourtOsStoredPlanVersionV1 | null {
    const row = this.database
      .prepare(
        `SELECT plan_json, receipt_json
         FROM courtos_plan_version_v1
         WHERE house_id = ? AND turn_id = ? AND version = ?`,
      )
      .get(input.houseId, input.turnId, input.version) as PlanRow | undefined;
    return row ? this.parseStoredVersion(row) : null;
  }

  planHistory(input: {
    houseId: string;
    turnId: string;
  }): readonly CourtOsStoredPlanVersionV1[] {
    const rows = this.database
      .prepare(
        `SELECT plan_json, receipt_json
         FROM courtos_plan_version_v1
         WHERE house_id = ? AND turn_id = ?
         ORDER BY version DESC`,
      )
      .all(input.houseId, input.turnId) as PlanRow[];
    return rows.map((row) => this.parseStoredVersion(row));
  }

  private parseStoredVersion(row: PlanRow): CourtOsStoredPlanVersionV1 {
    return {
      plan: JSON.parse(row.plan_json) as CourtOsHousePlanV1,
      receipt: JSON.parse(row.receipt_json) as CourtOsStoredPlanVersionV1["receipt"],
    };
  }

  idempotentResult(input: {
    houseId: string;
    turnId: string;
    operation: "save_contribution" | "submit_plan";
    idempotencyKey: string;
    requestDigest: string;
  }): CourtOsPlanOperationResultV1 | null {
    const row = this.database
      .prepare(
        `SELECT request_digest, result_json
         FROM courtos_plan_idempotency_v1
         WHERE house_id = ? AND turn_id = ? AND operation = ?
           AND idempotency_key = ?`,
      )
      .get(
        input.houseId,
        input.turnId,
        input.operation,
        input.idempotencyKey,
      ) as IdempotencyRow | undefined;
    if (!row) return null;
    if (row.request_digest !== input.requestDigest) {
      throw new CourtOsPlanningError(
        "COURTOS_PLAN_IDEMPOTENCY_CONFLICT",
        "The planning idempotency key was already used for different content.",
      );
    }
    return JSON.parse(row.result_json) as CourtOsPlanOperationResultV1;
  }

  commit(input: CourtOsPlanningStoreCommitV1): CourtOsPlanOperationResultV1 {
    const transact = this.database.transaction(() => {
      const replay = this.idempotentResult({
        houseId: input.result.plan.house_id,
        turnId: input.result.plan.turn_id,
        operation: input.operation,
        idempotencyKey: input.idempotency_key,
        requestDigest: input.request_digest,
      });
      if (replay) return { ...replay, idempotent_replay: true };

      const head = this.database
        .prepare(
          `SELECT current_version, current_digest
           FROM courtos_plan_head_v1
           WHERE house_id = ? AND turn_id = ?`,
        )
        .get(
          input.result.plan.house_id,
          input.result.plan.turn_id,
        ) as HeadRow | undefined;
      const currentVersion = head?.current_version ?? null;
      const currentDigest = head?.current_digest ?? null;
      if (
        currentVersion !== input.expected_plan_version ||
        currentDigest !== input.expected_plan_digest
      ) {
        throw new CourtOsPlanningError(
          "COURTOS_PLAN_STALE_VERSION",
          "The House plan changed while this version was being saved.",
        );
      }

      const plan = input.result.plan;
      this.database
        .prepare(
          `INSERT INTO courtos_plan_version_v1 (
             house_id, turn_id, version, plan_id, status, content_digest,
             source_generation_id, supersedes_version, created_at, plan_json,
             receipt_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          plan.house_id,
          plan.turn_id,
          plan.version,
          plan.plan_id,
          plan.status,
          plan.content_digest,
          plan.source_snapshot.generation_id,
          plan.supersedes_version,
          plan.created_at,
          JSON.stringify(plan),
          JSON.stringify(input.result.receipt),
        );
      this.database
        .prepare(
          `INSERT INTO courtos_plan_head_v1 (
             house_id, turn_id, current_version, current_digest, status
           ) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(house_id, turn_id) DO UPDATE SET
             current_version = excluded.current_version,
             current_digest = excluded.current_digest,
             status = excluded.status`,
        )
        .run(
          plan.house_id,
          plan.turn_id,
          plan.version,
          plan.content_digest,
          plan.status,
        );
      this.database
        .prepare(
          `INSERT INTO courtos_plan_idempotency_v1 (
             house_id, turn_id, operation, idempotency_key, request_digest,
             result_json
           ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          plan.house_id,
          plan.turn_id,
          input.operation,
          input.idempotency_key,
          input.request_digest,
          JSON.stringify(input.result),
        );
      return input.result;
    });
    return transact();
  }

  close(): void {
    this.database.close();
  }
}
