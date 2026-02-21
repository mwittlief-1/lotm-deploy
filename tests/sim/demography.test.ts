import { describe, it, expect } from 'vitest';
import { processNobleFertility, type BirthEvent } from '../../src/sim/demography';

/**
 * These tests are intentionally minimal and self-contained.
 * BE will run the full suite after wiring the module into the turn loop.
 */

type RngLike = {
  float01?: (label: string) => number;
  u32?: (label: string) => number;
};

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function makeSeededRng(seed: number): RngLike {
  return {
    u32: (label: string) => {
      // xorshift32 seeded by a stable FNV-1a hash of (seed + label)
      let h = 0x811c9dc5;
      const s = `${seed}:${label}`;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      // xorshift
      let x = h >>> 0;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return x >>> 0;
    },
  };
}

describe('processNobleFertility (Tier0/1)', () => {
  it('is deterministic for fixed seed + fixed state + fixed turn', () => {
    const baseState = {
      people: {
        p1: { person_id: 'p1', sex: 'F', birth_year: 1000, is_alive: true },
        p2: { person_id: 'p2', sex: 'M', birth_year: 998, is_alive: true },
      },
      houses: {
        h1: { house_id: 'h1', head_person_id: 'p2', member_person_ids: ['p1', 'p2'] },
      },
      kinship_edges: [{ kind: 'spouse_of', from_person_id: 'p1', to_person_id: 'p2' }],
      flags: {},
    };

    const tierSets = { tier0_house_ids: ['h1'] };
    const turn = { year: 1026 }; // mother age 26, father age 28

    const r1 = processNobleFertility(clone(baseState), tierSets, makeSeededRng(123), turn);
    const r2 = processNobleFertility(clone(baseState), tierSets, makeSeededRng(123), turn);

    expect(r1).toEqual(r2);
  });

  it('birth creates person + parent_of edges; ids are unique; ordering is stable', () => {
    const state = {
      people: {
        p1: { person_id: 'p1', sex: 'F', birth_year: 1000, is_alive: true },
        p2: { person_id: 'p2', sex: 'M', birth_year: 998, is_alive: true },
      },
      houses: {
        h1: { house_id: 'h1', head_person_id: 'p2', member_person_ids: ['p1', 'p2'] },
      },
      kinship_edges: [{ kind: 'spouse_of', from_person_id: 'p1', to_person_id: 'p2' }],
      flags: {},
    };

    const tierSets = { tier0_house_ids: ['h1'] };
    const turn = { year: 1026 };

    // Force a birth by ensuring the birth draw is always 0.
    const rng: RngLike = {
      float01: (label: string) => {
        if (label.startsWith('demography.birth.')) return 0;
        return 0.6;
      },
    };

    const out = processNobleFertility(state, tierSets, rng, turn);
    const births = out.births as BirthEvent[];

    expect(births.length).toBe(1);
    expect(births[0].child_person_id).toBe('p3');
    expect(births[0].mother_person_id).toBe('p1');
    expect(births[0].father_person_id).toBe('p2');
    expect(births[0].house_id).toBe('h1');

    // Person created.
    expect(state.people.p3).toBeTruthy();
    expect(state.people.p3.birth_year).toBe(1026);

    // parent_of edges created (two new edges appended, mother then father).
    const edges = state.kinship_edges;
    expect(edges.length).toBe(3);
    expect(edges[1]).toEqual({ kind: 'parent_of', from_person_id: 'p1', to_person_id: 'p3' });
    expect(edges[2]).toEqual({ kind: 'parent_of', from_person_id: 'p2', to_person_id: 'p3' });

    // No duplicate ids.
    const ids = Object.keys(state.people);
    expect(new Set(ids).size).toBe(ids.length);

    // Stable ID counter advanced (start at max suffix + 1 => 3, so next is 4).
    expect(state.flags.demography_next_person_seq).toBe(4);
  });
});
