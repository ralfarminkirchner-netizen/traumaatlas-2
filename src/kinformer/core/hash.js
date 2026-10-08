/* KiNFORMER core · canonical JSON and SHA-256.
 * Runs unchanged in the browser and in Node (WebCrypto). No engine knowledge, no clock, no randomness. */

export class KinformerError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'KinformerError';
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

export const fail = (code, message, detail) => { throw new KinformerError(code, message, detail); };

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Deterministic JSON text: object keys sorted, arrays in order, `undefined` members dropped.
 *  Non-finite numbers, functions, symbols and cycles are rejected instead of being silently altered. */
export function canonical(value) {
  const seen = new Set();
  const walk = current => {
    if (current === null) return 'null';
    const type = typeof current;
    if (type === 'string') return JSON.stringify(current);
    if (type === 'boolean') return current ? 'true' : 'false';
    if (type === 'number') {
      if (!Number.isFinite(current)) fail('hash.non-finite', 'Eine Zahl ohne endlichen Wert lässt sich nicht stabil festhalten.');
      return JSON.stringify(current);
    }
    if (type !== 'object') fail('hash.unsupported', 'Dieser Wert lässt sich nicht stabil festhalten: ' + type);
    if (seen.has(current)) fail('hash.cycle', 'Ein Kreisbezug lässt sich nicht stabil festhalten.');
    seen.add(current);
    let text;
    if (Array.isArray(current)) text = '[' + current.map(item => item === undefined ? 'null' : walk(item)).join(',') + ']';
    else {
      text = '{' + Object.keys(current).filter(key => current[key] !== undefined).sort()
        .map(key => JSON.stringify(key) + ':' + walk(current[key])).join(',') + '}';
    }
    seen.delete(current);
    return text;
  };
  return walk(value);
}

export const utf8 = text => new TextEncoder().encode(String(text));

/** SHA-256 over the UTF-8 bytes of a text or over given bytes; lowercase hex.
 *  Same computation the workplace uses for a text original (formformer.js, `prepare`). */
export async function sha256Hex(input) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) fail('hash.no-webcrypto', 'SHA-256 ist in dieser Umgebung nicht verfügbar.');
  const bytes = typeof input === 'string' ? utf8(input) : input;
  const digest = new Uint8Array(await subtle.digest('SHA-256', bytes));
  let hex = '';
  for (const byte of digest) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

/** SHA-256 of the canonical JSON text of a value. */
export const digestOf = async value => sha256Hex(canonical(value));

export const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

/** Deep copy through canonical JSON: the copy carries no shared references and no `undefined`. */
export const copy = value => JSON.parse(canonical(value));

/** Deep freeze, so a caller cannot change an input or a finished record afterwards. */
export function freeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) freeze(value[key]);
  }
  return value;
}

export const isPlain = plain;
