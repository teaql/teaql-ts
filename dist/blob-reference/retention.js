"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlobRetention = exports.BlobRetentionPolicy = void 0;
const MAX_EPOCH_MS = 8640000000000000;
function instant(value) {
    if (value === undefined || !Number.isSafeInteger(value) || value < 0 || value > MAX_EPOCH_MS)
        throw new Error('BLOB_REFERENCE_INVALID');
    return value;
}
function retention(seconds) {
    if (!Number.isSafeInteger(seconds) || seconds < 0 ||
        seconds > Math.floor(MAX_EPOCH_MS / 1000))
        throw new Error('BLOB_POLICY_INVALID');
    return seconds;
}
/** Immutable server-selected policy facts. Direct uploads need a separate
 * quiescence proof before any lifecycle collection. */
class BlobRetentionPolicy {
    constructor(profile, uploadMode, unboundRetentionSeconds, unreferencedRetentionSeconds) {
        if (typeof profile !== 'string' || !profile.trim() || profile !== profile.trim() ||
            Buffer.byteLength(profile) > 256 || /[\x00-\x1f\x7f-\x9f]/.test(profile) ||
            !['server_stream', 'direct'].includes(uploadMode))
            throw new Error('BLOB_POLICY_INVALID');
        this.profile = profile;
        this.uploadMode = uploadMode;
        this.unboundRetentionSeconds = retention(unboundRetentionSeconds);
        this.unreferencedRetentionSeconds = retention(unreferencedRetentionSeconds);
        Object.freeze(this);
    }
}
exports.BlobRetentionPolicy = BlobRetentionPolicy;
function deadline(base, seconds) {
    const result = instant(base) + retention(seconds) * 1000;
    if (!Number.isSafeInteger(result) || result > MAX_EPOCH_MS)
        throw new Error('BLOB_POLICY_INVALID');
    return result;
}
class BlobRetention {
    static effectiveRetention(acceptedSeconds, proposedSeconds) {
        let result = retention(proposedSeconds);
        for (const accepted of acceptedSeconds)
            result = Math.max(result, retention(accepted));
        return result;
    }
    static unreferencedEligibleAt(lastUnboundMs, retentionSeconds, floorUntilMs) {
        const eligible = deadline(lastUnboundMs, retentionSeconds);
        return floorUntilMs === undefined ? eligible : Math.max(eligible, instant(floorUntilMs));
    }
    static requireBindable(status, nowMs, completedAtMs, unboundRetentionSeconds = 0, unreferencedEligibleAtMs) {
        instant(nowMs);
        if (status === 'initiated')
            throw new Error('BLOB_UPLOAD_INCOMPLETE');
        if (status === 'deleting' || status === 'deleted')
            throw new Error('BLOB_REFERENCE_EXPIRED');
        if (status === 'uploaded_unbound' &&
            nowMs >= deadline(completedAtMs, unboundRetentionSeconds))
            throw new Error('BLOB_REFERENCE_EXPIRED');
        if (status === 'available' && unreferencedEligibleAtMs !== undefined &&
            nowMs >= instant(unreferencedEligibleAtMs))
            throw new Error('BLOB_REFERENCE_EXPIRED');
        if (status !== 'uploaded_unbound' && status !== 'available')
            throw new Error('BLOB_REFERENCE_INVALID');
    }
    static collectable(status, bindingCount, nowMs, uploadExpiresAtMs, completedAtMs, unboundRetentionSeconds = 0, unreferencedEligibleAtMs) {
        instant(nowMs);
        if (!Number.isSafeInteger(bindingCount) || bindingCount < 0)
            throw new Error('BLOB_REFERENCE_INVALID');
        if (bindingCount > 0 || status === 'deleted')
            return false;
        switch (status) {
            case 'initiated': return nowMs >= instant(uploadExpiresAtMs);
            case 'uploaded_unbound': return nowMs >= deadline(completedAtMs, unboundRetentionSeconds);
            case 'available': return unreferencedEligibleAtMs !== undefined &&
                nowMs >= instant(unreferencedEligibleAtMs);
            case 'deleting': return true;
            default: throw new Error('BLOB_REFERENCE_INVALID');
        }
    }
}
exports.BlobRetention = BlobRetention;
//# sourceMappingURL=retention.js.map