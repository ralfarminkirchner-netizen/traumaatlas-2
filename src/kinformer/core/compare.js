/* KiNFORMER core · Zwei Stände desselben Werks vergleichen.
 * Answers the question of the mutation test on the work model: did a change touch the form or the meaning?
 * A state is a workpiece revision under a reading, plus the body parameters of a request. */

import { canonical } from './hash.js';
import { project, formState } from './reading.js';
import { sourceAssertions, parameterAssertions, diffStates, classify } from './properties.js';
import { ruleFor } from './formspace.js';

export function stateAssertions({ workpiece, reading, parameters = {} }) {
  return [...sourceAssertions(project(workpiece, reading), formState(workpiece, reading)), ...parameterAssertions(parameters)];
}

/** → {diff, statement, outOfScope}. `statement.kind` is 'none' | 'form' | 'form-open' | 'open' | 'meaning'.
 *  The comparison covers the reading. What lies outside it is not judged; whether it differs is reported. */
export function compareStates(before, after, formSpace = null) {
  const diff = diffStates(stateAssertions(before), stateAssertions(after));
  const outside = ({ workpiece, reading }) => {
    const scope = project(workpiece, reading).outOfScope, steps = formState(workpiece, reading).outOfScope.sequenceSteps;
    const content = { parts: workpiece.parts.filter(part => scope.parts.includes(part.id)), relations: (workpiece.relations || []).filter(relation => scope.relations.includes(relation.id)),
      steps: steps.map(index => workpiece.sequence[index]), gestures: workpiece.gestures ?? [], code: workpiece.code ?? null };
    return { summary: { ...scope, sequenceSteps: steps }, content: canonical(content) };
  };
  const a = outside(before), b = outside(after);
  return { diff, statement: classify(diff, ruleFor(formSpace)), outOfScope: { before: a.summary, after: b.summary, differs: a.content !== b.content } };
}
