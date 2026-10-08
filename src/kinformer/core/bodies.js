/* KiNFORMER core · Körper (bodies).
 * A body is a way a work can exist. A work may have several bodies; a new body is not a new work identity.
 * The register describes kinds of bodies and their traits. It names no engine. */

import { fail, freeze } from './hash.js';

export const BODY_SCHEMA = 'kinformer-body/1';

const define = (label, traits) => ({ label, ...traits });

/** Traits:
 *  temporal    – the body has its own time axis
 *  interactive – the body answers to input while it is shown
 *  structured  – parts stay addressable and editable (a flat body is pixels or samples only)
 *  channel     – 'visual' | 'audio' | 'audiovisual' */
export const BODY_TYPES = freeze({
  'text':          define('Text',                { temporal: false, interactive: false, structured: true,  channel: 'visual' }),
  'document':      define('Dokument',            { temporal: false, interactive: false, structured: true,  channel: 'visual' }),
  'poster':        define('Plakat',              { temporal: false, interactive: false, structured: true,  channel: 'visual' }),
  'diagram':       define('Schaubild',           { temporal: false, interactive: false, structured: true,  channel: 'visual' }),
  'graph':         define('Graph',               { temporal: false, interactive: false, structured: true,  channel: 'visual' }),
  'web-interface': define('Web-Oberfläche',      { temporal: false, interactive: true,  structured: true,  channel: 'visual' }),
  'interactive':   define('Interaktive Fassung', { temporal: true,  interactive: true,  structured: true,  channel: 'audiovisual' }),
  'animation':     define('Animation',           { temporal: true,  interactive: false, structured: true,  channel: 'visual' }),
  'video':         define('Video',               { temporal: true,  interactive: false, structured: false, channel: 'audiovisual' }),
  'audio':         define('Klang',               { temporal: true,  interactive: false, structured: false, channel: 'audio' }),
  'game-scene':    define('Spielszene',          { temporal: true,  interactive: true,  structured: true,  channel: 'audiovisual' }),
});

export const isBodyType = id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(BODY_TYPES, id);

export function bodyType(id) {
  if (!isBodyType(id)) fail('body.unknown', 'Diesen Körper kennt KiNFORMER nicht: ' + String(id));
  return { id, schema: BODY_SCHEMA, ...BODY_TYPES[id] };
}

/** Where the seven existing working forms of the workshop point to. A hint for later wiring,
 *  not an equation: a working form is a lens on one workpiece, a body is a produced existence of it. */
export const WORKING_FORM_HINTS = freeze({
  read: ['text', 'document'],
  compose: ['poster', 'document'],
  space: ['game-scene'],
  sound: ['audio'],
  relations: ['diagram', 'graph'],
  time: ['animation', 'video'],
  code: ['web-interface', 'interactive'],
});
