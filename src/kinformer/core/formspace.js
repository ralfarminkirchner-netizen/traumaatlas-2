/* KiNFORMER core · Formraum als Regelraum.
 *
 * A form space says which bodies a kind of work may take, what must stay (keep), what may differ (vary),
 * which operations are permitted, which design rules the free properties have to follow (rules), and which
 * conditions a result is checked against (criteria). Bodies and operations are always checked; they do not
 * have to be repeated as a criterion.
 *
 * Naming: the worksheet track already has a "Formraum" object with `keep`, `vary` and `criteria` as text
 * lists (worksheet-model.js, `createSpace`). This module keeps those three words and makes them
 * machine-checkable selectors, and adds the permitted bodies. It does not replace or migrate that object.
 * `form-space-geometry.js` is something else: a feature space for observed variation, not a rule space. */

import { fail, freeze, copy } from './hash.js';
import { isBodyType } from './bodies.js';
import { selectorMatches, sameValue } from './properties.js';

export const FORMSPACE_SCHEMA = 'kinformer-formspace/1';
export const CRITERION_KINDS = freeze(['body-allowed', 'kept-retained', 'relations-connect-shown-terms', 'source-shown', 'duration-within']);
/** Design rules: a free property may vary, but only inside what the rule allows. */
export const RULE_KINDS = freeze(['one-of', 'within']);
export const CHECK_STATES = freeze(['held', 'violated', 'unexamined', 'not-applicable']);

const selectors = (list, name) => {
  if (!Array.isArray(list)) fail('formspace.list', 'Der Formraum braucht eine Liste für ' + name + '.');
  return list.map(entry => {
    const item = typeof entry === 'string' ? { select: entry, label: entry } : entry;
    if (!item || typeof item.select !== 'string' || !/^[a-z][a-z-]*(\.[a-zA-Z]+)?$/.test(item.select))
      fail('formspace.selector', 'Ungültige Auswahl im Formraum (' + name + ').');
    return { select: item.select, label: String(item.label ?? item.select) };
  });
};

export function defineFormSpace(input) {
  if (!input || typeof input.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(input.id)) fail('formspace.id', 'Ein Formraum braucht eine Kennung.');
  const bodies = input.bodies || [];
  if (!Array.isArray(bodies) || !bodies.length || !bodies.every(isBodyType)) fail('formspace.bodies', 'Ein Formraum nennt mindestens einen bekannten Körper.');
  const keep = selectors(input.keep || [], 'keep'), vary = selectors(input.vary || [], 'vary');
  for (const k of keep) if (vary.some(v => v.select === k.select)) fail('formspace.conflict', 'Dieselbe Eigenschaft kann nicht zugleich bleiben und frei sein: ' + k.select);
  const criteria = (input.criteria || []).map(criterion => {
    if (!criterion || typeof criterion.id !== 'string' || !CRITERION_KINDS.includes(criterion.kind)) fail('formspace.criterion', 'Unbekannte Prüfbedingung im Formraum.');
    if (criterion.kind === 'duration-within' && !(Number.isFinite(criterion.min) && Number.isFinite(criterion.max) && criterion.min >= 0 && criterion.max >= criterion.min))
      fail('formspace.criterion', 'Die Dauerbedingung braucht eine untere und obere Grenze in Sekunden.');
    return copy({ ...criterion, label: String(criterion.label ?? criterion.id) });
  });
  const rules = (input.rules || []).map(rule => {
    if (!rule || typeof rule.id !== 'string' || !RULE_KINDS.includes(rule.kind) || typeof rule.select !== 'string' || !/^[a-z][a-z-]*(\.[a-zA-Z]+)?$/.test(rule.select))
      fail('formspace.rule', 'Eine Gestaltungsregel braucht Kennung, Art und Auswahl.');
    if (rule.kind === 'one-of' && !(Array.isArray(rule.values) && rule.values.length)) fail('formspace.rule', 'Die Gestaltungsregel „' + rule.id + '“ braucht erlaubte Werte.');
    if (rule.kind === 'within' && !(Number.isFinite(rule.min) && Number.isFinite(rule.max) && rule.max >= rule.min)) fail('formspace.rule', 'Die Gestaltungsregel „' + rule.id + '“ braucht eine untere und obere Grenze.');
    return copy({ ...rule, label: String(rule.label ?? rule.id) });
  });
  const ids = [...criteria, ...rules].map(item => item.id);
  if (new Set(ids).size !== ids.length) fail('formspace.duplicate', 'Prüfbedingungen und Gestaltungsregeln brauchen verschiedene Kennungen.');
  return freeze({
    schema: FORMSPACE_SCHEMA, id: input.id, version: Number.isInteger(input.version) ? input.version : 1,
    label: String(input.label ?? input.id), bodies: [...bodies], keep, vary,
    operations: (input.operations || []).map(String), rules, criteria, note: String(input.note ?? ''),
  });
}

export function assertFormSpace(space) {
  if (!space || space.schema !== FORMSPACE_SCHEMA || !Array.isArray(space.keep) || !Array.isArray(space.vary) || !Array.isArray(space.rules) || !Array.isArray(space.criteria)) fail('formspace.invalid', 'Das ist kein Formraum.');
  return space;
}

/** key → 'keep' | 'vary' | null. `keep` wins is impossible by construction: a selector is in one list only;
 *  a more specific selector (`timing.duration`) is tested before a class selector (`timing`). */
export function ruleFor(space) {
  if (!space) return () => null;
  assertFormSpace(space);
  const rules = [...space.keep.map(k => [k.select, 'keep']), ...space.vary.map(v => [v.select, 'vary'])]
    .sort((a, b) => b[0].split('.').length - a[0].split('.').length);
  return key => (rules.find(([select]) => selectorMatches(select, key)) || [null, null])[1];
}

/** Check a form space against one transformation outcome: first what always holds (body, operation),
 *  then the conditions it lists, then its design rules. Four answers: held, violated, unexamined, and
 *  not-applicable where a condition has nothing to speak about in this body. */
export function checkFormSpace(space, { bodyType, body = null, operation = null, diff, observation, source, rule = ruleFor(space) }) {
  assertFormSpace(space);
  const observed = observation.assertions, blind = observation.unexamined || [];
  const answer = (item, kind) => (status, detail) => ({ id: item.id, label: item.label, kind, status, detail });
  const list = [];
  if (!space.criteria.some(criterion => criterion.kind === 'body-allowed')) {
    const out = answer({ id: 'formraum-koerper', label: 'Der Körper ist im Formraum vorgesehen' }, 'body-allowed');
    list.push(space.bodies.includes(bodyType) ? out('held', 'Körper ' + bodyType + ' ist im Formraum vorgesehen.') : out('violated', 'Körper ' + bodyType + ' ist im Formraum nicht vorgesehen.'));
  }
  if (space.operations.length && operation !== null) {
    const out = answer({ id: 'formraum-operation', label: 'Die Operation ist im Formraum vorgesehen' }, 'operation-allowed');
    list.push(space.operations.includes(operation) ? out('held', 'Operation ' + operation + ' ist im Formraum vorgesehen.') : out('violated', 'Operation ' + operation + ' ist im Formraum nicht vorgesehen.'));
  }
  for (const criterion of space.criteria) {
    const out = answer(criterion, criterion.kind);
    if (criterion.kind === 'body-allowed') {
      list.push(space.bodies.includes(bodyType) ? out('held', 'Körper ' + bodyType + ' ist im Formraum vorgesehen.') : out('violated', 'Körper ' + bodyType + ' ist im Formraum nicht vorgesehen.'));
    } else if (criterion.kind === 'kept-retained') {
      const kept = key => rule(key) === 'keep';
      const broken = [...diff.changed, ...diff.lost].filter(entry => kept(entry.key)).map(entry => entry.key);
      const extra = diff.added.filter(entry => kept(entry.key)).map(entry => entry.key);
      const open = diff.unexamined.filter(entry => kept(entry.key)).map(entry => entry.key);
      const wanted = source.filter(item => kept(item.key)).length;
      list.push(broken.length || extra.length ? out('violated', 'Nicht erhalten: ' + [...broken, ...extra].join(', '))
        : open.length ? out('unexamined', 'Nicht prüfbar: ' + open.join(', '))
        : !wanted ? out('not-applicable', 'Der Ursprung weist nichts zu Bewahrendes aus.')
        : out('held', wanted + ' zu bewahrende Eigenschaften sind im Körper wiedergefunden.'));
    } else if (criterion.kind === 'relations-connect-shown-terms') {
      const relations = observed.filter(item => /^relation:[^.]+$/.test(item.key));
      if (blind.some(entry => entry.select === 'relation' || entry.select === 'term')) { list.push(out('unexamined', 'Beziehungen oder Begriffe waren nicht prüfbar.')); continue; }
      if (!relations.length) { list.push(out('not-applicable', 'Der Körper zeigt keine Beziehung.')); continue; }
      const shown = new Set(observed.filter(item => /^(term|title|claim|source)[:.]/.test(item.key)).map(item => item.about?.partId).filter(Boolean));
      const loose = relations.filter(item => !shown.has(item.value.from) || !shown.has(item.value.to)).map(item => item.key);
      list.push(loose.length ? out('violated', 'Beziehung ohne gezeigtes Ende: ' + loose.join(', ')) : out('held', 'Jede der ' + relations.length + ' Beziehungen im Körper verbindet Teile, die im Körper stehen.'));
    } else if (criterion.kind === 'source-shown') {
      const wanted = source.filter(item => /^source:/.test(item.key)).length;
      if (!wanted) { list.push(out('not-applicable', 'Das Werkstück weist in dieser Lesart keine Quelle aus.')); continue; }
      const kept = diff.retained.filter(item => /^source:/.test(item.key)).length, open = diff.unexamined.filter(item => /^source:/.test(item.key)).length;
      list.push(kept === wanted ? out('held', kept + ' von ' + wanted + ' Quellenangaben stehen im Körper.')
        : kept + open === wanted ? out('unexamined', open + ' von ' + wanted + ' Quellenangaben waren nicht prüfbar.')
        : out('violated', kept + ' von ' + wanted + ' Quellenangaben stehen im Körper.'));
    } else {
      if (body && !body.temporal) { list.push(out('not-applicable', 'Der Körper hat keine eigene Zeit.')); continue; }
      const total = observed.find(item => item.key === 'duration.total');
      list.push(!total ? out('unexamined', 'Der Körper hat keine beobachtete Gesamtdauer.')
        : total.value >= criterion.min && total.value <= criterion.max ? out('held', total.value + ' s liegt zwischen ' + criterion.min + ' und ' + criterion.max + ' s.')
        : out('violated', total.value + ' s liegt nicht zwischen ' + criterion.min + ' und ' + criterion.max + ' s.'));
    }
  }
  for (const item of space.rules) {
    const out = answer(item, 'rule-' + item.kind);
    const hits = observed.filter(entry => selectorMatches(item.select, entry.key));
    if (!hits.length) {
      list.push(blind.some(entry => entry.select === item.select || entry.select === item.select.split('.')[0]) ? out('unexamined', 'Die Eigenschaft war im Körper nicht prüfbar.')
        : out('not-applicable', 'Der Körper weist diese Eigenschaft nicht aus.'));
      continue;
    }
    const fits = value => item.kind === 'one-of' ? item.values.some(allowed => sameValue(allowed, value)) : typeof value === 'number' && value >= item.min - 1e-9 && value <= item.max + 1e-9;
    const off = hits.filter(entry => !(Array.isArray(entry.value) ? entry.value.every(fits) : fits(entry.value)));
    list.push(off.length ? out('violated', off.map(entry => entry.key + ' = ' + JSON.stringify(entry.value)).join(', ') + ' liegt außerhalb der Regel.')
      : out('held', hits.length === 1 ? 'Der beobachtete Wert liegt innerhalb der Regel.' : hits.length + ' beobachtete Werte liegen innerhalb der Regel.'));
  }
  return list;
}
