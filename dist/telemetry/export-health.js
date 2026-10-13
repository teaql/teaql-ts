"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lifecycleDeadline = exports.ExportHealth = void 0;
const telemetry_startup_1 = require("../core/telemetry-startup");
/** Bounded admission counts in-flight records too, never only the visible SDK queue. */
class ExportHealth {
    constructor(signal, capacity, onLoss) {
        this.signal = signal;
        this.capacity = capacity;
        this.onLoss = onLoss;
        this.pending = new Set();
        this.records = new WeakMap();
        this.changed = new Set();
        this.offered = 0;
        this.admitted = 0;
        this.completed = 0;
        this.overflow = 0;
        this.postShutdown = 0;
        this.handoffFailed = 0;
        this.retired = 0;
        this.failures = 0;
        this.closed = false;
        this.aborted = false;
        this.announced = new Set();
        if (!Number.isInteger(capacity) || capacity < 1)
            throw new Error('Invalid telemetry queue capacity');
    }
    admit(amount = 1) {
        if (!this.reserve(amount))
            return false;
        for (let index = 0; index < amount; index++)
            this.pending.add({ sequence: ++this.admitted, state: 'queued' });
        return true;
    }
    complete(amount, failed) {
        this.settle([...this.pending].slice(0, amount), failed);
    }
    reserve(amount) {
        this.offered += amount;
        if (this.closed) {
            this.postShutdown += amount;
            this.lost(amount, 'shutdown');
            return false;
        }
        if (this.pending.size + amount > this.capacity) {
            this.overflow += amount;
            this.lost(amount, 'queue_overflow');
            return false;
        }
        return true;
    }
    /** SDK object identity carries admission; never infer tickets from equal data or completion order. */
    handoff(record, submit) {
        if (!this.reserve(1))
            return;
        const admission = { state: 'queued' };
        this.pending.add(admission);
        this.records.set(record, admission);
        try {
            submit();
            admission.sequence = ++this.admitted;
            if (admission.state === 'complete')
                this.completed++;
        }
        catch {
            this.pending.delete(admission);
            this.records.delete(record);
            this.handoffFailed++;
            this.lost(1, 'handoff_failure');
        }
        this.notify();
    }
    beginExport(records) {
        if (this.aborted)
            return undefined;
        const batch = records.map(record => this.records.get(record));
        if (batch.some(record => !record || record.state !== 'queued'))
            return undefined;
        const admissions = batch;
        for (const admission of admissions)
            admission.state = 'exporting';
        let completed = false;
        return { complete: failed => {
                if (completed)
                    return;
                completed = true;
                this.settle(admissions, failed);
            } };
    }
    settle(admissions, failed) {
        let settled = 0;
        for (const admission of admissions) {
            if (!this.pending.delete(admission))
                continue;
            admission.state = 'complete';
            settled++;
            if (admission.sequence !== undefined)
                this.completed++;
        }
        if (failed && settled) {
            this.failures += settled;
            this.lost(settled, 'export_failure');
        }
        this.notify();
    }
    abortQueued() {
        if (this.aborted)
            return;
        this.aborted = true;
        let retired = 0;
        for (const admission of this.pending)
            if (admission.state === 'queued') {
                this.pending.delete(admission);
                admission.state = 'retired';
                retired++;
            }
        this.retired += retired;
        if (retired)
            this.lost(retired, 'shutdown');
        this.notify();
    }
    /** Captured prefix excludes later submissions and cannot be satisfied by their completion. */
    waitForPrefix(timeoutMillis = 5000) {
        const target = this.admitted;
        return this.wait(() => ![...this.pending].some(record => record.sequence !== undefined && record.sequence <= target), timeoutMillis);
    }
    waitForIdle(timeoutMillis = 200) { return this.wait(() => this.pending.size === 0, timeoutMillis); }
    wait(ready, timeoutMillis) {
        if (ready())
            return Promise.resolve();
        return new Promise((resolve, reject) => {
            const finish = (failed) => {
                clearTimeout(timer);
                this.changed.delete(check);
                if (failed)
                    reject(new Error('TeaQL telemetry drain timed out'));
                else
                    resolve();
            };
            const check = () => { if (ready())
                finish(false); };
            const timer = setTimeout(() => finish(true), timeoutMillis);
            this.changed.add(check);
            check();
        });
    }
    notify() { for (const observer of [...this.changed])
        observer(); }
    lost(amount, reason) {
        try {
            this.onLoss(amount, this.signal, reason);
        }
        catch { /* loss reporting is best effort */ }
        if (this.announced.has(reason))
            return;
        this.announced.add(reason);
        (0, telemetry_startup_1.telemetryNotice)(`TeaQL telemetry: records lost; signal=${this.signal} reason=${reason}. Business outcome unchanged.`, true);
    }
    get pendingRecords() { return this.pending.size; }
    get failedRecords() { return this.failures; }
    close() { this.closed = true; }
    rejectLate() { this.offered++; this.postShutdown++; this.lost(1, 'shutdown'); }
    snapshot() {
        return { offered: this.offered, admitted: this.admitted, completed: this.completed,
            outstanding: this.pending.size, exporting: [...this.pending].filter(record => record.state === 'exporting').length,
            overflow: this.overflow, postShutdown: this.postShutdown, handoffFailed: this.handoffFailed, retired: this.retired };
    }
}
exports.ExportHealth = ExportHealth;
function lifecycleDeadline(work, timeoutMillis = 6000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('TeaQL telemetry lifecycle timed out')), timeoutMillis);
        work.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
}
exports.lifecycleDeadline = lifecycleDeadline;
//# sourceMappingURL=export-health.js.map