import assert from 'node:assert/strict';
import {UserContext, MutationIntent} from 'teaql-ts';
import {AbstractSQLTeaQLClient} from 'teaql-ts/sql/core';
import {SQLiteDriver} from 'teaql-ts/sql/sqlite';

/** A refused second owner must not change the admitted graph's Context state. */
export async function verifyFixOwnerAdmission() {
  class Client extends AbstractSQLTeaQLClient {
    constructor() {super(new SQLiteDriver(':memory:'), {});}
  }
  let tick = 1000, release!: () => void, entered!: () => void;
  const context = new UserContext().withBusinessClock({now: () => new Date(tick++)});
  const first = new Client().setUserContext(context), second = new Client().setUserContext(context);
  const ready = new Promise<void>(resolve => {entered = resolve;});
  const hold = new Promise<void>(resolve => {release = resolve;});
  const observed: number[] = [];
  const work = first.executeGraphSave(new MutationIntent('retain the admitted Fix snapshot'), async () => {
    observed.push(context.requireResource<Date>('fixTime').getTime());
    context.recordFixEvidence({entityType: 'ClockProbe', modelPath: 'create_time', source: 'clock', sourceLabel: 'graphClock'});
    const evidence = context.getResource('fixEvidenceCurrent');
    entered(); await hold;
    observed.push(context.requireResource<Date>('fixTime').getTime());
    assert.equal(context.getResource('fixEvidenceCurrent'), evidence);
  });
  try {
    await ready;
    await assert.rejects(second.executeGraphSave(new MutationIntent('refuse another Context owner'), async () => {
      throw new Error('a rejected graph must not execute its work');
    }), /mutation policy graph is already active/);
    assert.equal(tick, 1001); release(); await work;
    assert.deepEqual(observed, [1000, 1000]);
    assert.equal(context.getResource('fixTime'), undefined);
    assert.equal(context.getResource('fixEvidenceCurrent'), undefined);
    assert.deepEqual(context.lastFixEvidence(), [{entityType: 'ClockProbe', modelPath: 'create_time', source: 'clock', sourceLabel: 'graphClock'}]);
    console.log('TYPESCRIPT_FIX_OWNER_EXAMPLE=' + JSON.stringify({passed: true, observed, clockCaptures: 1,
      rejectedBeforeClock: true, admittedEvidencePreserved: true, scopeReleased: true}));
  } finally {
    release();
    try {await work;} finally {await first.close(); await second.close();}
  }
}
