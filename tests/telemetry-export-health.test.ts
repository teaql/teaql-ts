import { ExportHealth, lifecycleDeadline } from '../src/telemetry/export-health';

test('queue capacity includes in-flight records and diagnoses every lost record without log flooding', () => {
  const losses = jest.fn();
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const health = new ExportHealth('logs', 2, losses);
    expect(health.admit()).toBe(true); expect(health.admit()).toBe(true);
    expect(health.admit()).toBe(false); expect(health.admit()).toBe(false);
    expect(health.pendingRecords).toBe(2);
    expect(losses.mock.calls).toEqual([[1, 'logs', 'queue_overflow'], [1, 'logs', 'queue_overflow']]);
    expect(warning).toHaveBeenCalledTimes(1);
    health.complete(1, false);
    expect(health.admit()).toBe(true); expect(health.pendingRecords).toBe(2);
    health.complete(2, true);
    expect(health.pendingRecords).toBe(0);
    expect(losses).toHaveBeenLastCalledWith(2, 'logs', 'export_failure');
    expect(warning).toHaveBeenCalledTimes(2);
  } finally { warning.mockRestore(); }
});

test('export loss observer errors are not business errors and do not prevent draining', () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => { throw new Error('writer'); });
  try {
    const health = new ExportHealth('traces', 1, () => { throw new Error('counter'); });
    health.admit();
    expect(() => health.complete(1, true)).not.toThrow();
    expect(health.pendingRecords).toBe(0);
    expect(health.admit()).toBe(true);
  } finally { warning.mockRestore(); }
});

test('lifecycle operations have a finite deadline and clear the timer on completion', async () => {
  await expect(lifecycleDeadline(Promise.resolve(7), 100)).resolves.toBe(7);
  await expect(lifecycleDeadline(new Promise(() => {}), 10)).rejects.toThrow('lifecycle timed out');
});

test('close rejects late admission but still settles previously handed-off records', () => {
  const losses = jest.fn(), warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const health = new ExportHealth('traces', 1, losses);
    expect(health.admit()).toBe(true);
    health.close();
    expect(health.admit()).toBe(false);
    expect(health.pendingRecords).toBe(1);
    expect(losses).toHaveBeenLastCalledWith(1, 'traces', 'shutdown');
    health.complete(1, true);
    expect(health.pendingRecords).toBe(0);
    expect(health.failedRecords).toBe(1);
  } finally {warning.mockRestore();}
});

test('failed SDK handoff releases its reservation without joining the accepted flush prefix', async () => {
  const losses = jest.fn(), warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const health = new ExportHealth('traces', 1, losses), record = {};
    health.handoff(record, () => {throw new Error('PRIVATE-SDK-FAILURE');});
    expect(health.snapshot()).toMatchObject({admitted: 0, outstanding: 0, completed: 0, handoffFailed: 1});
    await health.waitForPrefix();
    health.handoff({}, () => {});
    expect(health.snapshot()).toMatchObject({admitted: 1, outstanding: 1});
    expect(losses).toHaveBeenCalledWith(1, 'traces', 'handoff_failure');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('PRIVATE-SDK-FAILURE');
  } finally {warning.mockRestore();}
});

test('later export completion cannot satisfy an older accepted-record flush prefix', async () => {
  const health = new ExportHealth('logs', 2, () => {}), first = {}, later = {};
  health.handoff(first, () => {});
  const earlier = health.beginExport([first])!;
  let done = false;
  const prefix = health.waitForPrefix().then(() => {done = true;});
  health.handoff(later, () => {});
  health.beginExport([later])!.complete(false);
  await Promise.resolve(); expect(done).toBe(false);
  earlier.complete(false); await prefix;
  expect(health.snapshot()).toMatchObject({admitted: 2, completed: 2, outstanding: 0});
});

test('queued retirement is distinct from an in-flight failed attempt and is counted once', async () => {
  const losses = jest.fn(), warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const health = new ExportHealth('logs', 3, losses), active = {}, queued = {};
    health.handoff(active, () => {}); health.handoff(queued, () => {});
    const exporting = health.beginExport([active])!;
    health.close(); health.abortQueued(); health.abortQueued();
    expect(health.beginExport([queued])).toBeUndefined();
    expect(health.snapshot()).toMatchObject({retired: 1, outstanding: 1, exporting: 1, completed: 0});
    exporting.complete(true); exporting.complete(true);
    await health.waitForIdle();
    expect(health.snapshot()).toMatchObject({retired: 1, outstanding: 0, exporting: 0, completed: 1});
    expect(health.failedRecords).toBe(1);
    expect(losses.mock.calls).toEqual([[1,'logs','shutdown'],[1,'logs','export_failure']]);
  } finally {warning.mockRestore();}
});
