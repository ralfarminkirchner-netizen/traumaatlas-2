/**
 * Presentation geometry over the original Atlas or an exported Ocean instance.
 * This module never creates semantic vertices, semantic edges, or triangle faces.
 * A shape is a position map beside the source graph, not a replacement graph.
 */

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const percentage = value => clamp(finite(value) ? value : 0, 0, 100) / 100;
const endpointId = value => typeof value === 'string' && value.length > 0;

export function inspectGraphIntegrity(graph) {
  const errors = [], missingEndpoints = [], duplicateNodeIds = [], duplicateEdgeIds = [];
  if (!record(graph) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return { valid: false, errors: ['Der Graph benötigt die Originalknoten und Originalkanten als Listen.'], missingEndpoints, duplicateNodeIds, duplicateEdgeIds, nodeCount: 0, edgeCount: 0 };
  }
  const nodeIds = new Set(), edgeIds = new Set();
  for (let index = 0; index < graph.nodes.length; index++) {
    const node = graph.nodes[index];
    if (!record(node) || !endpointId(node.id)) {
      errors.push(`Knoten ${index} besitzt keine gültige Original-ID.`);
      continue;
    }
    if (nodeIds.has(node.id)) duplicateNodeIds.push(node.id);
    nodeIds.add(node.id);
  }
  for (let index = 0; index < graph.edges.length; index++) {
    const edge = graph.edges[index];
    if (!record(edge) || !endpointId(edge.id) || !endpointId(edge.from) || !endpointId(edge.to)) {
      errors.push(`Kante ${index} besitzt keine vollständige ID und Endpunkte.`);
      continue;
    }
    if (edgeIds.has(edge.id)) duplicateEdgeIds.push(edge.id);
    edgeIds.add(edge.id);
    const missingIds = [edge.from, edge.to].filter(id => !nodeIds.has(id));
    if (missingIds.length) missingEndpoints.push({ edgeId: edge.id, from: edge.from, to: edge.to, missingIds });
  }
  if (duplicateNodeIds.length) errors.push(`${duplicateNodeIds.length} Knoten-IDs sind mehrfach vorhanden.`);
  if (duplicateEdgeIds.length) errors.push(`${duplicateEdgeIds.length} Kanten-IDs sind mehrfach vorhanden.`);
  if (missingEndpoints.length) errors.push(`${missingEndpoints.length} Originalkanten verweisen auf fehlende Endpunkte.`);
  return { valid: errors.length === 0, errors, missingEndpoints, duplicateNodeIds, duplicateEdgeIds, nodeCount: graph.nodes.length, edgeCount: graph.edges.length };
}

function assertGraph(graph) {
  const report = inspectGraphIntegrity(graph);
  if (!report.valid) {
    const error = new TypeError(report.errors.join(' '));
    error.name = 'GraphIntegrityError';
    error.report = report;
    throw error;
  }
  return report;
}

/** A stable identity check; deliberately excludes geometry and display settings. */
export function graphIdentitySignature(graph) {
  assertGraph(graph);
  const byId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  return JSON.stringify({
    nodes: graph.nodes.map(({ id, type, label }) => ({ id, type, label })).sort(byId),
    edges: graph.edges.map(({ id, from, to, type }) => ({ id, from, to, type })).sort(byId),
  });
}

/** Type groups refer only to actual source types; unknown types are retained. */
export function groupsForGraph(graph) {
  assertGraph(graph);
  const groups = new Map();
  const presentTypes = new Set(graph.nodes.map(node => node.type));
  for (const type of Object.keys(graph.nodeTypeMeta ?? {})) if (presentTypes.has(type)) groups.set(type, []);
  for (const node of graph.nodes) {
    if (!groups.has(node.type)) groups.set(node.type, []);
    groups.get(node.type).push(node);
  }
  return [...groups.entries()].map(([type, nodes]) => ({ type, nodes, nodeIds: nodes.map(node => node.id), metadata: graph.nodeTypeMeta?.[type] ?? null }));
}
export const vertexGroups = groupsForGraph;

function localHex(index) {
  if (index === 0) return { x: 0, y: 0 };
  let ring = 1;
  while (index > 3 * ring * (ring + 1)) ring++;
  let remainder = index - (1 + 3 * ring * (ring - 1));
  let q = ring, r = 0;
  const directions = [[-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0], [0, 1]];
  for (const [dq, dr] of directions) {
    const steps = Math.min(ring, remainder);
    q += dq * steps;
    r += dr * steps;
    remainder -= steps;
    if (remainder === 0) break;
  }
  return { x: q + r / 2, y: r * Math.sqrt(3) / 2 };
}

function hashPhase(id) {
  let hash = 2166136261;
  for (const character of id) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) / 4294967296 * TAU;
}
const normalizeVector = vector => {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
};
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

function oceanConstellation(graph) {
  if (graph.source?.kind !== 'ocean-instance' || !graph.nodes.length || !graph.nodes.every(node => finite(node.x) && finite(node.y))) return null;
  const xs = graph.nodes.map(node => node.x), ys = graph.nodes.map(node => node.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
  const commonScale = 24 / Math.max(maxX - minX, maxY - minY, 1);
  return Object.fromEntries(graph.nodes.map(node => [node.id, { x: (node.x - centerX) * commonScale, y: -(node.y - centerY) * commonScale, z: 0 }]));
}

function shapePositions(graph, shape) {
  if (!['constellation', 'sphere', 'wall', 'knot'].includes(shape)) throw new RangeError(`Unbekannte Darstellungsform: ${shape}`);
  if (shape === 'constellation') {
    const existing = oceanConstellation(graph);
    if (existing) return existing;
  }
  const groups = groupsForGraph(graph), count = graph.nodes.length;
  const groupById = new Map();
  groups.forEach((group, groupIndex) => group.nodes.forEach((node, localIndex) => groupById.set(node.id, { groupIndex, localIndex, localCount: group.nodes.length })));
  return Object.fromEntries(graph.nodes.map((node, index) => {
    const { groupIndex, localIndex, localCount } = groupById.get(node.id);
    const phase = groupIndex / Math.max(1, groups.length) * TAU;
    const local = localHex(localIndex);
    let point;
    if (shape === 'constellation') {
      const ringRadius = groups.length > 1 ? 11 : 0;
      point = { x: Math.cos(phase) * ringRadius + local.x * 1.25, y: Math.sin(phase) * ringRadius + local.y * 1.25, z: Math.sin(phase * 2) * 1.5 + (localIndex % 3 - 1) * .35 };
    } else if (shape === 'sphere') {
      // Actual source vertices, evenly distributed on a shell; no fake pole nodes.
      const y = 1 - 2 * (index + .5) / Math.max(1, count);
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const longitude = index * GOLDEN_ANGLE;
      point = { x: Math.cos(longitude) * radius * 12, y: y * 12, z: Math.sin(longitude) * radius * 12 };
    } else if (shape === 'wall') {
      // Display packing of existing vertices into type bands, then a 90° fold.
      const fraction = (groupIndex + (localIndex + .5) / Math.max(1, localCount)) / Math.max(1, groups.length);
      const sheetX = (fraction - .5) * 28;
      const sheetY = local.y * 2.1 - (Math.sqrt(localCount) - 1) * .3;
      point = { x: sheetX <= 0 ? sheetX : 0, y: sheetY, z: sheetX <= 0 ? 0 : sheetX };
    } else {
      // Trefoil centerline plus a tube offset, using the original type groups.
      const t = (groupIndex + (localIndex + .5) / Math.max(1, localCount)) / Math.max(1, groups.length) * (TAU - .035);
      const c2 = Math.cos(2 * t), s2 = Math.sin(2 * t), c3 = Math.cos(3 * t), s3 = Math.sin(3 * t);
      const center = { x: (2 + c3) * c2 * 3.8, y: (2 + c3) * s2 * 3.8, z: s3 * 3.8 };
      const tangent = normalizeVector({ x: -3 * s3 * c2 - 2 * (2 + c3) * s2, y: -3 * s3 * s2 + 2 * (2 + c3) * c2, z: 3 * c3 });
      const normal = normalizeVector(cross(tangent, Math.abs(tangent.z) > .9 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 }));
      const binormal = normalizeVector(cross(tangent, normal));
      const rotation = localIndex * GOLDEN_ANGLE + phase;
      const tubeRadius = 1.15;
      point = Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, center[axis] + (normal[axis] * Math.cos(rotation) + binormal[axis] * Math.sin(rotation)) * tubeRadius]));
    }
    return [node.id, point];
  }));
}

/** All positions are keyed by unchanged original IDs; elastic changes remain views. */
export function positionsForGraph(graph, shape, { deform = 0, twist = 0, overrides = {} } = {}) {
  assertGraph(graph);
  if (!record(overrides)) throw new TypeError('Positionsänderungen müssen nach Original-ID zugeordnet sein.');
  const base = shapePositions(graph, shape), amount = percentage(deform), winding = percentage(twist);
  return Object.fromEntries(graph.nodes.map(node => {
    const phase = hashPhase(node.id), p = base[node.id];
    const stretched = {
      x: p.x * (1 + amount * .35 * Math.sin(p.y * .12 + phase)),
      y: p.y + amount * 3.8 * Math.sin(p.x * .19 + phase),
      z: p.z + amount * 3.6 * Math.sin(p.x * .13 + p.y * .17 + phase),
    };
    const turn = winding * TAU * (stretched.y / 18 + .5);
    const position = { x: stretched.x * Math.cos(turn) - stretched.z * Math.sin(turn), y: stretched.y, z: stretched.x * Math.sin(turn) + stretched.z * Math.cos(turn) };
    if (own(overrides, node.id)) {
      const override = overrides[node.id];
      if (!record(override) || ['x', 'y', 'z'].some(axis => own(override, axis) && !finite(override[axis]))) throw new TypeError(`Die Positionsänderung für ${node.id} ist nicht endlich.`);
      for (const axis of ['x', 'y', 'z']) if (own(override, axis)) position[axis] = override[axis];
    }
    return [node.id, position];
  }));
}

export function interpolatePositions(from, to, t) {
  if (!record(from) || !record(to)) throw new TypeError('Beide Positionstabellen werden benötigt.');
  const ids = Object.keys(from);
  if (ids.length !== Object.keys(to).length || ids.some(id => !own(to, id))) throw new TypeError('Die Formen enthalten unterschiedliche Original-IDs.');
  const factor = clamp(finite(t) ? t : 0, 0, 1);
  return Object.fromEntries(ids.map(id => {
    if (['x', 'y', 'z'].some(axis => !finite(from[id]?.[axis]) || !finite(to[id]?.[axis]))) throw new TypeError(`Die Position für ${id} ist nicht endlich.`);
    return [id, Object.fromEntries(['x', 'y', 'z'].map(axis => [axis, from[id][axis] + (to[id][axis] - from[id][axis]) * factor]))];
  }));
}

export function incidentEdges(graph, id) {
  assertGraph(graph);
  return graph.edges.filter(edge => edge.from === id || edge.to === id);
}

/** Directions are source directions. Ocean arms are explicitly undirected. */
export function neighborsFromGraph(graph, id) {
  assertGraph(graph);
  const incoming = [], outgoing = [], undirected = [];
  for (const edge of graph.edges) {
    if (edge.from === id) {
      const neighbor = { nodeId: edge.to, edge };
      undirected.push(neighbor);
      if (edge.directed !== false) outgoing.push(neighbor);
    }
    if (edge.to === id && edge.from !== id) {
      const neighbor = { nodeId: edge.from, edge };
      undirected.push(neighbor);
      if (edge.directed !== false) incoming.push(neighbor);
    }
  }
  return { incoming, outgoing, undirected };
}

export function shortestPath(graph, startId, goalId, { directed = false } = {}) {
  assertGraph(graph);
  const ids = new Set(graph.nodes.map(node => node.id));
  if (!ids.has(startId) || !ids.has(goalId)) return null;
  if (startId === goalId) return [startId];
  const adjacency = new Map([...ids].map(id => [id, []]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from).push(edge.to);
    if (!directed || edge.directed === false) adjacency.get(edge.to).push(edge.from);
  }
  const previous = new Map([[startId, null]]), queue = [startId];
  for (let index = 0; index < queue.length; index++) {
    for (const nextId of adjacency.get(queue[index])) {
      if (previous.has(nextId)) continue;
      previous.set(nextId, queue[index]);
      if (nextId === goalId) {
        const path = [];
        for (let id = goalId; id !== null; id = previous.get(id)) path.push(id);
        return path.reverse();
      }
      queue.push(nextId);
    }
  }
  return null;
}

/**
 * Adapter for an actual exported OceanState. Proposed links and generated
 * confirmations remain exactly as stored; no confirmation origin is inferred.
 */
export function normalizeOceanGraph(oceanState) {
  if (!record(oceanState) || !Array.isArray(oceanState.phenomena) || !Array.isArray(oceanState.arms)) throw new TypeError('Der Import benötigt einen OceanState mit phenomena und arms.');
  const nodes = oceanState.phenomena.map(node => record(node) ? { ...node, type: own(node, 'type') ? node.type : 'phenomenon' } : node);
  const edges = oceanState.arms.map((arm, index) => {
    if (!record(arm)) return arm;
    const pair = [arm.a, arm.b];
    if (pair.every(endpointId)) pair.sort();
    return {
      ...arm,
      id: `ocean-arm:${JSON.stringify(pair)}`,
      idOrigin: 'adapter-from-original-undirected-pair',
      from: arm.a, to: arm.b, type: 'arm', directed: false,
      label: arm.reason,
      sourceArmIndex: index,
    };
  });
  const graph = {
    source: { kind: 'ocean-instance', revision: 'local-runtime', originalFormat: 'OceanState', semantics: 'source-data-not-independently-validated', armIdOrigin: 'adapter-from-original-undirected-pair' },
    nodes, edges,
    nodeTypeMeta: { phenomenon: { label: 'Phänomene der geladenen Instanz' } },
  };
  const integrityReport = inspectGraphIntegrity(graph);
  graph.integrity = integrityReport;
  graph.integrityReport = integrityReport;
  return graph;
}
