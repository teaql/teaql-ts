import assert from 'node:assert/strict';
import { CheckException, decimal, localTime, long, TeaQLNotLoadedError, UserContext } from 'teaql-ts';
import { E } from '../../typescript-node-lib-core/src/generated/E';
import { Q } from '../../typescript-node-lib-core/src/generated/Q';
import { FreightQuote } from '../../typescript-node-lib-core/src/generated/models/FreightQuote';
import { SQLiteTeaQLClient } from '../../typescript-node-lib-core/src/teaql-node-sqlite';

const maximumCount = 2_147_483_647;
const preciseAmount = decimal('123456789012.3456789');
const firstShipment = 9_007_199_254_740_993n;
const deliveryDate = '2026-10-31';
const pickup = localTime('09:30:15.123456');
const quotedAt = '2026-10-31T01:45:00.123+08:00';
const utcQuoteTime = '2026-10-30T17:45:00.123Z';

async function readQuote(context: UserContext, reference: string) {
  const quote = await Q.freightQuotes().withReferenceIs(reference).limit(1)
    .comment('Read the selected freight quote').purpose('Verify the retained delivery commitment')
    .executeForOne(context);
  assert(quote, 'The freight quote is missing');
  return quote;
}

async function registerQuotes(context: UserContext) {
  const seeds = [
    { reference: 'SEA-001', amount: '0.10', count: 2, instructions: null },
    { reference: 'SEA-002', amount: '0.20', count: 3, instructions: '' },
    { reference: 'SEA-003', amount: '3.50', count: maximumCount, instructions: 'Hold for inspection' },
  ];
  for (const [i, seed] of seeds.entries()) {
    const quote = await Q.freightQuotes().comment('Prepare a freight quote')
      .purpose('Price the shipment for its delivery window').newEntity(context);
    quote.updatePlatform('1').updateReference(seed.reference).updateAmount(decimal(seed.amount))
      .updateShipmentNumber(long(String(firstShipment + BigInt(i)))).updatePackageCount(seed.count)
      .updateDeliveryDate(deliveryDate).updatePickupTime(pickup).updateQuotedAt(quotedAt)
      .updateInstructions(seed.instructions);
    await quote.auditAs('Register a freight quote').save(context);
  }
  const revised = await readQuote(context, 'SEA-003');
  assert.equal(E.freightQuote(revised).amount().eval(), '3.50', 'The initial quote lost its Decimal scale');
  await revised.updateAmount(preciseAmount).auditAs('Accept the revised offshore freight rate').save(context);
}

async function verifyWire(context: UserContext, high: FreightQuote) {
  const payload = JSON.parse(JSON.stringify(high));
  assert.equal(payload.amount, preciseAmount);
  assert.equal(payload.shipmentNumber, String(firstShipment + 2n));
  assert.equal(payload.packageCount, maximumCount);
  const restored = E.freightQuote(FreightQuote.fromRecord(payload));
  assert.equal(restored.amount().eval(), preciseAmount);
  assert.equal(restored.shipmentNumber().eval(), String(firstShipment + 2n));
  assert.equal(restored.deliveryDate().eval(), deliveryDate);
  assert.equal(restored.pickupTime().eval(), pickup);
  assert.equal(restored.quotedAt().eval(), utcQuoteTime);

  assert(high.id);
  const sparse = await Q.freightQuotesWithMinimalFields().withIdIs(high.id).selectReference().limit(1)
    .comment('Read only the quote reference').purpose('Keep unselected delivery instructions distinct')
    .executeForOne(context);
  assert(sparse, 'The sparse freight quote is missing');
  const wire = JSON.parse(JSON.stringify(sparse));
  assert(!Object.hasOwn(wire, 'instructions'), 'Sparse JSON included unselected instructions');
  assert.throws(() => E.freightQuote(FreightQuote.fromRecord(wire)).instructions().eval(), TeaQLNotLoadedError);
}

async function main() {
  const [database, phase] = process.argv.slice(2);
  assert(database && (phase === 'first' || phase === 'restart'), 'Supply a database and first or restart');
  const client = new SQLiteTeaQLClient(database).setDiagnosticSQLLogSink(undefined);
  const context = new UserContext().insertResource('dataService', client);
  try {
    await context.ensureSchema();
    if (phase === 'first') {
      await registerQuotes(context);
    }
    const rows = await Q.freightQuotes().orderByAmountAscending().limit(4)
      .comment('Compare outstanding freight bids').purpose('Rank freight bids numerically').executeForList(context);
    assert.deepEqual(rows.map(row => row.reference), ['SEA-001', 'SEA-002', 'SEA-003']);
    assert.deepEqual(rows.map(row => E.freightQuote(row).amount().eval()), ['0.10', '0.20', preciseAmount]);
    assert.deepEqual(rows.map(row => E.freightQuote(row).shipmentNumber().eval()),
      [0n, 1n, 2n].map(offset => String(firstShipment + offset)));
    assert.deepEqual(rows.map(row => E.freightQuote(row).instructions().eval()), [null, '', 'Hold for inspection']);

    const high = rows[2];
    const match = await Q.freightQuotes().withAmountIs(preciseAmount).limit(1)
      .comment('Find the revised offshore freight rate').purpose('Match an exact Decimal amount').executeForOne(context);
    assert(match && match.id === high.id && high.version === 2);
    const summary = await Q.freightQuotes().sumAmountAs('total')
      .comment('Sum the outstanding freight bids').purpose('Keep exact base-ten precision').executeForRows(context);
    assert.equal(summary.length, 1);
    assert.equal(summary[0].total, '123456789012.6456789');
    await verifyWire(context, high);

    const before = client.sqlTrace.length;
    high.updatePackageCount(maximumCount + 1);
    await assert.rejects(() => high.auditAs('Reject a package count outside the modeled Integer domain').save(context),
      (error: unknown) => error instanceof CheckException && error.violations.some(violation =>
        violation.ruleId === 'invalid_type' && violation.location.modelPath() === 'package_count'));
    assert.equal(client.sqlTrace.length, before, 'Integer validation must precede mutation SQL');
    const retained = await readQuote(context, 'SEA-003');
    assert.equal(retained.version, 2);
    assert.equal(retained.amount, preciseAmount);
    assert.equal(retained.packageCount, maximumCount);
    console.log('FREIGHT_QUOTE=' + JSON.stringify({
      phase, quotes: rows.length, total: summary[0].total, precise: retained.amount, version: retained.version,
      packageCountOverflowRejected: true, sparseInstructionsNotLoaded: true,
    }));
  } finally {
    await client.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
