import { CONTENT_KINDS, VIEW_MODES } from './view-mode.const';

describe('mod content closed sets', () => {
  it('names the view modes and content kinds', () => {
    expect(Object.values(VIEW_MODES)).toEqual(['code', 'table']);
    expect(Object.values(CONTENT_KINDS)).toEqual(['descriptor', 'editor', 'placeholder']);
  });
});
