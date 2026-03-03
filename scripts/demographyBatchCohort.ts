#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createNewRun, proposeTurn, applyDecisions } from '../src/sim';
import { decide } from '../src/sim/policies';

const outdir = path.resolve('qa_artifacts/demography_batch/cohort');
fs.mkdirSync(outdir, { recursive: true });

const seeds = ['cohort_a', 'cohort_b', 'cohort_c', 'cohort_d', 'cohort_e'];
const turns = 20;
const ages: number[] = [];
let centenarians = 0;
let alive = 0;

for (const seed of seeds) {
  let s: any = createNewRun(seed);
  for (let t = 0; t < turns; t++) {
    const ctx = proposeTurn(s);
    s = applyDecisions(s, decide('prudent-builder', s, ctx));
  }
  for (const p of Object.values((s as any).people ?? {}) as any[]) {
    if (!p || p.alive !== true) continue;
    alive += 1;
    ages.push(Math.trunc(p.age ?? 0));
    if ((p.age ?? 0) >= 100) centenarians += 1;
  }
}

ages.sort((a, b) => a - b);
const summary = {
  seeds,
  turns,
  alive,
  centenarians,
  centenarian_rate: alive > 0 ? centenarians / alive : 0,
  max_age: ages.length ? ages[ages.length - 1] : 0,
  median_age: ages.length ? ages[Math.floor(ages.length / 2)] : 0
};
const body = JSON.stringify(summary, null, 2);
const hash = crypto.createHash('sha256').update(body).digest('hex');
fs.writeFileSync(path.join(outdir, 'summary.json'), body);
fs.writeFileSync(path.join(outdir, 'summary.sha256'), `${hash}\n`);
console.log(hash);
