import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createNewRun, proposeTurn, applyDecisions } from "../src/sim/index";

const outDir = path.resolve("qa_artifacts/demography_batch");
fs.mkdirSync(outDir, { recursive: true });

const seeds = Array.from({ length: 24 }).map((_, i) => `demo_cohort_${i}`);
const rows: Array<{ seed: string; alive_children: number; max_age: number; over100: number }> = [];
for (const seed of seeds) {
  let s: any = createNewRun(seed);
  for (let t = 0; t < 18; t++) {
    proposeTurn(s);
    s = applyDecisions(s, {
      labor: { kind: "labor", desired_farmers: s.manor.farmers, desired_builders: s.manor.builders },
      sell: { kind: "sell", sell_bushels: 0 },
      obligations: { kind: "pay_obligations", pay_coin: 0, pay_bushels: 0, war_levy_choice: "ignore" },
      construction: { kind: "construction", action: "none" },
      marriage: { kind: "marriage", action: "none" },
      prospects: { kind: "prospects", actions: [] }
    } as any);
  }
  const ages = (s.house.children ?? []).map((c: any) => c.age).sort((a: number, b: number) => a - b);
  rows.push({
    seed,
    alive_children: (s.house.children ?? []).filter((c: any) => c.alive).length,
    max_age: Math.max(...ages, 0),
    over100: ages.filter((a: number) => a >= 100).length
  });
}
rows.sort((a, b) => a.seed.localeCompare(b.seed));
const payload = { schema: "demography_cohort_v1", rows };
const raw = JSON.stringify(payload, null, 2);
const hash = crypto.createHash("sha256").update(raw).digest("hex");
fs.writeFileSync(path.join(outDir, "cohort_summary.json"), raw);
fs.writeFileSync(path.join(outDir, "cohort_hash.txt"), `${hash}\n`);
console.log(`cohort_hash=${hash}`);
