import { Component, computed, inject, input, output } from '@angular/core';
import { MESSAGES } from '@zmt/renderer/shell/ui';

import type { TechTreeEdge, TechTreeNodeView, TechTreePoint } from '../util';

export interface CanvasNodeMenuRequest {
  readonly anchor: TechTreePoint;
  readonly id: string;
}

export interface EdgeLine extends TechTreeEdge {
  readonly from: TechTreePoint;
  readonly to: TechTreePoint;
}

const NODE_WIDTH = { simple: 120, sub: 80, wide: 160 } as const;

@Component({
  selector: 'zmt-tech-tree-canvas',
  styleUrl: './tech-tree-canvas.component.scss',
  templateUrl: './tech-tree-canvas.component.html',
})
export class TechTreeCanvasComponent {
  readonly edges = input.required<readonly TechTreeEdge[]>();
  protected readonly messages = inject(MESSAGES);
  readonly nodeContextMenu = output<CanvasNodeMenuRequest>();
  readonly nodes = input.required<readonly TechTreeNodeView[]>();
  readonly openNode = output<string>();
  readonly paneContextMenu = output<TechTreePoint>();
  readonly selectNode = output<null | string>();

  protected readonly edgeLines = computed<readonly EdgeLine[]>(() => {
    const positions = new Map(this.nodes().map((node) => [node.id, node.position]));
    return this.edges().flatMap((edge) => {
      const from = positions.get(edge.source);
      const to = positions.get(edge.target);
      return from && to ? [{ ...edge, from, to }] : [];
    });
  });

  protected onNodeClick(event: Event, id: string): void {
    event.stopPropagation();
    this.selectNode.emit(id);
  }

  protected onNodeContextMenu(event: Event, id: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.nodeContextMenu.emit({ anchor: pointOf(event), id });
  }

  protected onNodeOpen(event: Event, id: string): void {
    event.stopPropagation();
    this.openNode.emit(id);
  }

  protected onPaneContextMenu(event: Event): void {
    event.preventDefault();
    this.paneContextMenu.emit(pointOf(event));
  }

  protected translate(node: TechTreeNodeView): string {
    return `translate(${String(node.position.x)}, ${String(node.position.y)})`;
  }

  protected width(node: TechTreeNodeView): number {
    return NODE_WIDTH[node.kind];
  }
}

function pointOf(event: Event): TechTreePoint {
  return event instanceof MouseEvent ? { x: event.clientX, y: event.clientY } : { x: 0, y: 0 };
}
