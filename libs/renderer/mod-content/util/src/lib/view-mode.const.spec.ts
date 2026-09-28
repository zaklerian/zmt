import { CONTENT_KINDS, STRUCTURED_VIEWS, VIEW_MODES } from './view-mode.const';

describe('mod content closed sets', () => {
  it('names the view modes, structured views and content kinds', () => {
    expect(Object.values(VIEW_MODES)).toEqual(['code', 'table']);
    expect(Object.values(STRUCTURED_VIEWS)).toEqual(['form', 'table']);
    expect(Object.values(CONTENT_KINDS)).toEqual([
      'descriptor',
      'editor',
      'entityTable',
      'placeholder',
    ]);
  });
});
