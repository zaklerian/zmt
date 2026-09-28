import { TECH_EDGE_KINDS, TECH_NODE_KINDS, TECHNOLOGY_DELETE_MODES } from './tech-tree.model';

describe('tech tree closed sets', () => {
  it('names the node kinds, edge kinds and delete modes', () => {
    expect(Object.values(TECH_NODE_KINDS)).toEqual(['simple', 'sub', 'wide']);
    expect(Object.values(TECH_EDGE_KINDS)).toEqual(['dependency', 'path']);
    expect(Object.values(TECHNOLOGY_DELETE_MODES)).toEqual(['item', 'tree']);
  });
});
