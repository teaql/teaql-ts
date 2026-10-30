import "../chunks/chunk-AQT573VW.js";

// src/blob-reference/content-sharp.ts
import { createHash } from "node:crypto";
var MIME = Object.freeze({
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png"
});
var DEFAULT_LIMITS = Object.freeze({
  maximumInputBytes: 32 * 1024 * 1024,
  maximumDecodedBytes: 100 * 1024 * 1024,
  concurrentVerifications: 2
});
var PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
var CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
  }
  return value >>> 0;
});
function pngContainerComplete(bytes) {
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return false;
  let offset = 8;
  let chunks = 0;
  let imageData = false;
  while (offset <= bytes.length - 12) {
    const length = bytes.readUInt32BE(offset);
    if (length > bytes.length - offset - 12) return false;
    const kind = bytes.toString("ascii", offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(kind)) return false;
    if (chunks === 0 && (kind !== "IHDR" || length !== 13)) return false;
    let crc = 4294967295;
    for (let index = offset + 4; index < offset + 8 + length; index += 1) {
      crc = CRC_TABLE[(crc ^ bytes[index]) & 255] ^ crc >>> 8;
    }
    if ((crc ^ 4294967295) >>> 0 !== bytes.readUInt32BE(offset + 8 + length)) return false;
    offset += length + 12;
    chunks += 1;
    if (kind === "IDAT") imageData = true;
    if (kind === "IEND") return length === 0 && imageData && offset === bytes.length;
  }
  return false;
}
function jpegContainerComplete(bytes) {
  return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
}
var SharpBlobContentVerifier = class {
  constructor(limits = DEFAULT_LIMITS) {
    this.active = 0;
    if (!limits || !Number.isSafeInteger(limits.maximumInputBytes) || limits.maximumInputBytes < 1 || limits.maximumInputBytes > 100 * 1024 * 1024 || !Number.isSafeInteger(limits.maximumDecodedBytes) || limits.maximumDecodedBytes < 4 || limits.maximumDecodedBytes > 512 * 1024 * 1024 || !Number.isSafeInteger(limits.concurrentVerifications) || limits.concurrentVerifications < 1 || limits.concurrentVerifications > 32) {
      throw new Error("BLOB_POLICY_INVALID");
    }
    this.limits = Object.freeze({ ...limits });
  }
  get supportedExtensions() {
    return Object.keys(MIME);
  }
  /** Host-controlled readiness check; optional sharp is loaded only here or during verify. */
  async validateReady() {
    await this.decoder();
  }
  async decoder() {
    try {
      return (await import("sharp")).default;
    } catch {
      throw new Error("BLOB_CAPABILITY_MISSING");
    }
  }
  async verify(content, extension, maximumBytes) {
    if (!Object.prototype.hasOwnProperty.call(MIME, extension)) {
      throw new Error("BLOB_FORMAT_NOT_ALLOWED");
    }
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
      throw new Error("BLOB_POLICY_INVALID");
    }
    if (this.active >= this.limits.concurrentVerifications) {
      throw new Error("BLOB_VERIFICATION_BUSY");
    }
    this.active += 1;
    try {
      const chunks = [];
      const digest = createHash("sha256");
      let size = 0;
      const bound = Math.min(maximumBytes, this.limits.maximumInputBytes);
      try {
        for await (const chunk of content) {
          if (!(chunk instanceof Uint8Array)) throw new Error("BLOB_STORE_FAILED");
          if (chunk.byteLength > bound - size) throw new Error("BLOB_SIZE_EXCEEDED");
          const owned = Buffer.from(chunk);
          digest.update(owned);
          chunks.push(owned);
          size += owned.byteLength;
        }
      } catch (error) {
        if (error instanceof Error && ["BLOB_SIZE_EXCEEDED", "BLOB_STORE_FAILED"].includes(error.message)) {
          throw error;
        }
        throw new Error("BLOB_STORE_FAILED");
      }
      if (!size) throw new Error("BLOB_FORMAT_NOT_ALLOWED");
      const bytes = Buffer.concat(chunks, size);
      if (extension === "png" ? !pngContainerComplete(bytes) : !jpegContainerComplete(bytes)) {
        throw new Error("BLOB_FORMAT_NOT_ALLOWED");
      }
      const decoder = await this.decoder();
      const pixels = Math.floor(this.limits.maximumDecodedBytes / 4);
      const options = {
        failOn: "warning",
        limitInputPixels: pixels,
        limitInputChannels: 4,
        sequentialRead: true,
        unlimited: false
      };
      try {
        const metadata = await decoder(bytes, options).metadata();
        const format = extension === "png" ? "png" : "jpeg";
        if (metadata.format !== format || !metadata.width || !metadata.height || metadata.width * metadata.height > pixels || (metadata.pages ?? 1) !== 1) {
          throw new Error("BLOB_FORMAT_NOT_ALLOWED");
        }
        const { data, info } = await decoder(bytes, options).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        if (info.width !== metadata.width || info.height !== metadata.height || info.channels !== 4 || data.byteLength !== info.width * info.height * 4 || data.byteLength > this.limits.maximumDecodedBytes) {
          throw new Error("BLOB_FORMAT_NOT_ALLOWED");
        }
      } catch {
        throw new Error("BLOB_FORMAT_NOT_ALLOWED");
      }
      return Object.freeze({
        sizeBytes: size,
        sha256: digest.digest("hex"),
        contentType: MIME[extension]
      });
    } finally {
      this.active -= 1;
    }
  }
};
export {
  SharpBlobContentVerifier
};
//# sourceMappingURL=content-sharp.js.map
