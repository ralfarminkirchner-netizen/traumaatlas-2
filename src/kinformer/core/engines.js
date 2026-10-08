/* KiNFORMER core · Engine-Grenze und Transformationsablauf.
 *
 *   workpiece ─► request ─► engine.transform ─► structured representation
 *                                │
 *                                └─► engine.inspect ─► observation ─► assess ─► TransformationResult
 *
 * The core decides what was retained, changed, added and lost. An engine only produces a representation
 * and reads one back. Its own word about its output is not taken: the result rests on the observation.
 * This file imports no engine and knows none by name. */

import { fail, freeze, copy, digestOf, sha256Hex, utf8, isPlain, isSha256 } from './hash.js';
import { bodyType as describeBody, isBodyType } from './bodies.js';
import { bindingOf, project, formState, originFidelity } from './reading.js';
import { assertion, sourceAssertions, diffAssertions, classify, selectorMatches, parseKey, withCoreAspects, ASSERTION_SCHEMA, NORMALIZATION } from './properties.js';
import { assertFormSpace, ruleFor, checkFormSpace } from './formspace.js';
import { RESULT_SCHEMA, assertRequest, assertResult } from './contract.js';
import { provenanceRecord, initialStatus } from './provenance.js';

export const ENGINE_SCHEMA = 'kinformer-engine/1';
/** Counts up whenever the stated properties or the rules of judgement change. Part of every result and of its identifier. */
export const CORE_MODEL = 'kinformer-core/2';

/** What every engine adapter must offer. */
export function assertEngine(adapter) {
  const d = adapter?.descriptor;
  if (!isPlain(d) || d.schema !== ENGINE_SCHEMA || typeof d.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(d.id) || typeof d.name !== 'string'
    || typeof d.version !== 'string' || !d.version || !Array.isArray(d.bodies) || !d.bodies.length || !d.bodies.every(isBodyType)
    || typeof d.representation !== 'string')
    fail('engine.descriptor', 'Die Engine beschreibt sich nicht vollständig (Kennung, Name, Version, Körper, Darstellungsart).');
  if (typeof adapter.transform !== 'function' || typeof adapter.inspect !== 'function')
    fail('engine.interface', 'Eine Engine braucht transform() und inspect().');
  return adapter;
}

export function createEngineRegistry() {
  const engines = new Map();
  return Object.freeze({
    register(adapter) {
      assertEngine(adapter);
      if (engines.has(adapter.descriptor.id)) fail('engine.duplicate', 'Diese Engine ist bereits angemeldet: ' + adapter.descriptor.id);
      engines.set(adapter.descriptor.id, adapter);
      return this;
    },
    get(id) {
      const adapter = engines.get(id);
      if (!adapter) fail('engine.missing', 'Diese Engine ist nicht angemeldet: ' + String(id));
      return adapter;
    },
    forBody(body) { return [...engines.values()].filter(adapter => adapter.descriptor.bodies.includes(body)); },
    list() { return [...engines.values()].map(adapter => copy(adapter.descriptor)); },
  });
}

function assertRepresentation(representation, descriptor) {
  if (!isPlain(representation) || representation.kind !== descriptor.representation || typeof representation.entry !== 'string'
    || !Array.isArray(representation.files) || !representation.files.length)
    fail('engine.representation', 'Die Engine hat keine Darstellung der angekündigten Art geliefert.');
  const paths = new Set();
  for (const file of representation.files) {
    // a file is given as text, as bytes, or (when it lies elsewhere, like a rendered video) by hash and size
    const carried = typeof file?.text === 'string' || file?.bytes instanceof Uint8Array || (isSha256(file?.sha256) && Number.isInteger(file?.byteLength) && file.byteLength >= 0);
    if (!isPlain(file) || typeof file.path !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(file.path) || file.path.includes('..') || !carried || paths.has(file.path))
      fail('engine.representation', 'Die Darstellung enthält eine ungültige oder doppelte Datei.');
    paths.add(file.path);
  }
  if (!paths.has(representation.entry)) fail('engine.representation', 'Der Darstellung fehlt ihre Einstiegsdatei.');
  for (const asset of representation.assets || [])
    if (!isPlain(asset) || typeof asset.path !== 'string' || typeof asset.role !== 'string') fail('engine.representation', 'Ein mitgeführtes Hilfsmittel ist unvollständig beschrieben.');
}

function assertObservation(observation) {
  if (!isPlain(observation) || !Array.isArray(observation.assertions)) fail('engine.observation', 'Die Engine hat keine Beobachtung geliefert.');
  const keys = new Set();
  for (const item of observation.assertions) {
    assertion(item.key, item.aspect, item.value);
    if (keys.has(item.key)) fail('engine.observation', 'Die Beobachtung nennt eine Eigenschaft doppelt: ' + item.key);
    keys.add(item.key);
  }
  for (const entry of observation.unexamined || [])
    if (!isPlain(entry) || typeof entry.select !== 'string' || typeof entry.reason !== 'string') fail('engine.observation', 'Ungeprüftes braucht Auswahl und Grund.');
}

const LISTS = ['retained', 'changed', 'added', 'lost', 'unexamined'];
const isTrait = key => parseKey(key).cls === 'body';
const strip = ({ key, aspect, value, about }) => about ? { key, aspect, value: copy(value), about: copy(about) } : { key, aspect, value: copy(value) };

/** What the origin states, read from a finished result: every property with the value it had at the origin. */
export function statedOf(result) {
  return [...result.retained.map(strip), ...result.changed.map(entry => strip({ ...entry, value: entry.from })), ...result.lost.map(strip), ...result.unexamined.map(strip)]
    .filter(item => !isTrait(item.key)).sort((x, y) => x.key < y.key ? -1 : x.key > y.key ? 1 : 0);
}

/** The second link of a chain is judged against the origin, not against the link before it. What an earlier
 *  link lost or changed stays lost or changed unless this body was examined and shows otherwise; what an
 *  earlier link introduced and this body does not show readably is listed as unexamined. A later link can
 *  therefore never come out more favourable than the one it was made from. */
function carry(diff, previous) {
  const where = key => LISTS.find(name => diff[name].some(entry => entry.key === key));
  const move = (key, into, entry) => { for (const name of LISTS) diff[name] = diff[name].filter(item => item.key !== key); diff[into].push(entry); };
  for (const entry of previous.lost) if (!isTrait(entry.key) && ['unexamined', 'lost'].includes(where(entry.key))) move(entry.key, 'lost', { ...strip(entry), carriedFrom: previous.id });
  for (const entry of previous.changed) if (!isTrait(entry.key) && where(entry.key) === 'unexamined')
    move(entry.key, 'changed', { key: entry.key, aspect: entry.aspect, from: copy(entry.from), to: copy(entry.to), ...(entry.reduced ? { reduced: true } : {}), ...(entry.about ? { about: copy(entry.about) } : {}), carriedFrom: previous.id });
  for (const entry of previous.added) if (!where(entry.key))
    diff.unexamined.push({ ...strip(entry), reason: 'Vom vorangehenden Schritt eingeführt; in diesem Körper nicht gelesen.', introducedBy: previous.id });
  for (const name of LISTS) diff[name].sort((x, y) => x.key < y.key ? -1 : x.key > y.key ? 1 : 0);
  return diff;
}

/** A body may say which work and which state of it it was made from. If it names another one, it is not
 *  held against this work: the comparison would describe a body that says it belongs elsewhere. */
function assertOwnBody(observation, binding) {
  const claimed = observation.facts?.claimedOrigin;
  if (claimed && (claimed.workpieceId !== binding.workpieceId || claimed.revision !== binding.revision))
    fail('transform.body-origin', 'Der Körper gibt an, aus einem anderen Werkstück oder einem anderen Bearbeitungsstand entstanden zu sein.');
}

function reversibility(diff, body, origin, outOfScope) {
  const returnPaths = ['Unveränderten Ursprung öffnen: Werkstück ' + origin.workpieceId + ', Bearbeitungsstand ' + origin.revision + '.'];
  const note = 'Ein Rückgriff auf den bewahrten Ursprung ist keine Umkehrung der Transformation.';
  // the trait of the body is no property of the origin and is not counted here
  const own = list => list.filter(entry => !isTrait(entry.key) && !entry.introducedBy).length;
  const retained = own(diff.retained), gone = own(diff.changed) + own(diff.lost), open = own(diff.unexamined);
  const outside = { parts: outOfScope?.parts?.length ?? 0, relations: outOfScope?.relations?.length ?? 0, sequenceSteps: outOfScope?.sequenceSteps?.length ?? 0 };
  const count = (n, one, many) => n ? [n + ' ' + (n === 1 ? one : many)] : [];
  const named = [...count(outside.parts, 'Teil', 'Teile'), ...count(outside.relations, 'Beziehung', 'Beziehungen'), ...count(outside.sequenceSteps, 'Zeitschritt', 'Zeitschritte')];
  const total = outside.parts + outside.relations + outside.sequenceSteps;
  const beyond = total ? ' Die Aussage gilt für die Lesart: ' + (named.length > 1 ? named.slice(0, -1).join(', ') + ' und ' + named.at(-1) : named[0]) + ' des Werkstücks '
    + (total === 1 ? 'liegt außerhalb und ist im Körper nicht enthalten.' : 'liegen außerhalb und sind im Körper nicht enthalten.') : '';
  const out = (value, basis) => ({ value, basis: basis + beyond, scope: 'reading', outsideReading: outside, returnPaths, note });
  if (!body.structured) return out(false, 'Ein flacher Körper trägt keine ansprechbaren Teile; aus ihm lässt sich der Ursprung nicht zurücklesen.');
  const readable = retained === 1 ? '1 Eigenschaft ist zurücklesbar' : retained + ' Eigenschaften sind zurücklesbar';
  const missing = gone === 1 ? '1 ist verändert oder fehlt' : gone + ' sind verändert oder fehlen';
  const unread = open === 1 ? '1 war im Körper nicht prüfbar' : open + ' waren im Körper nicht prüfbar';
  if (!retained) return out(open && !gone ? 'unknown' : false, open && !gone ? 'Wiedergefunden ist keine Eigenschaft des Ursprungs; ' + unread + '.'
    : 'Keine ausgewiesene Eigenschaft des Ursprungs ist im Körper wiedergefunden.');
  if (gone) return out('partial', readable + ', ' + missing + (open ? ', ' + unread : '') + '.');
  if (open) return out('unknown', readable + ', ' + unread + '.');
  return out(true, 'Alle ' + retained + ' ausgewiesenen Eigenschaften des Ursprungs sind im Körper wiedergefunden; Hinzugekommenes ist getrennt ausgewiesen.');
}

function versionDecision(statement) {
  if (statement.meaning === 'changed') return { sameVersion: false, newVersionRequired: true, undecided: false,
    reason: 'Der Körper weicht in ausgewiesenen Bedeutungsträgern oder in zu bewahrenden Eigenschaften ab. Er ist eine neue Fassung, nicht ein weiterer Körper derselben Fassung.' };
  if (statement.meaning === 'unexamined') return { sameVersion: null, newVersionRequired: null, undecided: true,
    reason: 'Ein Teil der Abweichungen ist weder als zu bewahren noch als frei erklärt oder war nicht prüfbar. Ob eine neue Fassung entsteht, ist nicht entschieden.' };
  return { sameVersion: true, newVersionRequired: false, undecided: false,
    reason: 'Alle ausgewiesenen Bedeutungsträger sind unverändert wiedergefunden. Der Körper ist ein weiterer Körper derselben Fassung.' };
}

function invariantReport(selectors, source, diff) {
  return selectors.map(select => {
    const keys = source.filter(item => selectorMatches(select, item.key)).map(item => item.key);
    const hit = list => list.filter(entry => selectorMatches(select, entry.key)).map(entry => entry.key);
    const broken = [...hit(diff.changed), ...hit(diff.lost), ...hit(diff.added)], open = hit(diff.unexamined);
    const status = broken.length ? 'violated' : open.length ? 'unexamined' : !keys.length ? 'not-applicable' : 'held';
    const detail = broken.length ? 'Abweichend: ' + broken.join(', ') : open.length ? 'Nicht prüfbar: ' + open.join(', ')
      : !keys.length ? 'Der Ursprung weist dazu nichts aus.' : keys.length + ' Eigenschaften unverändert wiedergefunden.';
    return { select, status, keys, detail };
  });
}

/** Was the request met? Three-valued, apart from the question of form and meaning:
 *  the intent, every constraint and every requested invariant get their own answer. */
function fulfilment(request, diff, statement, observed, body, invariants) {
  const omits = request.constraints.filter(c => c.type === 'omit').map(c => c.select);
  const permitted = key => omits.some(select => selectorMatches(select, key));
  const constraints = request.constraints.map(constraint => {
    const out = (status, detail) => ({ ...copy(constraint), status, detail });
    if (constraint.type === 'max-duration') {
      if (!body.temporal) return out('not-applicable', 'Der Körper hat keine eigene Zeit.');
      const total = observed.find(item => item.key === 'duration.total');
      if (!total || typeof total.value !== 'number') return out('unexamined', 'Der Körper hat keine beobachtete Gesamtdauer.');
      return total.value <= constraint.seconds + 1e-6 ? out('held', total.value + ' s überschreitet ' + constraint.seconds + ' s nicht.')
        : out('violated', total.value + ' s überschreitet ' + constraint.seconds + ' s.');
    }
    const match = list => list.filter(entry => selectorMatches(constraint.select, entry.key) && !isTrait(entry.key)).map(entry => entry.key);
    const still = [...match(diff.retained), ...match(diff.changed)], open = match(diff.unexamined), gone = match(diff.lost);
    if (still.length) return out('violated', 'Trotz Auslassung im Körper: ' + still.join(', '));
    if (open.length) return out('unexamined', 'Nicht prüfbar: ' + open.join(', '));
    return gone.length ? out('held', 'Ausgelassen: ' + gone.join(', ')) : out('not-applicable', 'Der Ursprung weist dazu nichts aus.');
  });
  // The intent speaks about what the work says. Form the form space leaves free may differ in any body.
  const hard = statement.reasons.filter(reason => reason.verdict === 'meaning' && !(reason.deviation === 'lost' && permitted(reason.key)));
  const soft = statement.reasons.filter(reason => reason.verdict === 'open');
  const allowed = statement.reasons.filter(reason => reason.deviation === 'lost' && permitted(reason.key)).map(reason => reason.key);
  const intent = { kind: request.intent.kind,
    status: hard.length ? 'violated' : soft.length ? 'unexamined' : 'held',
    detail: hard.length ? 'Ohne Erlaubnis abweichend: ' + hard.map(reason => reason.key).join(', ')
      : soft.length ? 'Nicht entschieden: ' + soft.map(reason => reason.key).join(', ')
      : allowed.length ? 'Nur die erlaubten Auslassungen fehlen: ' + allowed.join(', ') : 'Nichts, was das Werk sagt, ist entfallen oder verändert.',
    permittedLoss: allowed };
  const all = [intent.status, ...constraints.map(c => c.status), ...invariants.map(i => i.status)];
  return { fulfilled: all.includes('violated') ? false : all.includes('unexamined') ? null : true, intent, constraints };
}

/** Core judgement: independent of how the body was produced. */
export function assess({ source, observation, request, formSpace = null, origin, previous = null }) {
  assertObservation(observation);
  if (formSpace) assertFormSpace(formSpace);
  const body = describeBody(request.targetBody);
  // which kind a property is, is decided by the core, also for what an engine reports in addition
  const seen = withCoreAspects(observation.assertions.filter(item => !isTrait(item.key)));
  // The trait comes from the body register, not from looking at the output; it is marked as such.
  const trait = value => assertion('body.structured', 'structure', value, { basis: 'body-register' });
  const observed = { assertions: [...seen.assertions, trait(body.structured)], unexamined: observation.unexamined || [] };
  const stated = [...(previous ? statedOf(previous) : withCoreAspects(source.filter(item => !isTrait(item.key))).assertions), trait(true)];
  const diff = diffAssertions(stated, observed);
  if (previous) carry(diff, previous);
  // a requested invariant binds like a kept property of the form space, and before any freedom the form space grants
  const space = ruleFor(formSpace), wanted = request.requestedInvariants;
  const rule = key => wanted.some(select => selectorMatches(select, key)) ? 'keep' : space(key);
  const statement = classify(diff, rule);
  const invariants = invariantReport(wanted, stated, diff);
  return {
    body, diff, statement, invariants,
    fulfilment: fulfilment(request, diff, statement, observed.assertions, body, invariants),
    criteria: formSpace ? checkFormSpace(formSpace, { bodyType: request.targetBody, body, operation: request.intent.kind, diff, observation: observed, source: stated, rule }) : [],
    reversibility: reversibility(diff, body, origin, observation.outOfScope),
    version: versionDecision(statement),
    stated, unknownClasses: seen.unknownClasses,
  };
}

async function hashFiles(files) {
  const list = [];
  for (const file of files) {
    const bytes = file.bytes instanceof Uint8Array ? file.bytes : utf8(file.text);
    const sha256 = file.sha256 ?? await sha256Hex(bytes);
    if (!isSha256(sha256)) fail('engine.representation', 'Eine Datei der Darstellung hat keinen gültigen Hash.');
    list.push({ path: file.path, role: file.role ?? 'file', bytes: file.byteLength ?? bytes.length, sha256 });
  }
  return list.sort((a, b) => a.path < b.path ? -1 : 1);
}

/** The seal covers every field of a result except the seal itself. The identifier says what a result was
 *  computed from; the seal says that its content is still what was computed. */
async function seal(body) {
  const { seal: _old, ...rest } = body;
  return { ...rest, seal: { algorithm: 'sha256', covers: 'alle Felder außer seal', sha256: await digestOf(rest) } };
}
export async function verifySeal(result) {
  if (!isPlain(result?.seal) || !isSha256(result.seal.sha256)) return false;
  const { seal: _seal, ...rest } = copy(result);
  return result.seal.sha256 === await digestOf(rest);
}

/** Build the TransformationResult from already gathered facts. Used by transform() below and by any
 *  out-of-process step (for example a renderer that runs as a separate program). With `previous`, the
 *  result is a further link of a chain and is judged against the origin of that chain. */
export async function assembleResult({ request, engine, origin, originDigests, source = [], observation, representation, parameters = {},
  operations = [], formSpace = null, previous = null, used = [], limits = [], at, fidelity = null }) {
  assertRequest(request);
  for (const key of ['workpieceId', 'materialId', 'sourceSha256'])
    if (request.sourceArtifact[key] !== origin[key]) fail('result.foreign', 'Auftrag und Ursprung gehören nicht zum selben Werkstück oder Original.');
  if (request.sourceRevision.revision !== origin.revision) fail('result.stale', 'Auftrag und Ursprung gehören nicht zur selben Werkstückfassung.');
  if (request.engine && request.engine !== engine.id) fail('result.engine', 'Der Auftrag verlangt die Engine „' + request.engine + '“, ausgeführt hat „' + engine.id + '“.');
  if (previous) {
    assertResult(previous);
    if (['workpieceId', 'materialId', 'sourceSha256'].some(key => previous.source[key] !== origin[key]) || previous.sourceRevision.revision !== origin.revision)
      fail('result.chain', 'Das vorangehende Ergebnis gehört zu einem anderen Ursprung.');
  }
  assertRepresentation(representation, { representation: representation?.kind });
  const judged = assess({ source, observation, request, formSpace, origin, previous });
  const via = previous ? [...copy(previous.via || []), { resultId: previous.id, outputId: previous.output.id, structuralSha256: previous.output.structuralSha256, bodyType: previous.bodyType }] : [];
  const files = await hashFiles(representation.files);
  const assets = copy(representation.assets || []);
  const structuralSha256 = await digestOf({ kind: representation.kind, entry: representation.entry, files: files.map(f => [f.path, f.sha256]), assets });
  const requestSha = await digestOf(request), parametersSha256 = await digestOf(parameters);
  const outputId = 'out-' + (await digestOf({ structuralSha256, body: request.targetBody, engine: [engine.id, engine.version] })).slice(0, 16);
  // The rules a result was judged by are part of what it is: another form space or another core, another result.
  const formSpaceSha = formSpace ? await digestOf(formSpace) : null;
  const id = 'tr-' + (await digestOf({ core: CORE_MODEL, requestSha, originDigests, outputId, formSpaceSha, via: via.map(v => v.resultId) })).slice(0, 16);
  const when = at ?? new Date().toISOString();
  const { diff } = judged, allowed = judged.fulfilment.intent.permittedLoss;
  const examined = request.intent.kind === 'examine';
  const top = { id: 'op-0', type: request.intent.kind, label: examined ? 'Vorhandenen Körper „' + judged.body.label + '“ prüfen' : 'Körper „' + judged.body.label + '“ erzeugen', parameters: {},
    affects: examined ? 'Erzeugt nichts. Ein vorhandener Körper wird gelesen und gegen den Ursprung gehalten; beide bleiben unverändert.' : 'Erzeugt eine neue Ausgabe. Der Ursprung wird gelesen und nicht verändert.',
    preservation: 'Was erhalten ist, steht unter „retained“ und stammt aus der Beobachtung der Ausgabe.',
    allowedLoss: allowed.length ? 'Vom Auftrag erlaubt und entfallen: ' + allowed.join(', ')
      : request.constraints.some(c => c.type === 'omit') ? 'Der Auftrag erlaubt Auslassungen; entfallen ist davon nichts.' : 'Der Auftrag erlaubt keine Auslassung.' };
  const record = provenanceRecord({
    operation: request.intent.kind, tool: { id: engine.id, name: engine.name, version: engine.version, contract: engine.contract ?? null }, at: when,
    parameters, parametersSha256,
    used: [{ role: 'source', ref: copy(origin), digests: copy(originDigests) }, { role: 'request', sha256: requestSha },
      ...via.map(v => ({ role: 'intermediate', resultId: v.resultId, outputId: v.outputId, sha256: v.structuralSha256 })),
      ...assets.map(asset => ({ ...asset, role: 'asset', assetRole: asset.role })), ...copy(used)],
    generated: [{ role: examined ? 'examined' : 'output', id: outputId, bodyType: request.targetBody, sha256: structuralSha256 }],
  });
  const unknown = judged.unknownClasses.length ? ['Die Beobachtung nennt Eigenschaften einer Klasse, die der Kern nicht kennt (' + judged.unknownClasses.join(', ') + '); ihre Art stammt vom Rückleser, nicht vom Kern.'] : [];
  const result = freeze(await seal({
    schema: RESULT_SCHEMA,
    id,
    model: { core: CORE_MODEL, assertions: ASSERTION_SCHEMA, normalization: NORMALIZATION },
    createdAt: when,
    request: { sha256: requestSha, ...copy(request), fulfilled: judged.fulfilment.fulfilled },
    source: { workpieceId: origin.workpieceId, materialId: origin.materialId, sourceSha256: origin.sourceSha256 },
    sourceRevision: { revision: origin.revision, ...copy(originDigests) },
    originFidelity: fidelity ? copy(fidelity) : null,
    via,
    output: { id: outputId, bodyType: request.targetBody, structuralSha256,
      representation: { kind: representation.kind, entry: representation.entry, files, assets } },
    bodyType: request.targetBody,
    body: judged.body,
    engine: { id: engine.id, name: engine.name, version: engine.version, contract: engine.contract ?? null, license: engine.license ?? null,
      upstream: engine.upstream ?? null, checkedByEngine: false },
    retained: diff.retained, changed: diff.changed, added: diff.added, lost: diff.lost, unexamined: diff.unexamined,
    outOfScope: copy(observation.outOfScope ?? {}),
    invariants: judged.invariants,
    fulfilment: judged.fulfilment,
    formSpace: formSpace ? { id: formSpace.id, version: formSpace.version, sha256: formSpaceSha, criteria: judged.criteria } : null,
    statement: judged.statement,
    operations: [top, ...copy(operations)],
    provenance: [record],
    reversible: judged.reversibility.value,
    reversibility: judged.reversibility,
    version: judged.version,
    status: initialStatus(),
    confidence: null,
    limits: ['Eine Zahl für Verlässlichkeit wird nicht ausgegeben; es gibt dafür keine geeichte Grundlage.', judged.statement.ceiling, ...unknown, ...limits],
  }));
  assertResult(result);
  return result;
}

/** Record that the engine itself has examined the produced body (for example its own lint and check run).
 *  The judgement of the core is not altered; the result only gains the attestation and a new seal.
 *  This is the only way a result comes to say that its engine checked it. */
export async function attachEngineCheck(result, check) {
  assertResult(result);
  if (!isPlain(check) || typeof check.tool !== 'string' || typeof check.version !== 'string' || typeof check.ok !== 'boolean' || typeof check.at !== 'string'
    || !Array.isArray(check.examined) || !check.examined.length)
    fail('engine.check', 'Eine Engine-Prüfung braucht Werkzeug, Version, Ergebnis, Zeitpunkt und die Angabe, was geprüft wurde.');
  const next = copy(result);
  next.engine.checkedByEngine = check.ok;
  next.status.engineChecked = check.ok;
  next.engineCheck = copy(check);
  const sealed = freeze(await seal(next));
  assertResult(sealed);
  return sealed;
}

/** Workpiece + reading + request → structured body + TransformationResult.
 *  The workpiece is deep-copied and frozen before anything reads it: no step can write back to the origin. */
export async function transform({ workpiece, reading, request, engine, registry, formSpace = null, at }) {
  assertRequest(request);
  const origin = freeze(copy(workpiece));
  const binding = bindingOf(origin);
  for (const key of ['workpieceId', 'materialId', 'sourceSha256'])
    if (request.sourceArtifact[key] !== binding[key]) fail('transform.foreign', 'Der Auftrag gehört zu einem anderen Werkstück oder einem anderen Original.');
  if (request.sourceRevision.revision !== binding.revision) fail('transform.stale', 'Der Auftrag gehört zu einer anderen Werkstückfassung.');
  const adapter = assertEngine(engine ?? (request.engine ? registry?.get(request.engine) : registry?.forBody(request.targetBody)[0])
    ?? fail('transform.no-engine', 'Für den Körper „' + request.targetBody + '“ ist keine Engine angemeldet.'));
  const descriptor = adapter.descriptor;
  if (request.engine && request.engine !== descriptor.id) fail('transform.engine', 'Der Auftrag verlangt die Engine „' + request.engine + '“, übergeben wurde „' + descriptor.id + '“.');
  if (!descriptor.bodies.includes(request.targetBody)) fail('transform.body', descriptor.name + ' erzeugt den Körper „' + request.targetBody + '“ nicht.');
  if (formSpace) {
    assertFormSpace(formSpace);
    if (request.formSpace && (request.formSpace.id !== formSpace.id || request.formSpace.version !== formSpace.version))
      fail('transform.formspace', 'Der Auftrag nennt einen anderen Formraum als den übergebenen.');
  } else if (request.formSpace) fail('transform.formspace', 'Der im Auftrag genannte Formraum wurde nicht übergeben.');
  const projection = project(origin, reading), state = formState(origin, reading);
  const source = sourceAssertions(projection, state);
  const produced = await adapter.transform(freeze({ request, projection, formState: state }));
  if (!isPlain(produced)) fail('engine.output', 'Die Engine hat nichts geliefert.');
  assertRepresentation(produced.representation, descriptor);
  const observation = await adapter.inspect(produced.representation);
  assertObservation(observation);
  assertOwnBody(observation, binding);
  const originDigests = { readingSha256: await digestOf(reading), projectionSha256: await digestOf(projection), formStateSha256: await digestOf(state) };
  const beyond = state.workshopLimits.outside;
  const playback = beyond.short.length || beyond.long.length || beyond.total || beyond.steps
    ? ['Die Werkstatt spielt Schritte zwischen ' + state.workshopLimits.stepMin + ' und ' + state.workshopLimits.stepMax + ' Sekunden, zusammen höchstens ' + state.workshopLimits.total + ' Sekunden und '
      + state.workshopLimits.steps + ' Schritte. Die gespeicherte Zeitfolge dieses Werkstücks liegt außerhalb davon. Der Körper folgt den gespeicherten Werten; die Werkstatt würde anders abspielen.'] : [];
  const result = await assembleResult({
    request, engine: descriptor, origin: binding, originDigests, source,
    observation: { ...observation, outOfScope: { ...copy(projection.outOfScope), sequenceSteps: copy(state.outOfScope.sequenceSteps), workshopLimits: copy(beyond) } },
    representation: produced.representation, parameters: produced.parameters ?? {}, operations: produced.operations ?? [],
    formSpace, limits: [...playback, ...(produced.limits ?? [])], at, fidelity: originFidelity(projection),
  });
  return { result, representation: produced.representation, observation, source, projection, formState: state, produced };
}

/** The way back: an existing body is read and held against the work. Nothing is produced. The body may come
 *  from anywhere (written by an engine earlier, changed by hand, made by someone else); the result says
 *  what of the work is found in it. The request names the intent „examine“. */
export async function examine({ workpiece, reading, request, engine, registry, representation, formSpace = null, at }) {
  assertRequest(request);
  if (request.intent.kind !== 'examine') fail('examine.intent', 'Einen vorhandenen Körper prüft ein Auftrag mit der Absicht „examine“.');
  if (request.constraints.length) fail('examine.constraints', 'Beim Prüfen wird nichts erzeugt; Bedingungen an die Erzeugung haben hier keinen Gegenstand.');
  const origin = freeze(copy(workpiece)), binding = bindingOf(origin);
  for (const key of ['workpieceId', 'materialId', 'sourceSha256'])
    if (request.sourceArtifact[key] !== binding[key]) fail('transform.foreign', 'Der Auftrag gehört zu einem anderen Werkstück oder einem anderen Original.');
  if (request.sourceRevision.revision !== binding.revision) fail('transform.stale', 'Der Auftrag gehört zu einer anderen Werkstückfassung.');
  const adapter = assertEngine(engine ?? (request.engine ? registry?.get(request.engine) : registry?.forBody(request.targetBody)[0])
    ?? fail('transform.no-engine', 'Für den Körper „' + request.targetBody + '“ ist keine Engine angemeldet.'));
  const descriptor = adapter.descriptor;
  if (!descriptor.bodies.includes(request.targetBody)) fail('transform.body', descriptor.name + ' liest den Körper „' + request.targetBody + '“ nicht.');
  if (formSpace) assertFormSpace(formSpace);
  if (!!formSpace !== !!request.formSpace || (formSpace && (request.formSpace.id !== formSpace.id || request.formSpace.version !== formSpace.version)))
    fail('transform.formspace', 'Der Auftrag und der übergebene Formraum passen nicht zusammen.');
  assertRepresentation(representation, descriptor);
  const projection = project(origin, reading), state = formState(origin, reading);
  const observation = await adapter.inspect(representation);
  assertObservation(observation);
  assertOwnBody(observation, binding);
  const result = await assembleResult({
    request, engine: descriptor, origin: binding, source: sourceAssertions(projection, state),
    originDigests: { readingSha256: await digestOf(reading), projectionSha256: await digestOf(projection), formStateSha256: await digestOf(state) },
    observation: { ...observation, outOfScope: { ...copy(projection.outOfScope), sequenceSteps: copy(state.outOfScope.sequenceSteps), workshopLimits: copy(state.workshopLimits.outside) } },
    representation, formSpace, at, fidelity: originFidelity(projection),
    limits: ['Dieses Ergebnis beschreibt einen vorhandenen Körper. Wer ihn gemacht hat und wie, steht hier nicht; als Werkzeug ist genannt, womit er gelesen wurde.'],
  });
  return { result, observation, projection, formState: state };
}

/** Does a stored result still describe this workpiece, reading and request? (Same idea as `isCurrent`
 *  in the worksheet comparison: a result is bound to exactly what it was computed from.) */
export async function isCurrent(result, { workpiece, reading, request, formSpace }) {
  const binding = bindingOf(workpiece);
  if (result.model?.core !== CORE_MODEL || !await verifySeal(result)) return false;
  if (formSpace !== undefined && (result.formSpace?.sha256 ?? null) !== (formSpace ? await digestOf(formSpace) : null)) return false;
  if (['workpieceId', 'materialId', 'sourceSha256'].some(key => result.source[key] !== binding[key]) || result.sourceRevision.revision !== binding.revision) return false;
  if (result.request.sha256 !== await digestOf(request)) return false;
  if (result.sourceRevision.readingSha256 !== await digestOf(reading)) return false;
  return result.sourceRevision.projectionSha256 === await digestOf(project(workpiece, reading))
    && result.sourceRevision.formStateSha256 === await digestOf(formState(workpiece, reading));
}
