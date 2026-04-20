import React from "react";

import { buildRunProvenanceV1 } from "../../sim/provenance";
import type { PlayabilityPresetId } from "../playabilityPresetPack";
import type { NewRunPresetSurface } from "../newRunPresetView";

type NewRunScreenProps = {
  appVersion: string;
  onGenerateSeed: () => void;
  onNewRun: () => void;
  onPresetChange: (presetId: PlayabilityPresetId | null) => void;
  onSeedChange: (value: string) => void;
  presetSurface: NewRunPresetSurface;
  seed: string;
  seedLocked: boolean;
  turnYears: number;
};

export function NewRunScreen({
  appVersion,
  onGenerateSeed,
  onNewRun,
  onPresetChange,
  onSeedChange,
  presetSurface,
  seed,
  seedLocked,
  turnYears
}: NewRunScreenProps) {
  const selectedPreset = presetSurface.selectedPreset;
  const provenance = buildRunProvenanceV1();

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "\"Trebuchet MS\", \"Gill Sans\", \"Avenir Next Condensed\", sans-serif",
        maxWidth: 1080,
        margin: "0 auto",
        color: "#2f2418",
        background:
          "radial-gradient(circle at top left, rgba(236, 224, 201, 0.55), transparent 36%), linear-gradient(180deg, #fffaf1 0%, #f3ead9 100%)",
        minHeight: "100vh"
      }}
    >
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", opacity: 0.72 }}>New run shell</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 40, lineHeight: 1.05 }}>Lords of the Manor</h1>
          <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, opacity: 0.82 }}>
            Deterministic, seeded prototype. Turn = {turnYears} years. Locked presets stay on the same canonical init path as custom runs.
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.68 }}>App {appVersion}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.68 }}>
            Provenance: UI {provenance.ui_app_version}, build {provenance.build_info_app_version ?? "unknown"}, status{" "}
            {provenance.version_match ? "aligned" : "mismatch"}.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)"
          }}
        >
          <div
            style={{
              border: "1px solid rgba(172, 143, 100, 0.34)",
              borderRadius: 18,
              padding: 18,
              background: "rgba(255, 255, 255, 0.78)",
              display: "grid",
              gap: 14
            }}
          >
            <div>
              <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.72 }}>Preset selection</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700 }}>
                {selectedPreset ? selectedPreset.title : "Custom seed"}
              </div>
              <div style={{ marginTop: 8, lineHeight: 1.55, opacity: 0.82 }}>
                {selectedPreset
                  ? selectedPreset.summary
                  : "Stay on a free seed, or switch to one of the locked playability presets from the canonical v0.3.5 control plane."}
              </div>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.74 }}>
                Preset
              </span>
              <select
                onChange={(event) =>
                  onPresetChange(event.target.value ? (event.target.value as PlayabilityPresetId) : null)
                }
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(172, 143, 100, 0.38)",
                  background: "#fffdf8",
                  color: "#2f2418"
                }}
                value={presetSurface.selectedPresetId ?? ""}
              >
                <option value="">Custom seed</option>
                {presetSurface.presets.map((preset) => (
                  <option key={preset.presetId} value={preset.presetId}>
                    {preset.title}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr) auto auto", alignItems: "end" }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.74 }}>
                  Seed
                </span>
                <input
                  disabled={seedLocked}
                  onChange={(event) => onSeedChange(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(172, 143, 100, 0.38)",
                    background: seedLocked ? "rgba(236, 224, 201, 0.5)" : "#fffdf8",
                    color: "#2f2418"
                  }}
                  value={seed}
                />
              </label>
              <button
                disabled={seedLocked}
                onClick={onGenerateSeed}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid #ac8f64",
                  background: seedLocked ? "rgba(203, 184, 154, 0.5)" : "#fffaf1",
                  color: "#2f2418",
                  fontWeight: 700,
                  cursor: seedLocked ? "not-allowed" : "pointer"
                }}
                type="button"
              >
                Generate
              </button>
              <button
                onClick={onNewRun}
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "1px solid #ac8f64",
                  background: "#ece0c9",
                  color: "#2f2418",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                type="button"
              >
                New Run
              </button>
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.8 }}>
              {seedLocked
                ? "Preset seeds stay locked to their accepted control-plane row. Switch back to Custom seed if you want to type or generate a new value."
                : "Same seed + same decisions => identical results. Presets only prefill the canonical init DTO; they do not bypass worldgen or registry wiring."}
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(172, 143, 100, 0.34)",
              borderRadius: 18,
              padding: 18,
              background: "rgba(255, 255, 255, 0.78)",
              display: "grid",
              gap: 12
            }}
          >
            <div>
              <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.72 }}>Canonical wiring</div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>One preset control plane, one init seam</div>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.84 }}>
              <div>Preset pack: {presetSurface.contractRelpath}</div>
              <div>Entrypoint: {presetSurface.entrypoint}</div>
              <div>Adapter: {presetSurface.futureAdapter}</div>
              <div>Seam id: {presetSurface.seamId}</div>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.78 }}>
              Source packs:
              <div>{presetSurface.sourcePackRelpaths.join(" | ")}</div>
            </div>
          </div>
        </div>

        {selectedPreset ? (
          <div
            style={{
              border: "1px solid rgba(172, 143, 100, 0.34)",
              borderRadius: 18,
              padding: 18,
              background: "rgba(255, 255, 255, 0.78)",
              display: "grid",
              gap: 14
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.72 }}>Preset provenance</div>
                <div style={{ marginTop: 6, fontSize: 26, fontWeight: 700 }}>{selectedPreset.title}</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.76 }}>{selectedPreset.presetId}</div>
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              <div style={{ padding: "10px 12px", borderRadius: 14, background: "#fffdf8", border: "1px solid rgba(172, 143, 100, 0.24)" }}>
                <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.72 }}>Seed</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{selectedPreset.seed}</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 14, background: "#fffdf8", border: "1px solid rgba(172, 143, 100, 0.24)" }}>
                <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.72 }}>Policy</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{selectedPreset.policyId}</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 14, background: "#fffdf8", border: "1px solid rgba(172, 143, 100, 0.24)" }}>
                <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.72 }}>Target turns</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{selectedPreset.turns}</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 14, background: "#fffdf8", border: "1px solid rgba(172, 143, 100, 0.24)" }}>
                <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.72 }}>Focus</div>
                <div style={{ marginTop: 4, fontWeight: 700 }}>{selectedPreset.focusLabel}</div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.74 }}>
                  Acceptance ids
                </div>
                <div style={{ marginTop: 6, lineHeight: 1.55, opacity: 0.84 }}>{selectedPreset.acceptanceLabel}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", opacity: 0.74 }}>
                  Source refs
                </div>
                <div style={{ marginTop: 6, display: "grid", gap: 4, lineHeight: 1.55, opacity: 0.84 }}>
                  {selectedPreset.sourceRefs.map((sourceRef) => (
                    <div key={`${sourceRef.packId}:${sourceRef.scenarioId}`}>
                      {sourceRef.relpath} {"->"} {sourceRef.scenarioId}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
