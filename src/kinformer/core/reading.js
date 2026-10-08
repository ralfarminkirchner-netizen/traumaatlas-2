/* KiNFORMER core · Werkbezug, Lesart und Projektion.
 *
 * The existing workpiece (flagship/modules/workshop-model.js, `KinformerWorkpiece`) stays the work model.
 * This module only reads it. It never writes to a workpiece and adds no field to it.
 *
 *  - artifactRef / bindingOf : the same quadruple the workshop already uses to bind tool results
 *                              (workpieceId, materialId, sourceSha256, revision).
 *  - reading (Lesart)        : an explicit, attributed assignment of roles to parts. The workpiece knows
 *                              parts and reasoned relations, but no roles such as title, claim or term.
 *  - projection              : what a transformation treats as carrying meaning.
 *  - formState               : how the workpiece currently looks and unfolds in time. */

import { fail, copy, freeze, isSha256, isPlain } from './hash.js';

export const READING_SCHEMA = 'kinformer-reading/1';
export const PROJECTION_SCHEMA = 'kinformer-projection/1';
export const FORM_STATE_SCHEMA = 'kinformer-form-state/1';

export const ROLES = freeze(['title', 'claim', 'term', 'source']);
const TRANSITIONS = ['cut', 'fade', 'slide'];
const DEFAULT_BEHAVIOR = { mass: 1, damping: .4, friction: .5, anchored: false, material: 'wood', excitation: .5, pickup: .7 };
export const WORKSHOP_LIMITS = freeze({ stepMin: .3, stepMax: 30, total: 120, steps: 100 });
const CLIP_OPTIONS = ['from', 'to', 'sound', 'gestureId', 'gestureStart', 'gestureEnd', 'playbackRate', 'gain'];

function assertWorkpiece(w) {
  if (!isPlain(w) || typeof w.id !== 'string' || !w.id || !isPlain(w.source) || typeof w.source.materialId !== 'string'
    || !isSha256(w.source.sha256) || !Number.isInteger(w.revision) || w.revision < 0 || !Array.isArray(w.parts))
    fail('reading.workpiece', 'Das ist kein Werkstück mit Original, Quellhash und Fassungszähler.');
  return w;
}

/** ArtifactRef: identity of the work and of its original. */
export function artifactRef(w) {
  assertWorkpiece(w);
  return { workpieceId: w.id, materialId: w.source.materialId, sourceSha256: w.source.sha256 };
}

/** The binding quadruple of the workshop (`KinformerArtifacts.bound`). */
export const bindingOf = w => ({ ...artifactRef(w), revision: w.revision });

const partMap = w => new Map(w.parts.map(part => [part.id, part]));

/** Lesart: who is title, claim, term and source in this workpiece. Stored beside the workpiece, never in it. */
export function createReading(w, input = {}) {
  assertWorkpiece(w);
  const parts = partMap(w), used = new Set();
  const one = (id, role) => {
    if (id === undefined || id === null) return null;
    if (typeof id !== 'string' || !parts.has(id)) fail('reading.part', 'Die Lesart nennt ein Teil, das es im Werkstück nicht gibt (' + role + ').');
    if (used.has(id)) fail('reading.duplicate', 'Ein Teil kann in einer Lesart nur eine Rolle tragen.');
    used.add(id);
    return id;
  };
  const many = (ids, role) => {
    if (ids === undefined) return [];
    if (!Array.isArray(ids)) fail('reading.list', 'Die Lesart braucht für ' + role + ' eine Liste von Teilen.');
    return ids.map(id => one(id, role));
  };
  const assignedBy = input.assignedBy ?? 'human';
  if (!['human', 'model'].includes(assignedBy)) fail('reading.author', 'Eine Lesart stammt von einem Menschen oder einem Modell.');
  const reading = {
    schema: READING_SCHEMA,
    ...artifactRef(w),
    roles: { title: one(input.title, 'Titel'), claim: one(input.claim, 'Kernaussage'), terms: many(input.terms, 'Begriffe'), sources: many(input.sources, 'Quellen') },
    assignedBy,
    note: typeof input.note === 'string' ? input.note : '',
  };
  if (!used.size) fail('reading.empty', 'Eine Lesart braucht mindestens ein Teil mit Rolle.');
  return freeze(reading);
}

function assertReading(w, reading) {
  if (!isPlain(reading) || reading.schema !== READING_SCHEMA || !isPlain(reading.roles))
    fail('reading.invalid', 'Die Lesart hat nicht die erwartete Form.');
  const ref = artifactRef(w);
  if (reading.workpieceId !== ref.workpieceId || reading.materialId !== ref.materialId || reading.sourceSha256 !== ref.sourceSha256)
    fail('reading.foreign', 'Die Lesart gehört zu einem anderen Werkstück oder einem anderen Original.');
}

/** How the roled parts of a projection stand to the original wording. */
export function originFidelity(projection) {
  const items = [projection.title, projection.claim, ...projection.terms, ...projection.sources].filter(Boolean);
  return { parts: items.length, verbatim: items.filter(item => item.verbatim === true).map(item => item.partId),
    reworded: items.filter(item => item.verbatim === false).map(item => item.partId), unlocated: items.filter(item => item.verbatim === null).map(item => item.partId) };
}

/** Roled parts in reading order: title, claim, terms, sources. */
export function roledParts(w, reading) {
  assertReading(w, reading);
  const parts = partMap(w), list = [];
  const push = (id, role) => {
    const part = parts.get(id);
    if (!part) fail('reading.stale', 'Ein Teil der Lesart fehlt in dieser Fassung des Werkstücks.');
    list.push({ role, part });
  };
  if (reading.roles.title) push(reading.roles.title, 'title');
  if (reading.roles.claim) push(reading.roles.claim, 'claim');
  for (const id of reading.roles.terms) push(id, 'term');
  for (const id of reading.roles.sources) push(id, 'source');
  return list;
}

const locatorOf = part => !part.source ? null
  : part.source.rect ? { rect: copy(part.source.rect) }
  : { start: part.source.start, end: part.source.end };

/** Projection: the meaning-bearing content of one revision under one reading. */
export function project(w, reading) {
  const roled = roledParts(w, reading), inScope = new Set(roled.map(entry => entry.part.id));
  // Same rule as the workshop's source finding (workshop.js, `sourceFindings`): a part with a text span is
  // verbatim when its wording still equals that span of the original. Parts without a span cannot be judged.
  const verbatim = part => Number.isInteger(part.source?.start) && Number.isInteger(part.source?.end) && typeof w.source.text === 'string'
    ? String(part.content?.text ?? '') === w.source.text.slice(part.source.start, part.source.end) : null;
  const item = ({ role, part }) => ({
    partId: part.id, role, text: String(part.content?.text ?? ''), kind: part.kind ?? null,
    origin: part.origin, author: part.content?.author ?? null, locator: locatorOf(part), verbatim: verbatim(part),
  });
  const of = role => roled.filter(entry => entry.role === role).map(item);
  const relations = [], outsideRelations = [];
  for (const relation of w.relations || []) {
    if (inScope.has(relation.from) && inScope.has(relation.to)) relations.push({
      id: relation.id, from: relation.from, to: relation.to, reason: String(relation.reason ?? ''), origin: relation.origin ?? null,
      weight: Number.isFinite(relation.weight) ? relation.weight : 1,
      order: relation.order ?? null, joint: relation.joint ?? null,
    });
    else outsideRelations.push(relation.id);
  }
  return freeze({
    schema: PROJECTION_SCHEMA,
    binding: bindingOf(w),
    assignedBy: reading.assignedBy,
    title: of('title')[0] ?? null,
    claim: of('claim')[0] ?? null,
    terms: of('term'),
    relations,
    sources: of('source'),
    outOfScope: {
      parts: w.parts.filter(part => !inScope.has(part.id)).map(part => part.id),
      relations: outsideRelations,
      gestures: (w.gestures || []).length,
      code: !!w.code,
      toolArtifacts: (w.audioArtifacts || []).length + (w.formArtifacts || []).length,
    },
  });
}

// one rounding only, to the grid on which properties are compared
const round = value => Math.round(value * 1e4) / 1e4;

/** Form state: layout, type size, direction and the single-track sequence of the workshop's time form. */
export function formState(w, reading) {
  const roled = roledParts(w, reading), inScope = new Set(roled.map(entry => entry.part.id));
  const layout = [], typography = [], extras = [];
  for (const { part } of roled) {
    const a = part.appearance || {};
    for (const key of ['x', 'y', 'width', 'height', 'fontSize'])
      if (!Number.isFinite(a[key])) fail('reading.appearance', 'Ein Teil hat keine endlichen Darstellungsmaße.');
    layout.push({ partId: part.id, x: round(a.x), y: round(a.y), width: round(a.width), height: round(a.height),
      rotation: round(Number.isFinite(a.rotation) ? a.rotation : 0), layer: Number.isFinite(a.layer) ? a.layer : 0 });
    typography.push({ partId: part.id, fontSize: round(a.fontSize) });
    if (Number.isFinite(a.repeat) && a.repeat !== 1) extras.push({ partId: part.id, key: 'repeat', value: a.repeat });
    if (Number.isFinite(a.depth) && a.depth !== 0) extras.push({ partId: part.id, key: 'depth', value: a.depth });
    for (const key of ['parentId', 'fold', 'foldVertex']) if (a[key] !== undefined && a[key] !== null) extras.push({ partId: part.id, key, value: copy(a[key]) });
    const b = part.behavior || {};
    if (Object.keys(DEFAULT_BEHAVIOR).some(key => b[key] !== undefined && b[key] !== DEFAULT_BEHAVIOR[key]))
      extras.push({ partId: part.id, key: 'behavior', value: copy(b) });
  }
  const sequence = [], outsideSteps = [];
  for (const [index, clip] of (w.sequence || []).entries()) {
    if (!inScope.has(clip.partId)) { outsideSteps.push(index); continue; }
    const step = { partId: clip.partId, duration: round(clip.duration), transition: TRANSITIONS.includes(clip.transition) ? clip.transition : 'cut' };
    const options = {};
    for (const key of CLIP_OPTIONS) if (clip[key] !== undefined && clip[key] !== null && clip[key] !== false) options[key] = copy(clip[key]);
    if (Object.keys(options).length) step.options = options;
    sequence.push(step);
  }
  // The workshop plays a stored sequence within these bounds (workshop-time-code.js, normalizeSequence).
  // A body follows the stored values; where they lie outside, that is said and not silently bent.
  const total = sequence.reduce((sum, step) => sum + step.duration, 0);
  const workshopLimits = { ...WORKSHOP_LIMITS, outside: {
    short: sequence.filter(step => step.duration < WORKSHOP_LIMITS.stepMin).map(step => step.partId),
    long: sequence.filter(step => step.duration > WORKSHOP_LIMITS.stepMax).map(step => step.partId),
    total: total > WORKSHOP_LIMITS.total, steps: (w.sequence || []).length > WORKSHOP_LIMITS.steps } };
  const sizes = [...new Set(typography.map(entry => entry.fontSize))].sort((a, b) => b - a);
  // parts of one size form one tier; inside a tier there is no order, so the ids are sorted
  const hierarchy = sizes.map(size => typography.filter(entry => entry.fontSize === size).map(entry => entry.partId).sort());
  // from the bottom layer to the top; equal layers keep the order of the workpiece
  const stacking = layout.map((entry, index) => ({ entry, index })).sort((a, b) => a.entry.layer - b.entry.layer || a.index - b.index).map(item => item.entry.partId);
  return freeze({
    schema: FORM_STATE_SCHEMA,
    binding: bindingOf(w),
    direction: w.direction ?? null,
    layout, typography, extras, sequence, hierarchy, stacking, workshopLimits,
    outOfScope: { sequenceSteps: outsideSteps },
  });
}
