import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractTechnologies } from './extract-technologies.util';

// The ADR 022 regression gate, item 4: a technology whose position coordinates
// are written as `@`-substitution constants extracts to the RESOLVED literals,
// each carrying its symbolic origin — never the sigil-stripped incidental name.
const SOURCE = [
  '@FTR_START = -5',
  '@1933 = 100',
  'technologies = {',
  '\tinfantry = {',
  '\t\tfolder = {',
  '\t\t\tposition = { x = @FTR_START y = @1933 }',
  '\t\t}',
  '\t}',
  '}',
  '',
].join('\n');

describe('extractTechnologies — @ substitution constants (ADR 022 gate 4)', () => {
  it('resolves symbolic position coordinates and records the symbol name', () => {
    const script = parse(SOURCE);
    expect(script.errors).toEqual([]);

    const [technology] = extractTechnologies(script);
    expect(technology.token).toBe('infantry');

    const position = technology.folders[0].position;
    const x = position.find((field) => field.key === 'x');
    const y = position.find((field) => field.key === 'y');

    expect(x).toEqual({
      key: 'x',
      symbol: { name: 'FTR_START' },
      value: '-5',
    });
    expect(y).toEqual({
      key: 'y',
      symbol: { name: '1933' },
      value: '100',
    });
  });

  it('never projects a definition as a field from a FIXED-allow-list reader, even on a key collision (gate 7)', () => {
    // `@x = 99` is a definition whose name collides with the modeled position key
    // `x`. A fixed-allow-list reader that skipped definitions only "by
    // construction" (symbol names never matching a modeled key) would project the
    // definition's 99 over the real coordinate; the node-kind skip prevents it.
    const source = [
      'technologies = {',
      '\tinfantry = {',
      '\t\tfolder = {',
      '\t\t\tposition = { @x = 99 x = 3 y = 7 }',
      '\t\t}',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [technology] = extractTechnologies(parse(source));
    const position = technology.folders[0].position;
    const x = position.find((field) => field.key === 'x');

    // The real coordinate, not the definition's 99.
    expect(x).toEqual({ key: 'x', value: '3' });
    expect(x?.symbol).toBeUndefined();
  });

  it('leaves a plain literal coordinate free of any symbol', () => {
    const source = [
      'technologies = {',
      '\tinfantry = {',
      '\t\tfolder = {',
      '\t\t\tposition = { x = 3 y = 7 }',
      '\t\t}',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [technology] = extractTechnologies(parse(source));
    const x = technology.folders[0].position.find((field) => field.key === 'x');

    expect(x).toEqual({ key: 'x', value: '3' });
    expect(x?.symbol).toBeUndefined();
  });
});

// ZMT-E28: technology read-correctness. `path` (drawn/OR) and `dependencies`
// (undrawn/AND) are distinct edge kinds; `sub_technologies` is a parent-attached
// node kind; repeated same-named ref-list blocks are additive (not first-wins);
// `XOR` matches case-insensitively; `path.ignore_for_layout` is a modeled scalar.
// Fixtures mirror real BICE shapes (`common/technologies/*`).
describe('extractTechnologies — ZMT-E28 edge kinds, sub-techs, repeated ref-lists', () => {
  it('reads the { tech = 1 } dependency form as edge targets (survey #19 drop)', () => {
    // Real shape: MTG_naval.txt `early_ship_hull_carrier` — an AND prerequisite
    // written as `{ <tech> = 1 }`, dropped today because tokenOf reads bare only.
    const source = [
      'technologies = {',
      '\tearly_ship_hull_carrier = {',
      '\t\tdependencies = {',
      '\t\t\tport_infra2 = 1',
      '\t\t\tsub_industry3 = 1',
      '\t\t}',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [tech] = extractTechnologies(parse(source));
    expect(tech.dependencies).toEqual(['port_infra2', 'sub_industry3']);
  });

  it('reads every repeated dependencies sibling block, not the first', () => {
    // Real shape: ENG_air.txt `mountain_warfare` carries `dependencies` ×2.
    const source = [
      'technologies = {',
      '\tmountain_warfare = {',
      '\t\tdependencies = { first_dep = 1 }',
      '\t\tdependencies = { second_dep = 1 third_dep = 1 }',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [tech] = extractTechnologies(parse(source));
    expect(tech.dependencies).toEqual(['first_dep', 'second_dep', 'third_dep']);
  });

  it('reads both bare-token and { tech = 1 } dependency forms across blocks', () => {
    const source = [
      'technologies = {',
      '\tt = {',
      '\t\tdependencies = { bare_dep }',
      '\t\tdependencies = { keyed_dep = 1 }',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [tech] = extractTechnologies(parse(source));
    expect(tech.dependencies).toEqual(['bare_dep', 'keyed_dep']);
  });

  it('reads every repeated enable_equipments block, not the first', () => {
    // Real shape: ENG_air.txt `mountain_warfare` carries `enable_equipments` ×2
    // (BICE reaches ×6 elsewhere).
    const source = [
      'technologies = {',
      '\tmountain_warfare = {',
      '\t\tenable_equipments = { equip_a }',
      '\t\tenable_equipments = { equip_b }',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [tech] = extractTechnologies(parse(source));
    expect(tech.enableEquipments).toEqual(['equip_a', 'equip_b']);
  });

  it('attaches sub_technologies to the parent node as a token list', () => {
    // Real shape: air_techs.txt `fighter1` attaches `cv_fighter1` (no folder).
    const source = [
      'technologies = {',
      '\tfighter1 = {',
      '\t\tsub_technologies = {',
      '\t\t\tcv_fighter1',
      '\t\t}',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [tech] = extractTechnologies(parse(source));
    expect(tech.token).toBe('fighter1');
    expect(tech.subTechnologies).toEqual(['cv_fighter1']);
  });

  it('matches uppercase XOR case-insensitively', () => {
    // Real shape: industry.txt:1303 `XOR = { concentrated_industry }`.
    const source = [
      'technologies = {',
      '\tt = {',
      '\t\tXOR = { concentrated_industry }',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [tech] = extractTechnologies(parse(source));
    expect(tech.xor).toEqual(['concentrated_industry']);
  });

  it('models path.ignore_for_layout on the path block', () => {
    // Real shape: MTG_naval.txt:2684 `ignore_for_layout = yes` inside a `path`.
    const source = [
      'technologies = {',
      '\tt = {',
      '\t\tpath = {',
      '\t\t\tleads_to_tech = t2',
      '\t\t\tignore_for_layout = yes',
      '\t\t}',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [tech] = extractTechnologies(parse(source));
    const ignore = tech.paths[0].scalars.find(
      (field) => field.key === 'ignore_for_layout',
    );
    expect(ignore).toEqual({ key: 'ignore_for_layout', value: 'yes' });
  });

  it('distinguishes path (drawn/OR) from dependencies (undrawn/AND) as edge kinds', () => {
    const source = [
      'technologies = {',
      '\tt = {',
      '\t\tpath = { leads_to_tech = drawn_target }',
      '\t\tdependencies = { and_target = 1 }',
      '\t}',
      '}',
      '',
    ].join('\n');
    const [tech] = extractTechnologies(parse(source));
    const leads = tech.paths[0].scalars.find(
      (field) => field.key === 'leads_to_tech',
    );
    expect(leads?.value).toBe('drawn_target');
    expect(tech.dependencies).toEqual(['and_target']);
  });
});
