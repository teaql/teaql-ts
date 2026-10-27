// src/blob-reference/retention.ts
var MAX_EPOCH_MS = 864e13;
function instant(value) {
  if (value === void 0 || !Number.isSafeInteger(value) || value < 0 || value > MAX_EPOCH_MS)
    throw new Error("BLOB_REFERENCE_INVALID");
  return value;
}
function retention(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > Math.floor(MAX_EPOCH_MS / 1e3)) throw new Error("BLOB_POLICY_INVALID");
  return seconds;
}
var BlobRetentionPolicy = class {
  constructor(profile, uploadMode, unboundRetentionSeconds, unreferencedRetentionSeconds) {
    if (typeof profile !== "string" || !profile.trim() || profile !== profile.trim() || Buffer.byteLength(profile) > 256 || /[\x00-\x1f\x7f-\x9f]/.test(profile) || !["server_stream", "direct"].includes(uploadMode)) throw new Error("BLOB_POLICY_INVALID");
    this.profile = profile;
    this.uploadMode = uploadMode;
    this.unboundRetentionSeconds = retention(unboundRetentionSeconds);
    this.unreferencedRetentionSeconds = retention(unreferencedRetentionSeconds);
    Object.freeze(this);
  }
};
function deadline(base, seconds) {
  const result = instant(base) + retention(seconds) * 1e3;
  if (!Number.isSafeInteger(result) || result > MAX_EPOCH_MS) throw new Error("BLOB_POLICY_INVALID");
  return result;
}
var BlobRetention = class {
  static effectiveRetention(acceptedSeconds, proposedSeconds) {
    let result = retention(proposedSeconds);
    for (const accepted of acceptedSeconds) result = Math.max(result, retention(accepted));
    return result;
  }
  static unreferencedEligibleAt(lastUnboundMs, retentionSeconds, floorUntilMs) {
    const eligible = deadline(lastUnboundMs, retentionSeconds);
    return floorUntilMs === void 0 ? eligible : Math.max(eligible, instant(floorUntilMs));
  }
  static requireBindable(status, nowMs, completedAtMs, unboundRetentionSeconds = 0, unreferencedEligibleAtMs) {
    instant(nowMs);
    if (status === "initiated") throw new Error("BLOB_UPLOAD_INCOMPLETE");
    if (status === "deleting" || status === "deleted") throw new Error("BLOB_REFERENCE_EXPIRED");
    if (status === "uploaded_unbound" && nowMs >= deadline(completedAtMs, unboundRetentionSeconds))
      throw new Error("BLOB_REFERENCE_EXPIRED");
    if (status === "available" && unreferencedEligibleAtMs !== void 0 && nowMs >= instant(unreferencedEligibleAtMs)) throw new Error("BLOB_REFERENCE_EXPIRED");
    if (status !== "uploaded_unbound" && status !== "available")
      throw new Error("BLOB_REFERENCE_INVALID");
  }
  static collectable(status, bindingCount, nowMs, uploadExpiresAtMs, completedAtMs, unboundRetentionSeconds = 0, unreferencedEligibleAtMs) {
    instant(nowMs);
    if (!Number.isSafeInteger(bindingCount) || bindingCount < 0)
      throw new Error("BLOB_REFERENCE_INVALID");
    if (bindingCount > 0 || status === "deleted") return false;
    switch (status) {
      case "initiated":
        return nowMs >= instant(uploadExpiresAtMs);
      case "uploaded_unbound":
        return nowMs >= deadline(completedAtMs, unboundRetentionSeconds);
      case "available":
        return unreferencedEligibleAtMs !== void 0 && nowMs >= instant(unreferencedEligibleAtMs);
      case "deleting":
        return true;
      default:
        throw new Error("BLOB_REFERENCE_INVALID");
    }
  }
};

export {
  BlobRetentionPolicy,
  BlobRetention
};
//# sourceMappingURL=chunk-FUEEXNNP.js.map
