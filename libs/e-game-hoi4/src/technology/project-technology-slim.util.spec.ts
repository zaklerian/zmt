import type { TechnologyEntity } from '@contracts';

import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractTechnologies } from './extract-technologies.util';
import { projectTechnologySlim } from './project-technology-slim.util';

function techFrom(body: string): TechnologyEntity {
  const [entity] = extractTechnologies(parse(`technologies = {\n${body}\n}\n`));
  if (entity === undefined) {
    throw new Error('fixture produced no technology');
  }
  return entity;
}

describe('projectTechnologySlim', () => {
  it('derives nodeKind "wide" for a positioned tech that declares enable_equipments', () => {
    const slim = projectTechnologySlim(
      techFrom(
        [
          '\twing = {',
          '\t\tenable_equipments = { small_plane_airframe }',
          '\t\tfolder = { name = air_techs position = { x = 2 y = 4 } }',
          '\t}',
        ].join('\n'),
      ),
    );

    expect(slim.nodeKind).toBe('wide');
    expect(slim.position).toEqual({ x: 2, y: 4 });
  });

  it('derives nodeKind "simple" for a positioned tech with no enable_equipments', () => {
    const slim = projectTechnologySlim(
      techFrom('\tradar = { folder = { position = { x = 1 y = 1 } } }'),
    );

    expect(slim.nodeKind).toBe('simple');
    expect(slim.position).toEqual({ x: 1, y: 1 });
  });

  it('derives nodeKind "sub" by signal — a tech with no own position — and reports a null position', () => {
    const slim = projectTechnologySlim(techFrom('\tsub_wing = { }'));

    expect(slim.nodeKind).toBe('sub');
    expect(slim.position).toBeNull();
  });

  it('resolves @-substitution coordinates to numbers (symbol model already lowered them)', () => {
    const [entity] = extractTechnologies(
      parse(
        [
          '@FTR_START = -5',
          '@1933 = 100',
          'technologies = {',
          '\tinfantry = { folder = { position = { x = @FTR_START y = @1933 } } }',
          '}',
          '',
        ].join('\n'),
      ),
    );

    expect(projectTechnologySlim(entity).position).toEqual({ x: -5, y: 100 });
  });

  it('keeps pathTargets (drawn OR-edges) and dependencyTargets (undrawn AND-edges) as distinct lists', () => {
    const slim = projectTechnologySlim(
      techFrom(
        [
          '\tfighter2 = {',
          '\t\tfolder = { position = { x = 0 y = 0 } }',
          '\t\tpath = { leads_to_tech = fighter3 }',
          '\t\tpath = { leads_to_tech = heavy_fighter2 }',
          '\t\tdependencies = { fire_control_system_0 engine_2 }',
          '\t}',
        ].join('\n'),
      ),
    );

    expect(slim.pathTargets).toEqual(['fighter3', 'heavy_fighter2']);
    expect(slim.dependencyTargets).toEqual([
      'fire_control_system_0',
      'engine_2',
    ]);
  });

  it('carries startYear distinct from position.y, and categories', () => {
    const slim = projectTechnologySlim(
      techFrom(
        [
          '\tjet_engine = {',
          '\t\tstart_year = 1944',
          '\t\tcategories = { air_equipment cat_engines }',
          '\t\tfolder = { position = { x = 3 y = 7 } }',
          '\t}',
        ].join('\n'),
      ),
    );

    expect(slim.startYear).toBe(1944);
    expect(slim.position?.y).toBe(7);
    expect(slim.categories).toEqual(['air_equipment', 'cat_engines']);
  });

  it('carries the folder name (the discriminator the canvas filters by) and sub-technologies', () => {
    const slim = projectTechnologySlim(
      techFrom(
        [
          '\tearly_fighter = {',
          '\t\tfolder = { name = air_techs_folder position = { x = 5 y = 2 } }',
          '\t\tsub_technologies = { cv_early_fighter }',
          '\t}',
        ].join('\n'),
      ),
    );

    expect(slim.folderName).toBe('air_techs_folder');
    expect(slim.subTechnologies).toEqual(['cv_early_fighter']);
  });

  it('reports a null folderName for a sub-tech that declares no folder rather than inventing one', () => {
    const slim = projectTechnologySlim(techFrom('\tcv_early_fighter = { }'));

    expect(slim.folderName).toBeNull();
    expect(slim.subTechnologies).toEqual([]);
  });

  it('reports a null position when a coordinate is not a finite number rather than inventing one', () => {
    const slim = projectTechnologySlim(
      techFrom(
        '\tbroken = { folder = { position = { x = @UNRESOLVED y = 2 } } }',
      ),
    );

    expect(slim.position).toBeNull();
    expect(slim.nodeKind).toBe('sub');
  });
});
