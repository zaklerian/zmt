import { TestBed } from '@angular/core/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import type { TechTreeEdge, TechTreeNodeView } from '../util';

import { TechTreeCanvasComponent } from './tech-tree-canvas.component';

const FIGHTER: TechTreeNodeView = {
  categories: [],
  dimmed: false,
  highlighted: false,
  id: 'fighter1',
  kind: 'simple',
  name: 'Interwar Fighter',
  position: { x: 10, y: 20 },
  selected: false,
  token: 'fighter1',
};

const FIGHTER2: TechTreeNodeView = {
  ...FIGHTER,
  id: 'fighter2',
  kind: 'wide',
  name: null,
  position: { x: 10, y: 120 },
  selected: true,
  token: 'fighter2',
};

const EDGES: readonly TechTreeEdge[] = [
  { id: 'p', kind: 'path', source: 'fighter1', target: 'fighter2' },
  { id: 'missing', kind: 'dependency', source: 'fighter2', target: 'nowhere' },
];

describe('TechTreeCanvasComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(TechTreeCanvasComponent);
    fixture.componentRef.setInput('edges', EDGES);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('nodes', [FIGHTER, FIGHTER2]);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host };
  }

  it('draws a node per view and only the edges whose ends are on the canvas', async () => {
    const { host } = await setup();
    expect(host.querySelector('svg')?.getAttribute('aria-label')).toBe(EN_MESSAGES.techTree.canvas);
    const nodes = [...host.querySelectorAll('.node')];
    expect(nodes.map((node) => node.getAttribute('aria-label'))).toEqual([
      'Interwar Fighter',
      'fighter2',
    ]);
    expect(nodes[1]?.classList.contains('selected')).toBe(true);
    expect(nodes[1]?.querySelector('rect')?.getAttribute('width')).toBe('160');
    expect(host.querySelectorAll('.edge')).toHaveLength(1);
  });

  it('emits selection, open and both context menu requests', async () => {
    const { fixture, host } = await setup();
    const events = vi.fn<(event: unknown) => void>();
    fixture.componentInstance.selectNode.subscribe((id) => {
      events(['select', id]);
    });
    fixture.componentInstance.openNode.subscribe((id) => {
      events(['open', id]);
    });
    fixture.componentInstance.nodeContextMenu.subscribe((request) => {
      events(['menu', request]);
    });
    fixture.componentInstance.paneContextMenu.subscribe((point) => {
      events(['pane', point]);
    });

    const [node] = host.querySelectorAll('.node');
    node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    node?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    node?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 5, clientY: 6 }));
    node?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    const svg = host.querySelector('svg');
    svg?.dispatchEvent(new MouseEvent('click'));
    svg?.dispatchEvent(new MouseEvent('contextmenu', { clientX: 7, clientY: 8 }));
    svg?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(events.mock.calls.map(([event]) => event)).toEqual([
      ['select', 'fighter1'],
      ['open', 'fighter1'],
      ['menu', { anchor: { x: 5, y: 6 }, id: 'fighter1' }],
      ['open', 'fighter1'],
      ['select', null],
      ['pane', { x: 7, y: 8 }],
      ['select', null],
    ]);
  });
});
