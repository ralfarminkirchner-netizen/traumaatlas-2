import type { AtlasGeometryGraph } from './atlas-geometry.mjs';
export interface AtlasSpaceController {
  setGraph(graph: AtlasGeometryGraph): void;
  setSelected(id: string | null): void;
  setVisibleTypes(types: string[] | null): void;
  resetView(): void;
  destroy(): void;
}
export function mountAtlasSpace(host: HTMLElement, options: { graph: AtlasGeometryGraph; onSelect?: (id: string) => void; selectedId?: string | null; visibleTypes?: string[] | null }): AtlasSpaceController;
export function projectGraph(graph: AtlasGeometryGraph, positions: Record<string,{x:number;y:number;z:number}>, options?: Record<string,unknown>): unknown;
export function frameSVG(graph: AtlasGeometryGraph, positions: Record<string,{x:number;y:number;z:number}>, options?: Record<string,unknown>): string;
