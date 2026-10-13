import { telemetryNotice } from '../core/telemetry-startup';

export type TelemetrySignal = 'traces' | 'logs' | 'metrics';
export type TelemetryLossReason = 'queue_overflow' | 'export_failure' | 'shutdown' | 'handoff_failure';

type Admission = {sequence?: number; state: 'queued' | 'exporting' | 'complete' | 'retired'};
export type QueueHealth = Readonly<{offered: number; admitted: number; completed: number; outstanding: number;
  exporting: number; overflow: number; postShutdown: number; handoffFailed: number; retired: number}>;

/** Bounded admission counts in-flight records too, never only the visible SDK queue. */
export class ExportHealth {
  private readonly pending = new Set<Admission>();
  private readonly records = new WeakMap<object, Admission>();
  private readonly changed = new Set<() => void>();
  private offered = 0;
  private admitted = 0;
  private completed = 0;
  private overflow = 0;
  private postShutdown = 0;
  private handoffFailed = 0;
  private retired = 0;
  private failures = 0;
  private closed = false;
  private aborted = false;
  private readonly announced = new Set<TelemetryLossReason>();
  constructor(private readonly signal: TelemetrySignal, private readonly capacity: number,
    private readonly onLoss: (amount: number, signal: TelemetrySignal, reason: TelemetryLossReason) => void) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Invalid telemetry queue capacity');
  }
  admit(amount = 1): boolean {
    if (!this.reserve(amount)) return false;
    for (let index = 0; index < amount; index++) this.pending.add({sequence: ++this.admitted, state: 'queued'});
    return true;
  }
  complete(amount: number, failed: boolean): void {
    this.settle([...this.pending].slice(0, amount), failed);
  }
  private reserve(amount: number): boolean {
    this.offered += amount;
    if (this.closed) {this.postShutdown += amount; this.lost(amount, 'shutdown'); return false;}
    if (this.pending.size + amount > this.capacity) {
      this.overflow += amount; this.lost(amount, 'queue_overflow'); return false;
    }
    return true;
  }
  /** SDK object identity carries admission; never infer tickets from equal data or completion order. */
  handoff(record: object, submit: () => void): void {
    if (!this.reserve(1)) return;
    const admission: Admission = {state: 'queued'};
    this.pending.add(admission); this.records.set(record, admission);
    try {
      submit(); admission.sequence = ++this.admitted;
      if (admission.state === 'complete') this.completed++;
    } catch {
      this.pending.delete(admission); this.records.delete(record);
      this.handoffFailed++; this.lost(1, 'handoff_failure');
    }
    this.notify();
  }
  beginExport(records: readonly object[]): {complete(failed: boolean): void} | undefined {
    if (this.aborted) return undefined;
    const batch = records.map(record => this.records.get(record));
    if (batch.some(record => !record || record.state !== 'queued')) return undefined;
    const admissions = batch as Admission[];
    for (const admission of admissions) admission.state = 'exporting';
    let completed = false;
    return {complete: failed => {
      if (completed) return; completed = true; this.settle(admissions, failed);
    }};
  }
  private settle(admissions: readonly Admission[], failed: boolean): void {
    let settled = 0;
    for (const admission of admissions) {
      if (!this.pending.delete(admission)) continue;
      admission.state = 'complete'; settled++;
      if (admission.sequence !== undefined) this.completed++;
    }
    if (failed && settled) {this.failures += settled; this.lost(settled, 'export_failure');}
    this.notify();
  }
  abortQueued(): void {
    if (this.aborted) return; this.aborted = true;
    let retired = 0;
    for (const admission of this.pending) if (admission.state === 'queued') {
      this.pending.delete(admission); admission.state = 'retired'; retired++;
    }
    this.retired += retired;
    if (retired) this.lost(retired, 'shutdown');
    this.notify();
  }
  /** Captured prefix excludes later submissions and cannot be satisfied by their completion. */
  waitForPrefix(timeoutMillis = 5000): Promise<void> {
    const target = this.admitted;
    return this.wait(() => ![...this.pending].some(record => record.sequence !== undefined && record.sequence <= target), timeoutMillis);
  }
  waitForIdle(timeoutMillis = 200): Promise<void> {return this.wait(() => this.pending.size === 0, timeoutMillis);}
  private wait(ready: () => boolean, timeoutMillis: number): Promise<void> {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const finish = (failed: boolean) => {
        clearTimeout(timer); this.changed.delete(check);
        if (failed) reject(new Error('TeaQL telemetry drain timed out')); else resolve();
      };
      const check = () => {if (ready()) finish(false);};
      const timer = setTimeout(() => finish(true), timeoutMillis);
      this.changed.add(check); check();
    });
  }
  private notify(): void {for (const observer of [...this.changed]) observer();}
  private lost(amount: number, reason: TelemetryLossReason): void {
    try { this.onLoss(amount, this.signal, reason); } catch { /* loss reporting is best effort */ }
    if (this.announced.has(reason)) return;
    this.announced.add(reason);
    telemetryNotice(`TeaQL telemetry: records lost; signal=${this.signal} reason=${reason}. Business outcome unchanged.`, true);
  }
  get pendingRecords(): number { return this.pending.size; }
  get failedRecords(): number { return this.failures; }
  close(): void { this.closed = true; }
  rejectLate(): void {this.offered++; this.postShutdown++; this.lost(1, 'shutdown');}
  snapshot(): QueueHealth {return {offered: this.offered, admitted: this.admitted, completed: this.completed,
    outstanding: this.pending.size, exporting: [...this.pending].filter(record => record.state === 'exporting').length,
    overflow: this.overflow, postShutdown: this.postShutdown, handoffFailed: this.handoffFailed, retired: this.retired};}
}

export function lifecycleDeadline<T>(work: Promise<T>, timeoutMillis = 6000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TeaQL telemetry lifecycle timed out')), timeoutMillis);
    work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
