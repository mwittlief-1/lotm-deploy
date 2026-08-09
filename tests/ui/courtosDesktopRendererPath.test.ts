import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

import { safeRendererAssetPath } from "../../desktop/safeRendererPath";

const root = resolve("/private/tmp/merecross/renderer");

describe("CourtOS desktop renderer path containment", () => {
  it("resolves the default document and nested renderer assets", () => {
    expect(safeRendererAssetPath(root, new URL("merecross://app/")))
      .toBe(resolve(root, "courtos-home.html"));
    expect(safeRendererAssetPath(root, new URL("merecross://app/assets/rooms/council.webp")))
      .toBe(resolve(root, "assets/rooms/council.webp"));
  });

  it("rejects parent traversal and a sibling that merely shares the root prefix", () => {
    expect(safeRendererAssetPath(root, new URL("merecross://app/%2e%2e%2frenderer-private/secret")))
      .toBeNull();
    expect(safeRendererAssetPath(root, new URL("merecross://app/assets/%2e%2e%2f%2e%2e%2fprivate")))
      .toBeNull();
  });

  it("rejects malformed percent encoding without throwing", () => {
    expect(safeRendererAssetPath(root, new URL("merecross://app/%E0%A4%A")))
      .toBeNull();
  });
});
