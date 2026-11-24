import assert from 'node:assert/strict';
import { encodeWireOutput, normalizeWireInput, TeaQLNotLoadedError, UserContext } from 'teaql-ts';
import { E } from '../../typescript-node-lib-core/src/generated/E';
import { Q } from '../../typescript-node-lib-core/src/generated/Q';
import { GENERATED_WIRE_MODEL_METADATA } from '../../typescript-node-lib-core/src/runtime-module';
import { SQLiteTeaQLClient } from '../../typescript-node-lib-core/src/teaql-node-sqlite';

const reference = 'DOCK-042';
const note = 'Lift-gate pickup after 14:00';

async function main() {
  const [database, profile, phase] = process.argv.slice(2);
  assert(database && (phase === 'first' || phase === 'restart'), 'Supply DATABASE PROFILE {first|restart}');
  const client = new SQLiteTeaQLClient(database).setDiagnosticSQLLogSink(undefined);
  const caller = new UserContext().insertResource('dataService', client);
  try {
    await caller.ensureSchema();
    if (phase === 'first') {
      const order = await Q.dispatchOrders().comment('Prepare the receiving order')
        .purpose('Set its loading instruction').newEntity(caller);
      order.updateDistributionCenter('1').updateOrderReference(reference).updateHandlingNote(note);
      await order.auditAs('Register the dispatch at the receiving terminal').save(caller);
    }
    const detail = Q.dispatchOrders().withOrderReferenceIs(reference).limit(1).comment('Select the dispatch order');
    const root = await Q.distributionCenters().withIdIs('1').selectDispatchOrderListWith(detail).limit(1)
      .comment('Read the dispatch desk and its order').purpose('Check the complete loading instruction').executeForOne(caller);
    assert(root);
    const desk = E.distributionCenter(root);
    assert.equal(desk.dockName().eval(), 'North Receiving Terminal');
    const order = desk.dispatchOrderList().first();
    assert.equal(order.orderReference().eval(), reference);
    assert.equal(order.handlingNote().eval(), note);
    const matches = await Q.dispatchOrders().withOrderReferenceIs(reference).limit(2)
      .comment('Read back the dispatch record').purpose('Check the model wire field mapping').executeForList(caller);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, '1');
    assert.equal(matches[0].version, 1);
    const values = { order_reference: order.orderReference().eval(), handling_note: order.handlingNote().eval() };
    const metadata = GENERATED_WIRE_MODEL_METADATA.entities.DispatchOrder;
    const document = encodeWireOutput(values, metadata);
    assert.deepEqual(normalizeWireInput(document, metadata).values, values);

    const sparse = await Q.distributionCentersWithMinimalFields().withIdIs('1').selectDockName().limit(1)
      .comment('Read the desk without its dispatch orders').purpose('Verify the modeled preload instruction').executeForOne(caller);
    assert(sparse);
    assert.equal(E.distributionCenter(sparse).dockName().eval(), desk.dockName().eval());
    let problem: TeaQLNotLoadedError | undefined;
    try { E.distributionCenter(sparse).dispatchOrderList().first().orderReference().eval(); }
    catch (error) {
      if (!(error instanceof TeaQLNotLoadedError)) throw error;
      problem = error;
    }
    assert(problem, 'A dispatch order was returned without loading the list');
    console.log('DISPATCH_DOCUMENT_PROFILE=' + JSON.stringify({
      profile, phase, reference, handlingNote: note, id: Number(matches[0].id), version: matches[0].version,
      dock: desk.dockName().eval(), document, diagnostic: problem.toWire(), human: problem.message,
      runtimeOrigin: require.resolve('teaql-ts'),
    }));
  } finally {
    await client.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
