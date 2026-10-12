export interface AtlasGeometryNode { id: string; label: string; type: string; summary?: string; sub?: string; color?: string; x?: number; y?: number; user?: boolean; }
export interface AtlasGeometryEdge { id: string; from: string; to: string; type: string; directed?: boolean; strength?: number; growth?: number; latched?: boolean; reason?: string; }
export interface AtlasGeometryGraph { source?: {kind: string; label?: string; repository?: string; commit?: string; revision?: string}; nodes: AtlasGeometryNode[]; edges: AtlasGeometryEdge[]; nodeTypeMeta?: Record<string,{label: string; color: string}>; edgeTypeLabels?: Record<string,string>; }
export type AtlasGraphPosition = {x: number; y: number; z: number};
export function normalizeOceanGraph(state: unknown): AtlasGeometryGraph;
export function positionsForGraph(graph: AtlasGeometryGraph, shape: string, options?: {deform?: number; twist?: number; overrides?: Record<string,AtlasGraphPosition>}): Record<string,AtlasGraphPosition>;
export function inspectGraphIntegrity(graph: unknown): {valid: boolean; errors: string[]; missingEndpoints: unknown[]; nodeCount: number; edgeCount: number};
export function graphIdentitySignature(graph: AtlasGeometryGraph): string;
export function incidentEdges(graph: AtlasGeometryGraph,id: string | null): AtlasGeometryEdge[];
export function shortestPath(graph: AtlasGeometryGraph,start: string | null,end: string | null,options?: {directed?: boolean}): string[] | null;
