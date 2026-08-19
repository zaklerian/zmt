import type { TechnologySlim } from '@contracts';

import { describe, expect, it } from 'vitest';

import {
  collectTechnologyDescendants,
  collectTechnologyInboundReferences,
} from './technology-delete-graph.util';

// The delete-tree edge graph in isolation (ZMT-52 gates 2 and 3). The service
// spec drives the same rules end-to-end through the real index; this one pins the
// rules themselves, including the two the fixture cannot show cheaply — a cycle
// and a reference to a token no source defines.

const AIR = 'air_techs_folder';

function slim(
  id: string,
  overrides: Partial<TechnologySlim> = {},
): TechnologySlim {
  return {
    categories: [],
    dependencyTargets: [],
    folderName: AIR,
    id,
    nodeKind: 'simple',
    pathTargets: [],
    position: { x: 0, y: 0 },
    startYear: null,
    subTechnologies: [],
    ...overrides,
  };
}

describe('collectTechnologyDescendants', () => {
  it('returns the root first, then its closure in breadth-first order', () => {
    const slims = [
      slim('a', { pathTargets: ['b', 'c'] }),
      slim('b', { pathTargets: ['d'] }),
      slim('c'),
      slim('d'),
      slim('unrelated'),
    ];

    expect(collectTechnologyDescendants(slims, 'a')).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('returns the root alone for a leaf', () => {
    expect(collectTechnologyDescendants([slim('leaf')], 'leaf')).toEqual([
      'leaf',
    ]);
  });

  // THE Q94 REGRESSION GUARD. `path.leads_to_tech` points at a successor,
  // `dependencies` at a prerequisite. Following both would delete what the target
  // NEEDS — the bug this assertion exists to catch.
  it('follows path successors and leaves dependencies prerequisites alone', () => {
    const slims = [
      slim('a', { dependencyTargets: ['engine'], pathTargets: ['b'] }),
      slim('b'),
      slim('engine'),
    ];

    expect(collectTechnologyDescendants(slims, 'a')).toEqual(['a', 'b']);
  });

  it('never reaches a technology only a dependencies edge points at', () => {
    const slims = [
      slim('a', { dependencyTargets: ['engine'] }),
      slim('engine'),
    ];

    expect(collectTechnologyDescendants(slims, 'a')).toEqual(['a']);
  });

  it('stops at the folder boundary', () => {
    const slims = [
      slim('a', { pathTargets: ['b', 'elsewhere'] }),
      slim('b'),
      slim('elsewhere', { folderName: 'electronics_folder' }),
    ];

    expect(collectTechnologyDescendants(slims, 'a')).toEqual(['a', 'b']);
  });

  it('ignores a reference no source defines', () => {
    const slims = [slim('a', { pathTargets: ['ghost'] })];

    expect(collectTechnologyDescendants(slims, 'a')).toEqual(['a']);
  });

  it('terminates on a cycle', () => {
    const slims = [
      slim('a', { pathTargets: ['b'] }),
      slim('b', { pathTargets: ['a'] }),
    ];

    expect(collectTechnologyDescendants(slims, 'a')).toEqual(['a', 'b']);
  });

  it('returns nothing for an unknown root', () => {
    expect(collectTechnologyDescendants([slim('a')], 'missing')).toEqual([]);
  });
});

describe('collectTechnologyInboundReferences', () => {
  it('reports referrers outside the set with the deleted tokens they name', () => {
    const slims = [
      slim('deleted'),
      slim('by_path', { pathTargets: ['deleted'] }),
      slim('by_dependency', { dependencyTargets: ['deleted'] }),
      slim('unrelated'),
    ];

    expect(
      collectTechnologyInboundReferences(slims, new Set(['deleted'])),
    ).toEqual([
      { referencedTokens: ['deleted'], token: 'by_dependency' },
      { referencedTokens: ['deleted'], token: 'by_path' },
    ]);
  });

  it('crosses folders — a referrer anywhere in the workspace counts', () => {
    const slims = [
      slim('deleted'),
      slim('other_folder', {
        folderName: 'electronics_folder',
        pathTargets: ['deleted'],
      }),
    ];

    expect(
      collectTechnologyInboundReferences(slims, new Set(['deleted'])),
    ).toHaveLength(1);
  });

  it('never reports a referrer that is itself deleted', () => {
    const slims = [slim('a', { pathTargets: ['b'] }), slim('b')];

    expect(
      collectTechnologyInboundReferences(slims, new Set(['a', 'b'])),
    ).toEqual([]);
  });

  it('deduplicates a referrer that names the same deleted token twice', () => {
    const slims = [
      slim('deleted'),
      slim('twice', {
        dependencyTargets: ['deleted'],
        pathTargets: ['deleted'],
      }),
    ];

    expect(
      collectTechnologyInboundReferences(slims, new Set(['deleted'])),
    ).toEqual([{ referencedTokens: ['deleted'], token: 'twice' }]);
  });
});
