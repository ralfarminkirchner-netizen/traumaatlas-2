/* KiNFORMER core · Eigenschaften, Vergleich und Einordnung.
 *
 * A transformation is judged on stated properties, never on a file difference. Every property is an
 * assertion {key, aspect, value}. Keys follow `<class>[:<id>][#<n>][.<field>]`, for example
 * `term:<partId>.text`, `relation:<id>`, `timing:<partId>.duration`, `palette.accent`.
 *
 * Vocabulary follows the existing source comparison of the worksheet track
 * (preserved / changed / missing / unexamined, three-valued statements, explicit limits) and adds what it
 * lacks: `added`, and one result per transformation instead of per text field. */

import { canonical, copy, fail, freeze } from './hash.js';

export const ASSERTION_SCHEMA = 'kinformer-assertions/1';

/** meaning   – what the work says: wording of roled parts, reasoned relations, cited sources
 *  structure – how the statement is arranged: order of presentation, rank, relation measures
 *  form      – how it looks: layout, stacking, type size, colour, canvas
 *  time      – how it unfolds: durations, transitions, motion */
export const ASPECTS = freeze(['meaning', 'structure', 'form', 'time']);

/** Which kind a property is, is decided here, per class, and not by whoever reports the property. */
const CLASS_ASPECT = freeze({
  title: 'meaning', claim: 'meaning', term: 'meaning', source: 'meaning', unassigned: 'meaning',
  order: 'structure', hierarchy: 'structure', body: 'structure',
  direction: 'form', layout: 'form', stacking: 'form', typography: 'form', extra: 'form', palette: 'form', canvas: 'form', font: 'form', runtime: 'form', binding: 'form',
  timing: 'time', clip: 'time', duration: 'time', fps: 'time', motion: 'time',
});

/** The same rule the worksheet comparison uses for text, plus control characters, which no body can show. */
export const NORMALIZATION = 'Wortlaut wird für den Vergleich angeglichen: Steuerzeichen entfallen, jede Folge von Leerraum wird ein Leerzeichen, die Ränder werden beschnitten. Groß- und Kleinschreibung, Satzzeichen und Zahlen bleiben unverändert. Zahlen gelten bis zu einer Abweichung von einem Zehntausendstel als gleich.';
export const normalizeWording = value => String(value ?? '').replace(/[\u0000-\u0008\u000E-\u001F\u007F]/g, '').replace(/\s+/gu, ' ').trim();
export const NUMERIC_TOLERANCE = 1.01e-4;

const round4 = value => Math.round(value * 1e4) / 1e4;

export function assertion(key, aspect, value, about) {
  if (typeof key !== 'string' || !key) fail('property.key', 'Eine Eigenschaft braucht einen Schlüssel.');
  if (!ASPECTS.includes(aspect)) fail('property.aspect', 'Unbekannte Art von Eigenschaft: ' + String(aspect));
  return about ? { key, aspect, value: copy(value), about: copy(about) } : { key, aspect, value: copy(value) };
}

/** `term:abc#2.text` → {cls:'term', id:'abc', occurrence:2, field:'text'} */
export function parseKey(key) {
  const match = /^([a-z][a-z-]*)(?::([^.#]+))?(?:#(\d+))?(?:\.(.+))?$/i.exec(String(key));
  if (!match) fail('property.key', 'Unlesbarer Eigenschaftsschlüssel: ' + String(key));
  return { cls: match[1], id: match[2] ?? null, occurrence: match[3] ? Number(match[3]) : 1, field: match[4] ?? null };
}

/** The kind of a property by its class; null for a class the core does not know. */
export function aspectOf(key) {
  const parsed = parseKey(key);
  if (parsed.cls === 'relation') return parsed.field ? 'structure' : 'meaning';
  return CLASS_ASPECT[parsed.cls] ?? null;
}

/** Take reported properties and set their kind by the rule of the core. A class the core does not know
 *  keeps the reported kind and is named, so that nobody mistakes it for a decision of the core. */
export function withCoreAspects(list) {
  const unknown = new Set();
  const out = list.map(item => {
    const aspect = aspectOf(item.key);
    if (!aspect) { unknown.add(parseKey(item.key).cls); return item; }
    return aspect === item.aspect ? item : { ...item, aspect };
  });
  return { assertions: out, unknownClasses: [...unknown].sort() };
}

/** A selector names a class of properties: `term`, `relation`, `timing.duration`, `palette`. */
export function selectorMatches(selector, key) {
  const [cls, field] = String(selector).split('.');
  const parsed = parseKey(key);
  return parsed.cls === cls && (field === undefined || parsed.field === field);
}

const sortByKey = list => list.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

/** Order of presentation: every step of the sequence in order, a repeated part as `<part>#2`, `#3`, …
 *  Without a sequence, the order of the reading. */
export function presentationOrder(projection, formState) {
  const reading = [projection.title, projection.claim, ...projection.terms, ...projection.sources].filter(Boolean).map(item => item.partId);
  if (!formState.sequence.length) return { basis: 'reading', parts: reading, steps: reading };
  const count = new Map(), steps = [], parts = [];
  for (const step of formState.sequence) {
    const n = (count.get(step.partId) || 0) + 1; count.set(step.partId, n);
    steps.push(n > 1 ? step.partId + '#' + n : step.partId);
    if (n === 1) parts.push(step.partId);
  }
  return { basis: 'sequence', parts, steps };
}

/** Everything the source states within the scope of the reading. */
export function sourceAssertions(projection, formState) {
  const list = [], text = item => normalizeWording(item.text);
  if (projection.title) list.push(assertion('title.text', 'meaning', text(projection.title), { role: 'title', partId: projection.title.partId }));
  if (projection.claim) list.push(assertion('claim.text', 'meaning', text(projection.claim), { role: 'claim', partId: projection.claim.partId }));
  for (const term of projection.terms) list.push(assertion('term:' + term.partId + '.text', 'meaning', text(term), { role: 'term', partId: term.partId }));
  for (const source of projection.sources) list.push(assertion('source:' + source.partId + '.text', 'meaning', text(source), { role: 'source', partId: source.partId }));
  for (const relation of projection.relations) {
    list.push(assertion('relation:' + relation.id, 'meaning', { from: relation.from, to: relation.to, reason: normalizeWording(relation.reason) }, { role: 'relation', relationId: relation.id }));
    if (relation.weight !== 1) list.push(assertion('relation:' + relation.id + '.weight', 'structure', relation.weight));
    if (relation.order !== null) list.push(assertion('relation:' + relation.id + '.order', 'structure', relation.order));
    if (relation.joint !== null) list.push(assertion('relation:' + relation.id + '.joint', 'structure', relation.joint));
  }
  const order = presentationOrder(projection, formState);
  list.push(assertion('order', 'structure', order.steps, { basis: order.basis }));
  list.push(assertion('hierarchy', 'structure', formState.hierarchy));
  list.push(assertion('stacking', 'form', formState.stacking));
  if (formState.direction !== null) list.push(assertion('direction', 'form', formState.direction));
  for (const entry of formState.layout)
    list.push(assertion('layout:' + entry.partId, 'form', { x: entry.x, y: entry.y, width: entry.width, height: entry.height, rotation: entry.rotation }));
  for (const entry of formState.typography) list.push(assertion('typography:' + entry.partId + '.fontSize', 'form', entry.fontSize));
  for (const entry of formState.extras) list.push(assertion('extra:' + entry.partId + '.' + entry.key, 'form', entry.value));
  const count = new Map();
  for (const step of formState.sequence) {
    const n = (count.get(step.partId) || 0) + 1; count.set(step.partId, n);
    const id = 'timing:' + step.partId + (n > 1 ? '#' + n : '');
    list.push(assertion(id + '.duration', 'time', round4(step.duration)));
    list.push(assertion(id + '.transition', 'time', step.transition));
    for (const [key, value] of Object.entries(step.options || {})) list.push(assertion('clip:' + step.partId + (n > 1 ? '#' + n : '') + '.' + key, 'time', value));
  }
  return sortByKey(list);
}

const TEMPORAL_GROUPS = ['motion', 'timing', 'fps', 'duration'];

/** Body parameters of a request as assertions: `palette.accent`, `motion.ease`, `fps`.
 *  They belong to no part of the work; they say how a body is to be made. */
export function parameterAssertions(parameters = {}) {
  const list = [];
  for (const [group, values] of Object.entries(parameters)) {
    const aspect = TEMPORAL_GROUPS.includes(group) ? 'time' : 'form';
    if (values !== null && typeof values === 'object' && !Array.isArray(values))
      for (const [name, value] of Object.entries(values)) list.push(assertion(group + '.' + name, aspect, value));
    else list.push(assertion(group, aspect, values));
  }
  return sortByKey(list);
}

/** Equal, with numbers compared up to NUMERIC_TOLERANCE. Bodies store pixels; reading them back and
 *  dividing lands a hair beside the original fraction. That is not a change. */
export function sameValue(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) <= NUMERIC_TOLERANCE;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => sameValue(item, b[index]));
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(a).sort();
    return canonical(keys) === canonical(Object.keys(b).sort()) && keys.every(key => sameValue(a[key], b[key]));
  }
  return a === b;
}

/** Is `to` what remains of the list `from` when entries are left out, with the rest in the same order?
 *  Then an order or a ranking was shortened, not rearranged. Works for nested lists (tiers). */
export function isReduction(from, to) {
  if (!Array.isArray(from) || !Array.isArray(to)) return false;
  const flat = list => list.map(entry => Array.isArray(entry) ? entry : [entry]);
  const a = flat(from), b = flat(to), kept = new Set(b.flat().map(entry => canonical(entry)));
  if (kept.size === new Set(a.flat().map(entry => canonical(entry))).size) return false;
  const rest = a.map(group => group.filter(entry => kept.has(canonical(entry)))).filter(group => group.length);
  return canonical(rest) === canonical(b);
}

/** Compare what the source states with what was observed in a produced body.
 *  `observation` = {assertions, unexamined:[{select, reason}]}. Nothing is filled in from the source:
 *  a property that was not observed is lost, unless the observer says it could not examine that class. */
export function diffAssertions(source, observation) {
  const observed = new Map(observation.assertions.map(item => [item.key, item]));
  const sourceKeys = new Set(source.map(item => item.key));
  const blind = observation.unexamined || [];
  const retained = [], changed = [], lost = [], unexamined = [], added = [];
  for (const item of source) {
    const seen = observed.get(item.key);
    if (seen) {
      if (sameValue(item.value, seen.value)) retained.push(copy(item));
      else changed.push({ key: item.key, aspect: item.aspect, from: copy(item.value), to: copy(seen.value),
        ...(isReduction(item.value, seen.value) ? { reduced: true } : {}), ...(item.about ? { about: copy(item.about) } : {}) });
      continue;
    }
    const reason = blind.find(entry => selectorMatches(entry.select, item.key));
    if (reason) unexamined.push({ ...copy(item), reason: reason.reason });
    else lost.push(copy(item));
  }
  for (const item of observation.assertions) if (!sourceKeys.has(item.key)) added.push(copy(item));
  return { retained: sortByKey(retained), changed: sortByKey(changed), added: sortByKey(added), lost: sortByKey(lost), unexamined: sortByKey(unexamined) };
}

/** Compare two stated property sets of the same kind, e.g. two revisions of one workpiece. */
export const diffStates = (before, after) => diffAssertions(before, { assertions: after, unexamined: [] });

export const CLAIM_CEILING = 'Verglichen wurden nur die Angaben, die im Werk festgehalten sind, nach den Regeln des genannten Formraums. '
  + 'Ob die Form gut wirkt, lesbar ist oder anders verstanden wird, ist damit nicht geprüft. Ob ein Mensch das Ergebnis annimmt, bleibt ein eigener Schritt.';

/** Is a set of deviations a change of form or a change of meaning?
 *  `rule(key)` answers 'keep' | 'vary' | null. Without a rule the kind of the property decides:
 *  meaning counts as a change of meaning, structure stays open ("Zusammenhang prüfen"), form and time are form.
 *  Both statements are three-valued: what could not be examined is never counted as unchanged.
 *  Verdicts per deviation: 'meaning', 'form', 'open', 'form-open' (form that could not be examined) and
 *  'consequence' (a shortened list whose missing members are lost parts, judged where they are lost). */
export function classify(diff, rule = () => null) {
  const reasons = [];
  const verdictFor = (entry, declared) => declared === 'keep' ? 'meaning' : declared === 'vary' ? 'form'
    : entry.aspect === 'meaning' ? 'meaning' : entry.aspect === 'structure' ? 'open' : 'form';
  // A list that only got shorter because parts fell away says nothing of its own: the loss of those parts
  // is already in the balance and is judged there. Such a shortening follows; it is not judged twice.
  const base = id => String(id).replace(/#\d+$/, '');
  const gone = new Set(diff.lost.flatMap(entry => [entry.about?.partId, parseKey(entry.key).id]).filter(Boolean));
  const follows = entry => {
    if (!entry.reduced) return null;
    const kept = new Set(entry.to.flat().map(String)), dropped = [...new Set(entry.from.flat().map(String).filter(id => !kept.has(id)).map(base))];
    return dropped.length && dropped.every(id => gone.has(id)) ? dropped : null;
  };
  const judge = (entry, deviation) => {
    const declared = rule(entry.key), because = deviation === 'changed' ? follows(entry) : null;
    reasons.push({ key: entry.key, aspect: entry.aspect, deviation, declared: declared ?? 'undeclared', verdict: because ? 'consequence' : verdictFor(entry, declared), ...(because ? { follows: because } : {}) });
  };
  for (const entry of diff.changed) judge(entry, 'changed');
  for (const entry of diff.lost) judge(entry, 'lost');
  for (const entry of diff.added) judge(entry, 'added');
  for (const entry of diff.unexamined || []) {
    const declared = rule(entry.key);
    // unexamined: the same sorting, but as an open question on that side
    reasons.push({ key: entry.key, aspect: entry.aspect, deviation: 'unexamined', declared: declared ?? 'undeclared', verdict: verdictFor(entry, declared) === 'form' ? 'form-open' : 'open' });
  }
  const has = verdict => reasons.some(reason => reason.verdict === verdict);
  const meaning = has('meaning') ? 'changed' : has('open') ? 'unexamined' : 'invariant';
  const formTouched = reasons.filter(reason => reason.verdict === 'form');
  const form = formTouched.some(reason => reason.deviation !== 'added') ? 'changed' : has('form-open') ? 'unexamined' : formTouched.length ? 'extended' : 'unchanged';
  const kind = meaning === 'changed' ? 'meaning' : meaning === 'unexamined' ? 'open' : form === 'unexamined' ? 'form-open' : form === 'unchanged' ? 'none' : 'form';
  return freeze({ kind, meaning, form, reasons, ceiling: CLAIM_CEILING });
}

export const KIND_LABELS = freeze({
  none: 'Nichts weicht ab: Aussage und Form sind wie im Ursprung.',
  form: 'Nur die Form ist anders. Was das Werk sagt, ist gleich geblieben.',
  'form-open': 'Was das Werk sagt, ist gleich geblieben. Ein Teil der Form ließ sich nicht prüfen.',
  open: 'Nicht entschieden: Ob sich ändert, was das Werk sagt, muss jemand ansehen.',
  meaning: 'Was das Werk sagt, hat sich geändert.',
});
