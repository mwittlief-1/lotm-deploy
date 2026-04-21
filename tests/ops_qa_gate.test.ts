import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  qaEvidencePaths,
  resolveQaGateVersion,
  sanitizeQaVersion
} from "../scripts/qaGate.js";

describe("qa gate evidence paths", () => {
  it("resolves the v0.3.6 build stamp into version-scoped QA artifacts", () => {
    expect(resolveQaGateVersion()).toBe("v0.3.6");

    const paths = qaEvidencePaths("v0.3.6", process.cwd());
    expect(path.relative(process.cwd(), paths.summary)).toBe("qa_artifacts/v0.3.6_qa.json");
    expect(path.relative(process.cwd(), paths.vitest)).toBe("qa_artifacts/v0.3.6_vitest.json");
    expect(path.relative(process.cwd(), paths.uat)).toBe("qa_artifacts/v0.3.6_uat_gate.json");
    expect(path.relative(process.cwd(), paths.legacyVitest)).toBe("qa_artifacts/vitest.json");
    expect(path.relative(process.cwd(), paths.legacyUat)).toBe("qa_artifacts/uat_gate.json");
  });

  it("sanitizes unexpected version stamps before deriving artifact names", () => {
    expect(sanitizeQaVersion("v0.3.6 qa/nightly")).toBe("v0.3.6_qa_nightly");
    expect(sanitizeQaVersion("")).toBe("unknown");
  });
});
