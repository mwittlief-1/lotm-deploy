import React from "react";

type NewRunScreenProps = {
  appVersion: string;
  onGenerateSeed: () => void;
  onNewRun: () => void;
  onSeedChange: (value: string) => void;
  seed: string;
  turnYears: number;
};

export function NewRunScreen({
  appVersion,
  onGenerateSeed,
  onNewRun,
  onSeedChange,
  seed,
  turnYears
}: NewRunScreenProps) {
  return (
    <div style={{ padding: 16, fontFamily: "sans-serif", maxWidth: 900 }}>
      <h1>Lords of the Manor - MVP ({appVersion})</h1>
      <p>Deterministic, seeded prototype. Turn = {turnYears} years.</p>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label>Seed:</label>
        <input value={seed} onChange={(e) => onSeedChange(e.target.value)} style={{ width: 360 }} />
        <button onClick={onGenerateSeed}>Generate</button>
        <button onClick={onNewRun}>New Run</button>
      </div>

      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Note: Same seed + same decisions ⇒ identical results (no Math.random in sim).
      </p>
    </div>
  );
}
