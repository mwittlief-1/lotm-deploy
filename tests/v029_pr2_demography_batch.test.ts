import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

import { createNewRun } from '../src/sim/state';
import { applyDecisions, createDefaultDecisions, proposeTurn } from '../src/sim/turn';

function runTurns(state: any, turns: number): any {
  let s = state;
  for (let i = 0; i < turns; i++) {
    const ctx = proposeTurn(s);
    s = applyDecisions(s, createDefaultDecisions());
    if (!ctx) break;
  }
  return s;
}

describe('v0.2.9 PR2 demography + batch', () => {
  it('no births at maternal age 45+', () => {
    let s: any = createNewRun('TEST_PR2_NO_BIRTH_45');
    s.house.spouse.age = 45;
    s.house.spouse.alive = true;
    s.house.spouse_status = 'spouse';
    s.house.head.alive = true;
    const before = s.house.children.length;
    s = runTurns(s, 6);
    expect(s.house.children.length).toBe(before);
  });

  it('birth spacing is at least 2 years per mother', () => {
    let s: any = createNewRun('TEST_PR2_SPACING');
    s.house.spouse.age = 24;
    s.house.spouse.traits.fertility = 5;
    (s.flags as any)._tuning.fertility_mult = 2.5;
    s = runTurns(s, 15);

    const years: number[] = [];
    for (const c of s.house.children) {
      const m = String(c.id).match(/^p_child_(\d+)_(\d+)_/);
      if (!m) continue;
      const turn = Number(m[1]);
      const y = Number(m[2]);
      years.push(turn * 3 + y);
    }
    years.sort((a, b) => a - b);
    for (let i = 1; i < years.length; i++) {
      expect(years[i] - years[i - 1]).toBeGreaterThanOrEqual(2);
    }
  });

  it('batch scripts are deterministic and centenarians remain rare', () => {
    execSync('pnpm demography:batch:cohort', { stdio: 'pipe' });
    const h1 = fs.readFileSync('qa_artifacts/demography_batch/cohort/summary.sha256', 'utf8').trim();
    execSync('pnpm demography:batch:cohort', { stdio: 'pipe' });
    const h2 = fs.readFileSync('qa_artifacts/demography_batch/cohort/summary.sha256', 'utf8').trim();
    expect(h1).toBe(h2);

    const summary = JSON.parse(fs.readFileSync('qa_artifacts/demography_batch/cohort/summary.json', 'utf8'));
    expect(summary.centenarian_rate).toBeLessThan(0.05);

    execSync('pnpm demography:batch:sim', { stdio: 'pipe' });
    const s1 = fs.readFileSync('qa_artifacts/demography_batch/sim/summary.sha256', 'utf8').trim();
    execSync('pnpm demography:batch:sim', { stdio: 'pipe' });
    const s2 = fs.readFileSync('qa_artifacts/demography_batch/sim/summary.sha256', 'utf8').trim();
    expect(s1).toBe(s2);
  });
});
