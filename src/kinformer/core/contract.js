/* KiNFORMER core · Transformationsvertrag.
 *
 * TransformationRequest : what is asked, against which work and revision, for which body.
 * TransformationResult  : what was produced, what stayed, changed, came in addition and was lost,
 *                         by which engine, with which provenance — and that it is produced, not confirmed.
 * The contract names no engine. An engine is referenced by its descriptor only. */

import { fail, freeze, copy, digestOf, isSha256, isPlain } from './hash.js';
import { isBodyType } from './bodies.js';

export const REQUEST_SCHEMA = 'kinformer-transformation-request/1';
export const RESULT_SCHEMA = 'kinformer-transformation-result/1';

export const INTENTS = freeze({
  embody: 'Dem Werk einen weiteren Körper geben; nichts soll entfallen.',
  condense: 'Verdichten; ausdrücklich benannte Auslassungen sind erlaubt.',
  render: 'Einen strukturierten Körper flach ausgeben.',
  examine: 'Einen vorhandenen Körper gegen das Werk prüfen; es wird nichts erzeugt.',
});

export const CONSTRAINT_TYPES = freeze(['max-duration', 'omit']);
export const REVERSIBLE = freeze([true, false, 'partial', 'unknown']);

const selector = value => typeof value === 'string' && /^[a-z][a-z-]*(\.[a-zA-Z]+)?$/.test(value);

export function createRequest(input) {
  if (!isPlain(input)) fail('request.shape', 'Ein Transformationsauftrag braucht Angaben.');
  const ref = input.sourceArtifact, rev = input.sourceRevision;
  if (!isPlain(ref) || typeof ref.workpieceId !== 'string' || !ref.workpieceId || typeof ref.materialId !== 'string' || !ref.materialId || !isSha256(ref.sourceSha256))
    fail('request.source', 'Der Auftrag braucht Werkstück, Original und Quellhash.');
  if (!isPlain(rev) || !Number.isInteger(rev.revision) || rev.revision < 0) fail('request.revision', 'Der Auftrag braucht die Fassung des Werkstücks, auf die er sich bezieht.');
  if (!isBodyType(input.targetBody)) fail('request.body', 'Der Auftrag nennt keinen bekannten Zielkörper.');
  const intent = typeof input.intent === 'string' ? { kind: input.intent } : input.intent;
  if (!isPlain(intent) || !Object.prototype.hasOwnProperty.call(INTENTS, intent.kind)) fail('request.intent', 'Der Auftrag braucht eine bekannte Absicht.');
  const constraints = (input.constraints || []).map(constraint => {
    if (!isPlain(constraint) || !CONSTRAINT_TYPES.includes(constraint.type)) fail('request.constraint', 'Unbekannte Bedingung im Auftrag.');
    if (constraint.type === 'max-duration' && !(Number.isFinite(constraint.seconds) && constraint.seconds > 0)) fail('request.constraint', 'Die Höchstdauer braucht Sekunden.');
    if (constraint.type === 'omit' && !selector(constraint.select)) fail('request.constraint', 'Eine Auslassung braucht eine Auswahl.');
    return copy(constraint);
  });
  if (constraints.some(c => c.type === 'omit') && intent.kind === 'embody')
    fail('request.intent', 'Eine Auslassung verlangt die Absicht „condense“; „embody“ lässt nichts entfallen.');
  const invariants = input.requestedInvariants || [];
  if (!Array.isArray(invariants) || !invariants.every(selector)) fail('request.invariants', 'Verlangte Invarianten sind Auswahlen wie „term“ oder „relation“.');
  for (const constraint of constraints) if (constraint.type === 'omit' && invariants.some(wanted => wanted.split('.')[0] === constraint.select.split('.')[0]))
    fail('request.contradiction', 'Der Auftrag verlangt „' + constraint.select + '“ zugleich als Invariante und als Auslassung.');
  const space = input.formSpace ?? null;
  if (space !== null && (!isPlain(space) || typeof space.id !== 'string' || !Number.isInteger(space.version))) fail('request.formspace', 'Der Auftrag nennt einen Formraum mit Kennung und Version.');
  if (input.engine !== undefined && input.engine !== null && typeof input.engine !== 'string') fail('request.engine', 'Eine gewünschte Engine wird mit ihrer Kennung genannt.');
  return freeze({
    schema: REQUEST_SCHEMA,
    sourceArtifact: { workpieceId: ref.workpieceId, materialId: ref.materialId, sourceSha256: ref.sourceSha256 },
    sourceRevision: { revision: rev.revision },
    targetBody: input.targetBody,
    intent: { kind: intent.kind, note: String(intent.note ?? '') },
    constraints,
    requestedInvariants: [...invariants],
    formSpace: space === null ? null : { id: space.id, version: space.version },
    engine: input.engine ?? null,
    parameters: copy(input.parameters ?? {}),
  });
}

export function assertRequest(request) {
  if (!isPlain(request) || request.schema !== REQUEST_SCHEMA) fail('request.schema', 'Das ist kein Transformationsauftrag.');
  createRequest(request);
  return request;
}

export const requestSha256 = request => digestOf(request);

const LISTS = ['retained', 'changed', 'added', 'lost', 'unexamined'];

/** Shape check for a finished result. A machine-made result is produced, never confirmed or adopted. */
export function assertResult(result) {
  const bad = message => fail('result.shape', message);
  if (!isPlain(result) || result.schema !== RESULT_SCHEMA) bad('Das ist kein Transformationsergebnis.');
  if (typeof result.id !== 'string' || !/^tr-[a-f0-9]{16}$/.test(result.id)) bad('Das Ergebnis hat keine stabile Kennung.');
  for (const key of ['workpieceId', 'materialId']) if (typeof result.source?.[key] !== 'string' || !result.source[key]) bad('Dem Ergebnis fehlt der Ursprung.');
  if (!isSha256(result.source.sourceSha256)) bad('Dem Ergebnis fehlt der Quellhash.');
  if (!Number.isInteger(result.sourceRevision?.revision)) bad('Dem Ergebnis fehlt die Quellfassung.');
  if (!isPlain(result.output) || typeof result.output.id !== 'string' || !isSha256(result.output.structuralSha256)) bad('Dem Ergebnis fehlt die Ausgabe.');
  if (result.output.id === result.source.workpieceId) bad('Die Ausgabe darf nicht die Kennung des Ursprungs tragen.');
  if (!isBodyType(result.bodyType)) bad('Dem Ergebnis fehlt der Körper.');
  if (!isPlain(result.engine) || typeof result.engine.id !== 'string' || typeof result.engine.version !== 'string') bad('Dem Ergebnis fehlt die Engine mit Version.');
  for (const key of LISTS) if (!Array.isArray(result[key])) bad('Dem Ergebnis fehlt die Liste „' + key + '“.');
  if (!Array.isArray(result.provenance) || !result.provenance.length) bad('Dem Ergebnis fehlt die Herkunft.');
  if (!Array.isArray(result.operations) || !result.operations.length) bad('Dem Ergebnis fehlen die Operationen.');
  if (!REVERSIBLE.includes(result.reversible)) bad('Die Rückführbarkeit ist nicht ausgewiesen.');
  const status = result.status;
  if (!isPlain(status) || status.generated !== true || status.confirmed !== false || status.adopted !== false || status.humanAcceptance !== 'pending')
    bad('Ein erzeugtes Ergebnis ist weder bestätigt noch übernommen.');
  if (!isPlain(result.seal) || !isSha256(result.seal.sha256)) bad('Dem Ergebnis fehlt das Siegel über seinen Inhalt.');
  if (!isPlain(result.fulfilment) || ![true, false, null].includes(result.fulfilment.fulfilled)) bad('Dem Ergebnis fehlt die Angabe, ob der Auftrag erfüllt ist.');
  if ((result.engine.checkedByEngine || status.engineChecked) && !isPlain(result.engineCheck)) bad('„Von der Engine geprüft“ braucht ein beiliegendes Prüfprotokoll.');
  if (result.confidence !== null) bad('Eine Zahl für Verlässlichkeit ist nicht belegt und wird nicht ausgegeben.');
  return result;
}
