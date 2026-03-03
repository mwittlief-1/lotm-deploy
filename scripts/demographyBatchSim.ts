#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createNewRun, proposeTurn, applyDecisions } from '../src/sim';
import { decide } from '../src/sim/policies';

const outdir = path.resolve('qa_artifacts/demography_batch/sim');
fs.mkdirSync(outdir, { recursive: true });

const seed = 'run_1772480247487';
let s: any = createNewRun(seed);
const rows: Array<{turn:number; births:number; deaths:number}> = [];

for (let t = 0; t < 15; t++) {
  const ctx: any = proposeTurn(s);
  const deaths = Number(ctx.report?.population_change?.deaths ?? 0);
  const births = Number(ctx.report?.population_change?.births ?? 0);
  rows.push({ turn: t, births, deaths });
  s = applyDecisions(s, decide('prudent-builder', s, ctx));
}

const summary = { seed, rows, final_turn: s.turn_index };
const body = JSON.stringify(summary, null, 2);
const hash = crypto.createHash('sha256').update(body).digest('hex');
fs.writeFileSync(path.join(outdir, 'summary.json'), body);
fs.writeFileSync(path.join(outdir, 'summary.sha256'), `${hash}\n`);
console.log(hash);
