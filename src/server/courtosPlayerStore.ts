import Database from "better-sqlite3";

const STEWARDSHIP_KEY_PREFIX = "merecross.courtos.uat1.stewardship-plan:";
const LEGACY_ASSIGNMENT_KEY_PREFIX =
  "merecross.courtos.uat1.assignment-draft:";
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

type StoredDocument = {
  document_key: string;
  document_json: string;
};

function assertKey(key: unknown): string {
  if (
    typeof key !== "string" ||
    (!key.startsWith(STEWARDSHIP_KEY_PREFIX) &&
      !key.startsWith(LEGACY_ASSIGNMENT_KEY_PREFIX)) ||
    key.length > 2_048
  ) {
    throw new Error("CourtOS player store rejected an unsupported document key.");
  }
  return key;
}

function assertDocument(value: unknown): string {
  if (
    typeof value !== "string" ||
    Buffer.byteLength(value, "utf8") > MAX_DOCUMENT_BYTES
  ) {
    throw new Error("CourtOS player store rejected an oversized planning document.");
  }
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("CourtOS player store accepts planning JSON objects only.");
  }
  const schema = (parsed as { schema_version?: unknown }).schema_version;
  if (
    schema !== "courtos_stewardship_plan_v1" &&
    schema !== "courtos_stewardship_plan_journal_v1" &&
    schema !== "courtos_uat1_assignment_draft_v1"
  ) {
    throw new Error("CourtOS player store rejected an unsupported planning schema.");
  }
  return value;
}

/** Mutable, player-authored state. No admitted world table is attached here. */
export class CourtOsPlayerSqliteStoreV1 {
  private readonly database: Database.Database;

  constructor(databasePath: string) {
    if (!databasePath.trim()) {
      throw new Error("CourtOS player database path is required.");
    }
    this.database = new Database(databasePath);
    this.database.pragma("journal_mode=WAL");
    this.database.pragma("foreign_keys=ON");
    this.database.pragma("busy_timeout=3000");
    this.database.pragma("user_version=1");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS courtos_player_document_v1 (
        document_key TEXT PRIMARY KEY,
        document_kind TEXT NOT NULL CHECK (
          document_kind IN ('stewardship_plan', 'legacy_assignment_draft')
        ),
        document_json TEXT NOT NULL CHECK (json_valid(document_json)),
        updated_at TEXT NOT NULL
      );
    `);
  }

  getItem(keyValue: unknown): string | null {
    const key = assertKey(keyValue);
    const row = this.database
      .prepare(
        "SELECT document_key, document_json FROM courtos_player_document_v1 WHERE document_key=?",
      )
      .get(key) as StoredDocument | undefined;
    return row?.document_json ?? null;
  }

  setItem(keyValue: unknown, documentValue: unknown): void {
    const key = assertKey(keyValue);
    const document = assertDocument(documentValue);
    const kind = key.startsWith(STEWARDSHIP_KEY_PREFIX)
      ? "stewardship_plan"
      : "legacy_assignment_draft";
    this.database
      .prepare(
        `INSERT INTO courtos_player_document_v1
         (document_key, document_kind, document_json, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(document_key) DO UPDATE SET
           document_kind=excluded.document_kind,
           document_json=excluded.document_json,
           updated_at=excluded.updated_at`,
      )
      .run(key, kind, document, new Date().toISOString());
  }

  removeItem(keyValue: unknown): void {
    const key = assertKey(keyValue);
    this.database
      .prepare("DELETE FROM courtos_player_document_v1 WHERE document_key=?")
      .run(key);
  }

  close(): void {
    this.database.close();
  }
}
