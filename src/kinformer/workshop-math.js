/* KiNFORMER: bounded numerical observations and source-preserving form rules. */
(function (root) {
  'use strict';
  const EPS = 1e-10;
  const FEATURE_ID = 'kinformer-text-shape-features/1';
  const dimensions = Object.freeze(['Reihenfolge', 'Zeichen / 512', 'Wörter / 100', 'x / Fläche', 'y / Fläche', 'Breite / Fläche', 'Höhe / Fläche', 'Wiederholung / 12']);
  const limits = Object.freeze([
    'Der Merkmalsraum untersucht Textmenge und Anordnung, keine Bedeutung, Zustimmung oder Gestaltungsqualität.',
    'Unterraumgleichheit vergisst die einzelnen Teilvektoren und ihre Reihenfolge. Gleiche Spektren können verschiedene Beziehungen haben.',
    'Vergleiche sind an Schema, Normierung, Träger, Rang und die untersuchte Fassung gebunden.'
  ]);
  const finite = (v, fallback = 0) => v === undefined || v === null ? fallback : Number(v);
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const norm = a => Math.hypot(...a);
  const zero = n => Array.from({ length: n }, () => Array(n).fill(0));
  const identity = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Number(i === j)));
  const clone = value => JSON.parse(JSON.stringify(value));
  const text = p => String(p?.content?.text ?? '');
  const words = p => text(p).trim().split(/\s+/u).filter(Boolean).length;
  function partsCheck(parts) {
    if (!Array.isArray(parts)) throw new TypeError('Teile müssen als Liste vorliegen.');
    const ids = parts.map(p => p?.id);
    if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new TypeError('Jedes Teil benötigt eine eindeutige stabile ID.');
    return parts;
  }
  function features(parts, options = {}) {
    partsCheck(parts);
    const width = finite(options.width, 1), height = finite(options.height, 1);
    if (!(width > 0 && height > 0 && Number.isFinite(width + height))) throw new TypeError('Die gemeinsame Fläche benötigt endliche positive Maße.');
    const matrix = parts.map((p, i) => {
      const a = p.appearance || {};
      const vector = [parts.length > 1 ? i / (parts.length - 1) : 0, Array.from(text(p)).length / 512, words(p) / 100,
        finite(a.x) / width, finite(a.y) / height, finite(a.width) / width, finite(a.height) / height, finite(a.repeat, 1) / 12];
      if (!vector.every(Number.isFinite)) throw new TypeError('Ein Teil enthält nichtendliche Merkmale: ' + p.id);
      return vector;
    });
    return { schemaId: FEATURE_ID, normalizationId: `area:${width}:${height};text:512:100;repeat:12`, dimensions: [...dimensions],
      ambientDimension: dimensions.length, carrier: parts.map(p => p.id), matrix, question: 'Wie unterscheiden sich Textmenge und Anordnung unter denselben Maßeinheiten?', limits: [...limits] };
  }
  function matrixInput(value) {
    const matrix = Array.isArray(value) ? value : value?.matrix;
    if (!Array.isArray(matrix)) throw new TypeError('Eine Liste von Vektoren wird benötigt.');
    const n = matrix[0]?.length || value?.ambientDimension || 0;
    if (!Number.isInteger(n) || n < 0 || n > 64 || matrix.some(v => !Array.isArray(v) || v.length !== n || !v.every(Number.isFinite))) throw new TypeError('Vektoren müssen endliche Zahlen und dieselbe Dimension haben (höchstens 64).');
    return { matrix, n };
  }
  function projector(basis, n) {
    const p = zero(n);
    for (const q of basis) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) p[i][j] += q[i] * q[j];
    return p;
  }
  function subspace(value, options = {}) {
    const { matrix, n } = matrixInput(value), basis = [], dependent = [];
    const tolerance = finite(options.tolerance, EPS);
    if (!(tolerance > 0 && tolerance < 1)) throw new TypeError('Die Rangtoleranz muss zwischen 0 und 1 liegen.');
    for (let index = 0; index < matrix.length; index++) {
      const length = norm(matrix[index]);
      if (!(length > 0)) { dependent.push(index); continue; }
      let v = matrix[index].map(x => x / length);
      // Two modified Gram–Schmidt passes reduce cancellation in almost dependent frames.
      for (let pass = 0; pass < 2; pass++) for (const q of basis) { const c = dot(v, q); v = v.map((x, j) => x - c * q[j]); }
      const residual = norm(v);
      if (residual <= tolerance) { dependent.push(index); continue; }
      basis.push(v.map(x => x / residual));
    }
    const rank = basis.length, expectedRank = options.expectedRank;
    const valid = rank > 0 && (expectedRank === undefined || expectedRank === rank);
    return { valid, status: rank === 0 ? 'null' : !valid ? 'rank-mismatch' : dependent.length ? 'rank-deficient-frame' : 'independent-frame',
      schemaId: value?.schemaId || options.schemaId || 'explicit-real-vectors/1', normalizationId: value?.normalizationId || options.normalizationId || 'given-coordinates',
      ambientDimension: n, rank, inputCount: matrix.length, frameValid: rank === matrix.length && rank > 0,
      basis, stiefel: basis, projector: projector(basis, n), dependentIndices: dependent, tolerance,
      saturated: rank > 0 && rank === n, reason: valid ? '' : rank === 0 ? 'Nullvektoren tragen keinen nichtleeren Unterraum.' : 'Der tatsächliche Rang entspricht nicht dem verlangten Rang.' };
  }
  function jacobi(matrix, options = {}) {
    const n = matrix.length;
    if (n > 64 || matrix.some((row, i) => row.length !== n || row.some((v, j) => !Number.isFinite(v) || Math.abs(v - matrix[j]?.[i]) > 1e-8))) throw new TypeError('Jacobi benötigt eine endliche symmetrische Matrix bis 64 × 64.');
    if (!n) return { values: [], vectors: [], converged: true, residual: 0 };
    const a = matrix.map(row => [...row]), v = identity(n);
    const tolerance = finite(options.tolerance, 1e-12), scale = Math.max(1, ...a.flat().map(Math.abs));
    let residual = 0, converged = n < 2;
    const maxIterations = options.maxIterations || 100 * n * n;
    for (let iteration = 0; iteration < maxIterations && n > 1; iteration++) {
      let p = 0, q = 1; residual = Math.abs(a[p][q]);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.abs(a[i][j]) > residual) { residual = Math.abs(a[i][j]); p = i; q = j; }
      if (residual <= tolerance * scale) { converged = true; break; }
      const app = a[p][p], aqq = a[q][q], apq = a[p][q];
      const angle = .5 * Math.atan2(2 * apq, aqq - app), c = Math.cos(angle), s = Math.sin(angle);
      for (let i = 0; i < n; i++) if (i !== p && i !== q) {
        const aip = a[i][p], aiq = a[i][q]; a[i][p] = a[p][i] = c * aip - s * aiq; a[i][q] = a[q][i] = s * aip + c * aiq;
      }
      a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
      a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq; a[p][q] = a[q][p] = 0;
      for (let i = 0; i < n; i++) { const vip = v[i][p], viq = v[i][q]; v[i][p] = c * vip - s * viq; v[i][q] = s * vip + c * viq; }
    }
    const rows = a.map((row, i) => ({ value: row[i], vector: v.map(r => r[i]) })).sort((x, y) => x.value - y.value);
    return { values: rows.map(r => r.value), vectors: rows.map(r => r.vector), converged, residual };
  }
  const space = v => v?.basis && v?.projector ? v : subspace(v);
  function compare(first, second) {
    const a = space(first), b = space(second), base = { question: 'Unterscheiden sich die aufgespannten Merkmalsunterräume?', identity: false, semanticEquality: false, limits: [...limits] };
    if (!a.valid || !b.valid || a.ambientDimension !== b.ambientDimension || a.rank !== b.rank || a.schemaId !== b.schemaId || a.normalizationId !== b.normalizationId) return { ...base, valid: false, reason: 'Nur nichtleere Unterräume mit gleichem Träger, Rang, Schema und Normierung sind hier vergleichbar.' };
    const cross = a.basis.map(q => b.basis.map(r => dot(q, r)));
    const gram = cross.map(row => cross.map(other => dot(row, other)));
    const eigen = jacobi(gram);
    if (!eigen.converged) return { ...base, valid: false, reason: 'Die Winkelberechnung ist nicht konvergiert.' };
    const singularValues = eigen.values.map(v => Math.sqrt(Math.max(0, Math.min(1, v)))).reverse();
    const principalAngles = singularValues.map(v => Math.acos(Math.max(-1, Math.min(1, v))));
    let squared = 0;
    for (let i = 0; i < a.ambientDimension; i++) for (let j = 0; j < a.ambientDimension; j++) squared += (a.projector[i][j] - b.projector[i][j]) ** 2;
    return { ...base, valid: true, rank: a.rank, ambientDimension: a.ambientDimension, principalAngles, singularValues,
      projectorDistance: Math.sqrt(squared / 2), grassmannDistance: norm(principalAngles), saturated: a.saturated && b.saturated,
      warning: a.saturated && b.saturated ? 'Der volle Merkmalsraum wird von beiden Fassungen aufgespannt. Dieser Vergleich kann sie nicht unterscheiden.' : '' };
  }
  function combinations(n, k, start = 0, prefix = [], output = []) {
    if (!k) { output.push(prefix); return output; }
    for (let i = start; i <= n - k; i++) combinations(n, k - 1, i + 1, [...prefix, i], output);
    return output;
  }
  function determinant(rows) {
    if (rows.length === 1) return rows[0][0];
    if (rows.length === 2) return rows[0][0] * rows[1][1] - rows[0][1] * rows[1][0];
    return rows[0][0] * (rows[1][1] * rows[2][2] - rows[1][2] * rows[2][1]) - rows[0][1] * (rows[1][0] * rows[2][2] - rows[1][2] * rows[2][0]) + rows[0][2] * (rows[1][0] * rows[2][1] - rows[1][1] * rows[2][0]);
  }
  function validatePlucker(coordinates, n = 4, k = 2, tolerance = EPS) {
    if (!Array.isArray(coordinates) || coordinates.length !== combinations(n, k).length || !coordinates.every(Number.isFinite)) return { valid: false, reason: 'Falsche oder nichtendliche Plückerkoordinaten.' };
    const length = norm(coordinates);
    if (!(length > 0)) return { valid: false, reason: 'Der Nullvektor ist kein projektiver Punkt.' };
    if (k === 1) return { valid: true, supported: true, residual: 0 };
    if (k !== 2) return { valid: false, supported: false, reason: 'Freie Koordinaten werden hier nur für k=1 oder k=2 geprüft; k=3 wird aus einer geprüften Basis gebildet.' };
    const table = new Map(combinations(n, 2).map((ij, i) => [ij.join(','), coordinates[i] / length]));
    const get = (i, j) => table.get(`${i},${j}`);
    const relations = combinations(n, 4).map(([i, j, l, m]) => get(i, j) * get(l, m) - get(i, l) * get(j, m) + get(i, m) * get(j, l));
    const residual = Math.max(0, ...relations.map(Math.abs));
    return { valid: residual <= tolerance, supported: true, residual, relations, reason: residual <= tolerance ? '' : 'Die quadratischen Plückerrelationen sind verletzt.' };
  }
  function plucker(value) {
    const useBasis = value?.basis, vectors = useBasis || (Array.isArray(value) ? value : value?.matrix);
    const { matrix, n } = matrixInput({ matrix: vectors, ambientDimension: value?.ambientDimension });
    const k = matrix.length;
    if (k < 1 || k > 3 || n < k) return { valid: false, reason: 'Diese Darstellung benötigt ein unabhängiges Frame mit 1 bis 3 Vektoren.' };
    const s = subspace(matrix);
    if (!s.frameValid) return { valid: false, rank: s.rank, reason: 'Null- oder abhängige Vektoren liefern keinen projektiven Plückerpunkt.' };
    // Row scaling prevents numerical overflow, without changing the projective point.
    const rows = matrix.map(row => { const length = norm(row); return row.map(v => v / length); });
    const indices = combinations(n, k), coefficients = indices.map(columns => determinant(rows.map(row => columns.map(i => row[i]))));
    const length = norm(coefficients);
    if (!(length > EPS)) return { valid: false, rank: s.rank, reason: 'Die Minoren sind numerisch null.' };
    const sign = coefficients.find(v => Math.abs(v) > EPS) < 0 ? -1 : 1;
    return { valid: true, k, ambientDimension: n, indices, coefficients, normalized: coefficients.map(v => sign * v / length),
      validation: k <= 2 ? validatePlucker(coefficients, n, k) : { valid: true, supported: true, reason: 'Aus Minoren eines unabhängigen Frames konstruiert.' },
      limits: ['Projektive Minoren beschreiben den Unterraum, nicht Inhalt, Urheberschaft oder Herstellungsweg.'] };
  }
  function graphData(parts, relations = []) {
    partsCheck(parts);
    if (parts.length > 64 || !Array.isArray(relations)) throw new TypeError('Die lokale Spektralprobe unterstützt höchstens 64 Teile und eine Beziehungsliste.');
    const carrier = parts.map(p => p.id).sort(), index = new Map(carrier.map((id, i) => [id, i])), laplacian = zero(carrier.length), edges = [], skipped = [];
    for (const relation of relations) {
      if (!index.has(relation.from) || !index.has(relation.to)) throw new TypeError('Eine Beziehung verweist auf ein nicht vorhandenes Teil: ' + (relation.id || 'ohne ID'));
      const weight = finite(relation.weight, 1);
      if (!Number.isFinite(weight) || weight < 0) throw new TypeError('Laplacian-Gewichte müssen endlich und nichtnegativ sein.');
      if (relation.from === relation.to || weight === 0) { skipped.push(relation.id || null); continue; }
      const i = index.get(relation.from), j = index.get(relation.to);
      laplacian[i][i] += weight; laplacian[j][j] += weight; laplacian[i][j] -= weight; laplacian[j][i] -= weight;
      edges.push({ ...relation, weight });
    }
    return { carrier, index, laplacian, edges, skipped };
  }
  function graphSpectrum(parts, relations = [], options = {}) {
    const graph = graphData(parts, relations), eigen = jacobi(graph.laplacian), clusterTolerance = finite(options.clusterTolerance, 1e-7);
    if (!(clusterTolerance > 0 && Number.isFinite(clusterTolerance))) throw new TypeError('Die Clustertoleranz muss endlich und positiv sein.');
    const scale = Math.max(1, ...eigen.values.map(Math.abs)), clusters = [];
    eigen.values.forEach((value, i) => {
      const previous = clusters[clusters.length - 1];
      if (previous && Math.abs(value - previous.values[0]) <= clusterTolerance * scale) { previous.indices.push(i); previous.values.push(value); previous.basis.push(eigen.vectors[i]); }
      else clusters.push({ indices: [i], values: [value], basis: [eigen.vectors[i]] });
    });
    for (const cluster of clusters) { cluster.rank = cluster.indices.length; cluster.projector = projector(cluster.basis, graph.carrier.length); cluster.complete = true; }
    return { valid: eigen.converged && parts.length > 0, operatorId: 'weighted-undirected-combinatorial-laplacian/1', carrier: graph.carrier,
      laplacian: graph.laplacian, eigenvalues: eigen.values.map(v => Math.abs(v) < EPS * scale ? 0 : v), eigenvectors: eigen.vectors,
      clusters, clusterTolerance, converged: eigen.converged, residual: eigen.residual, skippedRelations: graph.skipped,
      evidence: graph.edges.map(e => ({ relationId: e.id || null, from: e.from, to: e.to, weight: e.weight, reason: e.reason || '', origin: e.origin || e.provenance || null })),
      limits: ['Eigenwerte liefern Kandidaten, keine Identität.', 'Eigenvektoren und Eigenräume dürfen nur auf denselben Teil-IDs oder einem ausdrücklich angegebenen Transport verglichen werden.', 'Cluster werden vollständig mitgeführt; ein Schnitt innerhalb eines Clusters ist kein stabiler Unterraum.'] };
  }
  function asSpectrum(value) { return value?.operatorId ? value : graphSpectrum(value.parts || [], value.relations || []); }
  function candidates(query, entries, options = {}) {
    const q = asSpectrum(query), limit = Math.max(1, Math.min(50, finite(options.limit, 5))), hits = [], rejected = [];
    if (!q.valid || !Array.isArray(entries)) return { valid: false, hits, rejected, reason: 'Es wird ein konvergiertes Quellspektrum und eine Kandidatenliste benötigt.' };
    for (const entry of entries) {
      try {
        const s = asSpectrum(entry);
        if (!s.valid || s.operatorId !== q.operatorId || s.eigenvalues.length !== q.eigenvalues.length) { rejected.push({ id: entry.id || null, reason: 'Anderer Operator, andere Teilzahl oder ungültige Berechnung.' }); continue; }
        const differences = s.eigenvalues.map((v, i) => v - q.eigenvalues[i]);
        hits.push({ id: entry.id || null, distance: norm(differences), identity: false,
          evidence: { operatorId: q.operatorId, partCount: q.carrier.length, differences, sameCarrier: q.carrier.join('\u0000') === s.carrier.join('\u0000'), relations: s.evidence },
          warning: 'Spektrale Nähe begründet einen Suchkandidaten. Isospektrale verschiedene Graphen sind möglich.' });
      } catch (error) { rejected.push({ id: entry.id || null, reason: error.message }); }
    }
    hits.sort((a, b) => a.distance - b.distance || String(a.id).localeCompare(String(b.id)));
    return { valid: true, question: 'Welche gespeicherten Beziehungsformen haben ähnliche Laplace-Eigenwerte auf gleich großen Trägern?', hits: hits.slice(0, limit), rejected, identity: false };
  }
  function hodgeRank(parts, relations = []) {
    const ordered = relations.filter(r => typeof r.order === 'number' && Number.isFinite(r.order));
    const graph = graphData(parts, ordered), eigen = jacobi(graph.laplacian), b = Array(parts.length).fill(0), scores = Array(parts.length).fill(0);
    for (const edge of graph.edges) { const i = graph.index.get(edge.from), j = graph.index.get(edge.to); b[i] -= edge.weight * edge.order; b[j] += edge.weight * edge.order; }
    const scale = Math.max(1, ...eigen.values.map(Math.abs));
    for (let m = 0; m < eigen.values.length; m++) if (eigen.values[m] > EPS * scale) { const q = eigen.vectors[m], coefficient = dot(q, b) / eigen.values[m]; for (let i = 0; i < scores.length; i++) scores[i] += coefficient * q[i]; }
    const residuals = graph.edges.map(e => { const fitted = scores[graph.index.get(e.to)] - scores[graph.index.get(e.from)]; return { id: e.id || null, from: e.from, to: e.to, order: e.order, weight: e.weight, fitted, residual: e.order - fitted, reason: e.reason || '' }; });
    const energy = residuals.reduce((s, e) => s + e.weight * e.residual ** 2, 0), inputEnergy = residuals.reduce((s, e) => s + e.weight * e.order ** 2, 0);
    const weightedDivergence = Array(parts.length).fill(0);
    for (const e of residuals) { weightedDivergence[graph.index.get(e.from)] -= e.weight * e.residual; weightedDivergence[graph.index.get(e.to)] += e.weight * e.residual; }
    return { valid: eigen.converged && graph.edges.length > 0, question: 'Wie gut passen ausdrücklich gesetzte Paarordnungen zu einer gemeinsamen Rangfolge?',
      carrier: graph.carrier, convention: 'score[to] - score[from] = order', scores: graph.carrier.map((id, i) => ({ id, score: scores[i] })), residuals,
      cyclicEnergy: energy, relativeResidual: inputEnergy > 0 ? Math.sqrt(energy / inputEnergy) : 0, weightedDivergence,
      componentCount: eigen.values.filter(v => v <= EPS * scale).length, ignoredRelations: relations.length - ordered.length,
      limits: ['Nur ausdrückliche numerische Paarordnungen werden untersucht; Position und Nähe erzeugen keine Rangordnung.', 'Die kleinste-Quadrate-Lösung trägt pro Zusammenhangskomponente eine freie additive Konstante.', 'Der zyklische Rest wird hier nicht weiter in lokalen Curl und harmonische Flüsse zerlegt.', 'Konsistenz beweist weder Wahrheit noch Zustimmung oder Gestaltungsqualität.'] };
  }
  function grammar(parts, rule = {}) {
    partsCheck(parts);
    const p = { ...(rule.params || rule.parameters || {}), ...rule }, type = p.type || p.name || p.kind;
    if (!['align', 'repeat', 'nest', 'fold'].includes(type)) throw new TypeError('Unbekannte Strukturregel.');
    const condition = p.conditions || p.condition || {}, chosen = p.ids || condition.ids;
    const ids = new Set(chosen || parts.map(part => part.id));
    if (chosen && (!Array.isArray(chosen) || chosen.some(id => !parts.some(part => part.id === id)))) throw new TypeError('Die Regelauswahl enthält unbekannte Teil-IDs.');
    const selected = parts.filter(part => ids.has(part.id) && (!condition.kind || part.kind === condition.kind) && (condition.minWords === undefined || words(part) >= condition.minWords) && (condition.maxWords === undefined || words(part) <= condition.maxWords));
    const selectedIds = new Set(selected.map(part => part.id)), next = clone(parts), affected = [];
    let count, depth, angle;
    if (type === 'repeat') { count = finite(p.count, 2); if (!Number.isInteger(count) || count < 1 || count > 12) throw new TypeError('Wiederholung benötigt eine ganze Anzahl von 1 bis 12.'); }
    if (type === 'nest') {
      depth = finite(p.depth, 1); if (!Number.isInteger(depth) || depth < 0 || depth > 6) throw new TypeError('Verschachtelung benötigt eine Tiefe von 0 bis 6.');
      if (p.parentId && (!parts.some(part => part.id === p.parentId) || selectedIds.has(p.parentId))) throw new TypeError('Der Elternteil muss vorhanden sein und außerhalb der Auswahl liegen.');
      if (p.parentId) for (const part of selected) {
        const seen = new Set([part.id]); let ancestor = p.parentId;
        while (ancestor) { if (seen.has(ancestor)) throw new TypeError('Die Verschachtelung würde einen Zyklus erzeugen.'); seen.add(ancestor); ancestor = parts.find(item => item.id === ancestor)?.appearance?.parentId; }
      }
    }
    if (type === 'fold') {
      angle = finite(p.angle, 35);
      if (!Number.isFinite(angle) || angle < -180 || angle > 180) throw new TypeError('Der Gelenkwinkel muss zwischen −180 und 180 Grad liegen.');
      if (!['x', 'y'].includes(p.axis || 'y') || !(finite(p.hinge, .5) >= 0 && finite(p.hinge, .5) <= 1)) throw new TypeError('Das Gelenk benötigt Achse x/y und eine relative Lage von 0 bis 1.');
      if (!selected.every(part => Number.isFinite(finite(part.appearance?.rotation)))) throw new TypeError('Die vorhandene Drehung muss endlich sein.');
    }
    if (type === 'align' && !['x', 'y', 'row', 'column'].includes(p.axis || 'x')) throw new TypeError('Ausrichtung benötigt x, y, row oder column.');
    for (let i = 0; i < selected.length; i++) {
      const source = selected[i], part = next.find(item => item.id === source.id), a = part.appearance ||= {};
      if (type === 'align') {
        const axis = p.axis || 'x', reference = selected[0].appearance || {}, gap = finite(p.gap, .14);
        const x = finite(p.x, finite(reference.x)), y = finite(p.y, finite(reference.y)), value = finite(p.value, axis === 'y' ? y : x);
        if (![gap, x, y, value].every(Number.isFinite)) throw new TypeError('Ausrichtung benötigt endliche Maße.');
        if (axis === 'row') { a.x = x + i * gap; a.y = y; } else if (axis === 'column') { a.x = x; a.y = y + i * gap; } else a[axis] = value;
      }
      if (type === 'repeat') a.repeat = count;
      if (type === 'nest') { a.depth = depth; a.layer = finite(a.layer) + depth; if (p.parentId) a.parentId = p.parentId; }
      if (type === 'fold') { a.rotation = finite(a.rotation) + angle; a.fold = { angle, axis: p.axis || 'y', hinge: finite(p.hinge, .5) }; }
      affected.push(part.id);
    }
    return { parts: next, affected, operation: { type, params: clone(p), inputIds: parts.map(part => part.id), outputIds: next.map(part => part.id) },
      preserved: ['Teilidentität', 'Inhalt', 'Originalreferenz', 'nicht ausgewählte Teile'],
      limits: type === 'fold' ? ['Dies ist eine geometrische Gelenkregel. Kawasaki, Schichtordnung, Kollisionen und globale Faltbarkeit werden dadurch nicht bewiesen.'] : ['Regelbedingungen und Parameter bestimmen die Struktur; Eignung und Lesbarkeit benötigen eine eigene Betrachtung.'] };
  }
  function inspect(workpiece, options = {}) {
    const questionId=options.question||'structure';
    if(!['structure','source','relations'].includes(questionId))throw Error('Unbekannte Untersuchungsfrage.');
    const parts = workpiece?.parts || [], relations = workpiece?.relations || [], f = features(parts, options), s = subspace(f);
    const carrier=parts.slice(0,64), carrierIds=new Set(carrier.map(p=>p.id)), graphRelations=relations.filter(r=>carrierIds.has(r.from)&&carrierIds.has(r.to));
    const spectrum = graphSpectrum(carrier, graphRelations), ranking = hodgeRank(carrier, graphRelations), p = plucker(s);
    const sourceComparison={unchangedParts:[],changedParts:[],uncheckableParts:[],ownParts:[]},sourceText=workpiece?.source?.text;
    for(const part of parts){
      if(part.origin==='human'||part.origin==='model'||!part.source){sourceComparison.ownParts.push(part.id);continue;}
      const {start,end}=part.source;
      if(typeof sourceText!=='string'||workpiece?.source?.sha256&&part.source.sha256!==workpiece.source.sha256||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>sourceText.length||typeof part.content?.text!=='string'){sourceComparison.uncheckableParts.push(part.id);continue;}
      sourceComparison[part.content.text===sourceText.slice(start,end)?'unchangedParts':'changedParts'].push(part.id);
    }
    let question,readable;
    if(questionId==='structure'){
      question=f.question;
      readable=[`${parts.length} Teile mit stabilen IDs.`,`Textmenge und Anordnung: Rang ${s.rank} in ${s.ambientDimension} Dimensionen.`,s.saturated?'Der volle Merkmalsraum wird aufgespannt. Unterraumgleichheit kann diese Fassung nicht unterscheiden.':s.valid?'Unterraumvergleich ist nur bei gleichem Schema, gleicher Normierung und gleichem Rang zulässig.':'Kein nichtleerer Merkmalsunterraum vorhanden.'];
    }else if(questionId==='relations'){
      question='Welche Struktur und welche ausdrücklich gesetzten Paarordnungen haben die benannten Beziehungen?';
      readable=[`${relations.length} benannte Beziehungen zwischen ${parts.length} Teilen.${parts.length>64?' Graphprüfung ausdrücklich auf die ersten 64 Teile und deren Beziehungen begrenzt.':''}`,`Beziehungsgraph: ${spectrum.clusters.length} vollständige Eigenwertcluster auf ${spectrum.carrier.length} Teil-IDs.`,ranking.valid?`Explizite Paarordnungen: ${ranking.residuals.length}; zyklischer Rest ${ranking.relativeResidual.toFixed(3)}.`:'Keine ausdrücklichen Paarordnungen für eine Rangprüfung gesetzt.','Beziehung und Ordnung sind Setzungen; Spektrum und zyklischer Rest belegen weder Wahrheit noch Zustimmung.'];
    }else{
      question='Welche vorhandenen Textteile erhalten den Wortlaut ihrer festgehaltenen Quellstelle?';
      readable=[`${sourceComparison.unchangedParts.length} Quellteile wörtlich erhalten; ${sourceComparison.changedParts.length} Quellteile wörtlich verändert.`,`${sourceComparison.ownParts.length} eigene oder modellierte Teile getrennt; ${sourceComparison.uncheckableParts.length} Quellteile ohne prüfbaren Textlocator.`,...(sourceComparison.changedParts.length?[`Veränderte Teil-IDs: ${sourceComparison.changedParts.join(', ')}.`]:[]),'Verglichen wird ausschließlich der Teiltext dieser Fassung mit seiner Originalstelle. Ausgelassene Originalstellen sind damit nicht als erhalten nachgewiesen; Paraphrasen gelten als wörtliche Änderung.'];
    }
    return { questionId, question, summary: readable.join(' '), readable,
      version: workpiece?.revision ?? workpiece?.version ?? null, workpieceId: workpiece?.id || null,
      metrics: { partCount: parts.length, relationCount: relations.length, rank: s.rank, ambientDimension: s.ambientDimension, saturated: s.saturated, clusterCount: spectrum.clusters.length, orderedRelations: ranking.residuals.length, cyclicResidual: ranking.relativeResidual },
      features: f, subspace: s, plucker: p, spectrum, ranking, sourceComparison, limits: [...limits, 'Numerischer Befund; sichtbare Bedienung, Speicherung, Hörprüfung und menschliche Gestaltungseinschätzung sind getrennte Nachweise.'] };
  }
  const api = Object.freeze({ version: 1, dimensions, features, subspace, compare, plucker, validatePlucker, graphSpectrum, candidates, hodgeRank, grammar, inspect });
  root.KinformerMath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
