/* KiNFORMER core · Vorbereitung für GEGENÜBER.
 *
 * Lays several bodies of one origin side by side, property by property. The table says for every
 * stated property of the origin what each body did with it. It keeps apart, as the worksheet comparison
 * already does: agreement between the bodies, preservation against the origin, and what is unexamined. */

import { copy, fail } from './hash.js';
import { ASPECTS, sameValue } from './properties.js';

export const JUXTAPOSITION_SCHEMA = 'kinformer-juxtaposition/1';

export function juxtapose({ origin, source, columns }) {
  if (!Array.isArray(source) || !Array.isArray(columns) || !columns.length) fail('juxtapose.input', 'Zum Gegenüberstellen braucht es den Ursprung und mindestens einen Körper.');
  for (const column of columns)
    if (origin && ['workpieceId', 'materialId', 'sourceSha256'].some(key => column.result.source[key] !== origin[key]) || origin && column.result.sourceRevision.revision !== origin.revision)
      fail('juxtapose.foreign', 'Ein Körper gehört zu einem anderen Ursprung als die übrigen: ' + String(column.id));
  const cells = columns.map(column => {
    const r = column.result, map = new Map();
    for (const item of r.retained) map.set(item.key, { status: 'retained', value: copy(item.value) });
    for (const item of r.changed) map.set(item.key, { status: 'changed', value: copy(item.to) });
    for (const item of r.lost) map.set(item.key, { status: 'lost', value: null });
    for (const item of r.unexamined) map.set(item.key, { status: 'unexamined', value: null, reason: item.reason });
    return map;
  });
  // Three-valued, with a certain No before Unknown: one body that lost or changed a property settles
  // "preserved" as false, however many other bodies could not be examined.
  const rows = source.map(item => {
    const row = cells.map(map => map.get(item.key) ?? { status: 'unexamined', value: null, reason: 'Im Ergebnis nicht aufgeführt.' });
    const examined = row.filter(cell => cell.status !== 'unexamined'), unexamined = row.length - examined.length;
    const differ = examined.some(cell => cell.status !== examined[0].status || !sameValue(cell.value, examined[0].value));
    return { key: item.key, aspect: item.aspect, origin: copy(item.value), cells: row, unexaminedColumns: unexamined,
      mutuallyEqual: differ ? false : unexamined ? null : true,
      preserved: examined.some(cell => cell.status !== 'retained') ? false : unexamined ? null : true };
  });
  // What the bodies brought along themselves (colour, canvas, motion …): one row per property, with the
  // value in every body that has it. This is where two bodies of the same kind differ from each other.
  const addedKeys = [...new Set(columns.flatMap(column => column.result.added.map(item => item.key)))].sort();
  const added = addedKeys.map(key => {
    const found = columns.map(column => column.result.added.find(item => item.key === key) ?? null), present = found.filter(Boolean);
    return { key, aspect: present[0].aspect, cells: found.map(item => item ? { status: 'added', value: copy(item.value) } : { status: 'absent', value: null }),
      mutuallyEqual: present.length < 2 ? null : present.every(item => sameValue(item.value, present[0].value)) };
  });
  // A flat body (a video, a sound) cannot be read; it would turn every summary into "unknown". The summary
  // is therefore drawn over the readable bodies, and the flat ones are named beside it.
  const readable = columns.map((column, index) => column.result.body?.structured === false ? null : index).filter(index => index !== null);
  const flat = columns.filter(column => column.result.body?.structured === false).map(column => column.id);
  const summary = {};
  for (const aspect of ASPECTS) {
    const mine = rows.filter(row => row.aspect === aspect);
    const judge = (row, key) => {
      const cells = readable.map(index => row.cells[index]), examined = cells.filter(cell => cell.status !== 'unexamined'), open = cells.length - examined.length;
      if (!cells.length) return null;
      if (key === 'preserved') return examined.some(cell => cell.status !== 'retained') ? false : open ? null : true;
      return examined.some(cell => cell.status !== examined[0].status || !sameValue(cell.value, examined[0].value)) ? false : open ? null : true;
    };
    const three = key => !mine.length ? null : mine.some(row => judge(row, key) === false) ? false : mine.some(row => judge(row, key) === null) ? null : true;
    summary[aspect] = { properties: mine.length, mutuallyEqual: three('mutuallyEqual'), preserved: three('preserved'),
      unexaminedCells: mine.reduce((sum, row) => sum + readable.filter(index => row.cells[index].status === 'unexamined').length, 0) };
  }
  return {
    schema: JUXTAPOSITION_SCHEMA,
    origin: copy(origin),
    columns: columns.map(({ id, label, result }) => ({ id, label, resultId: result.id, outputId: result.output.id, bodyType: result.bodyType,
      engine: result.engine.id + '@' + result.engine.version, meaning: result.statement.meaning, form: result.statement.form, fulfilled: result.fulfilment.fulfilled, reversible: result.reversible,
      newVersionRequired: result.version.newVersionRequired, added: result.added.map(item => item.key) })),
    rows,
    added,
    summary,
    summaryOver: { readable: readable.map(index => columns[index].id), flat },
    limits: ['Verglichen werden ausgewiesene Eigenschaften, nicht Bildpunkte. Wirkung und Lesbarkeit der Körper sind nicht geprüft.',
      ...(flat.length ? ['Die Zusammenfassung gilt für die lesbaren Körper. Flache Körper (' + flat.join(', ') + ') sind in ihr nicht enthalten; ihre Spalten stehen in der Tabelle.'] : [])],
  };
}
