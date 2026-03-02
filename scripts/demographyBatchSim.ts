import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createNewRun, proposeTurn, applyDecisions } from "../src/sim/index";

const outDir = path.resolve("qa_artifacts/demography_batch");
fs.mkdirSync(outDir, { recursive: true });

const seeds = Array.from({ length: 16 }).map((_, i) => `demo_sim_${i}`);
const traces: Array<{ seed: string; turns: Array<{ t: number; births: number; deaths: number; pop: number }> }> = [];
for (const seed of seeds) {
  let s: any = createNewRun(seed);
  const turns: Array<{ t: number; births: number; deaths: number; pop: number }> = [];
  for (let t = 0; t < 12; t++) {
    const ctx: any = proposeTurn(s);
    turns.push({ t, births: ctx.report.household.births.length, deaths: ctx.report.household.deaths.length, pop: ctx.preview_state.manor.population });
    s = applyDecisions(s, {
      labor: { kind: "labor", desired_farmers: s.manor.farmers, desired_builders: s.manor.builders },
      sell: { kind: "sell", sell_bushels: 0 },
      obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
      construction: { kind: "construction", action: "none" },
      marriage: { kind: "marriage", action: "none" },
      prospects: { kind: "prospects", actions: [] }
    } as any);
  }
  traces.push({ seed, turns });
}
traces.sort((a, b) => a.seed.localeCompare(b.seed));
const payload = { schema: "demography_sim_v1", traces };
const raw = JSON.stringify(payload, null, 2);
const hash = crypto.createHash("sha256").update(raw).digest("hex");
fs.writeFileSync(path.join(outDir, "sim_summary.json"), raw);
fs.writeFileSync(path.join(outDir, "sim_hash.txt"), `${hash}\n`);
console.log(`sim_hash=${hash}`);
