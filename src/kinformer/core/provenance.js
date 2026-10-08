/* KiNFORMER core · Herkunft und Stand.
 *
 * One record per transformation step, shaped after the PROV triple (what was used, by which activity,
 * what was generated). The relation is always a derivation. A transformation is not an adoption
 * (Übernahme), and a produced version is not a confirmed version. */

import { fail, freeze, copy, isSha256 } from './hash.js';

export const PROVENANCE_SCHEMA = 'kinformer-provenance/1';

export function provenanceRecord({ operation, tool, at, parameters, parametersSha256, used, generated }) {
  if (typeof operation !== 'string' || !operation) fail('provenance.operation', 'Die Herkunft braucht eine Operation.');
  if (!tool || typeof tool.id !== 'string' || typeof tool.version !== 'string') fail('provenance.tool', 'Die Herkunft braucht Werkzeug und Werkzeugversion.');
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) fail('provenance.time', 'Die Herkunft braucht einen Zeitpunkt.');
  if (!isSha256(parametersSha256)) fail('provenance.parameters', 'Die Herkunft braucht den Hash der Parameter.');
  if (!Array.isArray(used) || !used.length || !Array.isArray(generated) || !generated.length) fail('provenance.entities', 'Die Herkunft braucht Eingaben und Ausgaben.');
  return freeze({
    schema: PROVENANCE_SCHEMA,
    relation: 'derived-from',
    activity: { operation, at, tool: copy(tool), parameters: copy(parameters ?? {}), parametersSha256 },
    used: copy(used),
    generated: copy(generated),
    agent: { kind: 'machine', id: tool.id },
  });
}

/** The state every machine-made result starts in. No function here moves it forward:
 *  confirmation and adoption are human steps that the existing workplace handles on its own path. */
export const initialStatus = () => ({
  generated: true,
  engineChecked: false,
  confirmed: false,
  adopted: false,
  humanAcceptance: 'pending',
  evaluation: 'Noch keine menschliche Bewertung oder Übernahme.',
});

/** Limits of the existing KiNTEGRiTY route for a draft attached to a version
 *  (POST /api/versions/{id}/visuals): a JSON object of at most 100000 bytes, nested at most
 *  12 deep, keys of at most 100 characters, and neither "blob:" nor "data:" anywhere in it. */
export const REGISTER_LIMITS = Object.freeze({ bytes: 100000, depth: 12, keyLength: 100, forbidden: Object.freeze(['blob:', 'data:']) });

/** Flat record of the facts a later register entry needs: origin, hash, version, tool, tool version,
 *  operation, time, inputs, parameters, output, and the relation between input and output.
 *  Nothing is sent anywhere. The three closing fields use the words of the existing KiN result envelope. */
export function registerEnvelope(result) {
  const step = result.provenance[result.provenance.length - 1];
  return freeze({
    schema: 'kinformer-register-envelope/1',
    origin: { ...copy(result.source), revision: result.sourceRevision.revision },
    originDigests: copy(result.sourceRevision),
    tool: step.activity.tool.id,
    toolVersion: step.activity.tool.version,
    operation: step.activity.operation,
    at: step.activity.at,
    inputs: copy(step.used),
    parameters: copy(step.activity.parameters),
    parametersSha256: step.activity.parametersSha256,
    output: { id: result.output.id, bodyType: result.bodyType, sha256: result.output.structuralSha256,
      files: result.output.representation.files.map(file => ({ path: file.path, bytes: file.bytes, sha256: file.sha256 })) },
    relation: step.relation,
    transformationId: result.id,
    balance: { retained: result.retained.length, changed: result.changed.map(entry => entry.key), added: result.added.length,
      lost: result.lost.map(entry => entry.key), unexamined: result.unexamined.length },
    meaning: result.statement.meaning,
    newVersionRequired: result.version.newVersionRequired,
    claim_ceiling: result.statement.ceiling,
    human_accepted: false,
    executed_by_kin: false,
  });
}

/** Would this envelope pass the limits of the existing register route? → {ok, problems}. */
export function fitsRegister(envelope) {
  const problems = [], text = JSON.stringify(envelope);
  if (new TextEncoder().encode(text).length > REGISTER_LIMITS.bytes) problems.push('größer als ' + REGISTER_LIMITS.bytes + ' Bytes');
  for (const word of REGISTER_LIMITS.forbidden) if (text.includes(word)) problems.push('enthält „' + word + '“');
  const walk = (value, depth) => {
    if (value === null || typeof value !== 'object') return;
    if (depth > REGISTER_LIMITS.depth) { if (!problems.includes('zu tief verschachtelt')) problems.push('zu tief verschachtelt'); return; }
    for (const [key, inner] of Object.entries(value)) {
      if (!Array.isArray(value) && key.length > REGISTER_LIMITS.keyLength && !problems.includes('zu langer Schlüssel')) problems.push('zu langer Schlüssel');
      walk(inner, depth + 1);
    }
  };
  walk(envelope, 1);
  return { ok: !problems.length, problems };
}
