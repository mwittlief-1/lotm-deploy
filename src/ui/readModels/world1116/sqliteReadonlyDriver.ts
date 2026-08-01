import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";

import Database from "better-sqlite3";

import type { World1116RawRow } from "./types";

export interface World1116ReadonlySqliteDriver {
  readonly databasePath: string;
  readonly databaseUri: string;
  readonly policy: {
    mode: "ro";
    immutable: boolean;
    queryOnly: true;
  };
  assertReadPolicy(): Promise<void>;
  all<T extends object = World1116RawRow>(sql: string): Promise<readonly T[]>;
  close(): Promise<void>;
}

export type World1116ReadonlySqliteDriverFactory = (
  databasePath: string
) => Promise<World1116ReadonlySqliteDriver>;

const READ_STATEMENT = /^(SELECT|WITH|PRAGMA)\b/i;
const FORBIDDEN_SQL = /\b(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|VACUUM|ATTACH|DETACH|REINDEX|ANALYZE)\b/i;
const READ_PRAGMA = /^PRAGMA\s+(table_info|table_xinfo|index_list|index_info|query_only|database_list)\s*(?:\(|$)/i;

function validateReadStatement(sql: string): string {
  const statement = sql.trim().replace(/;\s*$/, "");
  if (!statement || !READ_STATEMENT.test(statement)) {
    throw new Error("World 1116 SQLite driver accepts SELECT, WITH, or read PRAGMA statements only.");
  }
  if (statement.includes(";")) {
    throw new Error("World 1116 SQLite driver accepts one read statement per call.");
  }
  if (FORBIDDEN_SQL.test(statement)) {
    throw new Error("World 1116 SQLite driver rejected a mutating or administrative SQL keyword.");
  }
  if (/^PRAGMA\b/i.test(statement) && (!READ_PRAGMA.test(statement) || statement.includes("="))) {
    throw new Error("World 1116 SQLite driver accepts only allowlisted read PRAGMA statements.");
  }
  return statement;
}

function runSqlite(
  executable: string,
  args: readonly string[],
  maxBufferBytes: number
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      [...args],
      { encoding: "utf8", maxBuffer: maxBufferBytes, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr.trim() || error.message;
          reject(new Error(`Read-only SQLite query failed: ${message}`));
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

export interface SqliteCliReadonlyDriverOptions {
  sqliteExecutable?: string;
  maxBufferBytes?: number;
}

/**
 * In-process production driver. Unlike the development CLI adapter below, it
 * does not depend on a host-provided `sqlite3` executable. The database is
 * opened read-only, the connection is query-only, and the same SQL allowlist
 * is enforced before SQLite sees a statement. Snapshot immutability is enforced
 * by the read-model service's checksum verification before this driver opens;
 * better-sqlite3 does not consume SQLite URI immutable flags.
 */
export class NativeSqliteReadonlyDriver implements World1116ReadonlySqliteDriver {
  readonly databasePath: string;
  readonly databaseUri: string;
  readonly policy = Object.freeze({ mode: "ro" as const, immutable: false, queryOnly: true as const });

  private readonly database: Database.Database;
  private closed = false;

  constructor(databasePath: string) {
    this.databasePath = databasePath;
    this.databaseUri = pathToFileURL(databasePath).href;
    this.database = new Database(databasePath, {
      readonly: true,
      fileMustExist: true,
    });
    this.database.pragma("query_only = ON");
  }

  async assertReadPolicy(): Promise<void> {
    if (this.closed) throw new Error("World 1116 SQLite driver is closed.");
    const row = this.database
      .prepare(
        "SELECT (SELECT query_only FROM pragma_query_only) AS query_only, " +
          "(SELECT file FROM pragma_database_list WHERE name = 'main') AS database_path",
      )
      .get() as { query_only?: number; database_path?: string } | undefined;
    if (!row || Number(row.query_only) !== 1) {
      throw new Error("SQLite PRAGMA query_only did not remain enabled.");
    }
  }

  async all<T extends object = World1116RawRow>(sql: string): Promise<readonly T[]> {
    if (this.closed) throw new Error("World 1116 SQLite driver is closed.");
    const statement = validateReadStatement(sql);
    return this.database.prepare(statement).all() as T[];
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.database.close();
  }
}

/**
 * Node-side development driver. It is intentionally hidden behind a replaceable
 * interface so production UI can later consume runtime/API projections.
 *
 * sqlite3 opens a fresh connection for each query. Every connection uses the
 * same session-pinned path, URI mode=ro&immutable=1, -readonly, and query_only.
 */
export class SqliteCliReadonlyDriver implements World1116ReadonlySqliteDriver {
  readonly databasePath: string;
  readonly databaseUri: string;
  readonly policy = Object.freeze({ mode: "ro" as const, immutable: true as const, queryOnly: true as const });

  private readonly sqliteExecutable: string;
  private readonly maxBufferBytes: number;
  private closed = false;

  constructor(databasePath: string, options: SqliteCliReadonlyDriverOptions = {}) {
    this.databasePath = databasePath;
    const uri = pathToFileURL(databasePath);
    uri.searchParams.set("mode", "ro");
    uri.searchParams.set("immutable", "1");
    this.databaseUri = uri.href;
    this.sqliteExecutable = options.sqliteExecutable ?? "sqlite3";
    this.maxBufferBytes = options.maxBufferBytes ?? 64 * 1024 * 1024;
  }

  async assertReadPolicy(): Promise<void> {
    const rows = await this.all<{ query_only: number; database_path: string }>(
      "SELECT (SELECT query_only FROM pragma_query_only) AS query_only, " +
        "(SELECT file FROM pragma_database_list WHERE name = 'main') AS database_path"
    );
    const row = rows[0];
    if (!row || Number(row.query_only) !== 1) {
      throw new Error("SQLite PRAGMA query_only did not remain enabled.");
    }
  }

  async all<T extends object = World1116RawRow>(sql: string): Promise<readonly T[]> {
    if (this.closed) throw new Error("World 1116 SQLite driver is closed.");
    const statement = validateReadStatement(sql);
    const { stdout } = await runSqlite(
      this.sqliteExecutable,
      [
        "-batch",
        "-readonly",
        "-json",
        "-cmd",
        "PRAGMA query_only=ON;",
        this.databaseUri,
        statement
      ],
      this.maxBufferBytes
    );
    const payload = stdout.trim();
    if (!payload) return [];
    const parsed: unknown = JSON.parse(payload);
    if (!Array.isArray(parsed)) throw new Error("SQLite JSON output was not an array.");
    return parsed as readonly T[];
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

export const openSqliteCliReadonlyDriver: World1116ReadonlySqliteDriverFactory = async (databasePath) =>
  new SqliteCliReadonlyDriver(databasePath);
