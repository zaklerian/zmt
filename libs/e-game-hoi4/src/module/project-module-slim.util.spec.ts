import type { ModuleEntity } from '@contracts';

import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { extractModules } from './extract-modules.util';
import { projectModuleSlim } from './project-module-slim.util';

function moduleFrom(source: string): ModuleEntity {
  const [entity] = extractModules(parse(source));
  if (entity === undefined) {
    throw new Error('fixture produced no module');
  }
  return entity;
}

describe('projectModuleSlim', () => {
  it('projects id (the name token), name, and the single category', () => {
    const slim = projectModuleSlim(
      moduleFrom(
        'equipment_modules = { engine_small_1 = { category = engine } }',
      ),
    );

    expect(slim).toEqual({
      category: 'engine',
      id: 'engine_small_1',
      name: 'engine_small_1',
    });
  });

  it('carries an empty category string when the source omits it, never a fabricated default', () => {
    const slim = projectModuleSlim(
      moduleFrom('equipment_modules = { widget = { } }'),
    );

    expect(slim.category).toBe('');
    expect(slim.id).toBe('widget');
  });
});
