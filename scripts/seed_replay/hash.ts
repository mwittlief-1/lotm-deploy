import crypto from "node:crypto";

function stableValueInner(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => stableValueInner(entry, seen));
  }

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
    out[key] = stableValueInner((value as Record<string, unknown>)[key], seen);
  }
  return out;
}

export function stableValue(value: unknown): unknown {
  return stableValueInner(value, new WeakSet<object>());
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

