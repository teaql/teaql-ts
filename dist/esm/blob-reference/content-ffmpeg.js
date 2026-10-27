import "../chunks/chunk-AQT573VW.js";

// src/blob-reference/content-ffmpeg.ts
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { isAbsolute } from "node:path";
var DEFAULT_LIMITS = Object.freeze({
  maximumInputBytes: 32 * 1024 * 1024,
  maximumFrames: 1e5,
  maximumVideoPixels: 16e6,
  concurrentVerifications: 2
});
var MIME = { mp3: "audio/mpeg", mp4: "video/mp4" };
var MP4_BRANDS = /* @__PURE__ */ new Set([
  "isom",
  "iso2",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "avc1",
  "M4V ",
  "M4V2",
  "dash"
]);
var MPEG1_BITRATES = [
  0,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  160,
  192,
  224,
  256,
  320,
  0
];
var MPEG2_BITRATES = [
  0,
  8,
  16,
  24,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  112,
  128,
  144,
  160,
  0
];
function completeMp3(data, maximumFrames) {
  let offset = 0;
  if (data.subarray(0, 3).equals(Buffer.from("ID3"))) {
    if (data.length < 10 || ![2, 3, 4].includes(data[3]) || data[4] === 255 || [...data.subarray(6, 10)].some((value) => value & 128)) return false;
    const tagSize = data[6] << 21 | data[7] << 14 | data[8] << 7 | data[9];
    offset = 10 + tagSize + (data[3] === 4 && data[5] & 16 ? 10 : 0);
    if (offset > data.length) return false;
  }
  const end = data.length >= 128 && data.toString(
    "ascii",
    data.length - 128,
    data.length - 125
  ) === "TAG" ? data.length - 128 : data.length;
  let frames = 0;
  let firstRate;
  while (offset < end) {
    if (end - offset < 4 || frames >= maximumFrames) return false;
    const header = data.readUInt32BE(offset);
    const version = header >>> 19 & 3;
    const layer = header >>> 17 & 3;
    const bitrateIndex = header >>> 12 & 15;
    const sampleIndex = header >>> 10 & 3;
    const padding = header >>> 9 & 1;
    if (header >>> 21 !== 2047 || version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) return false;
    const rate = [44100, 48e3, 32e3][sampleIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    if (firstRate !== void 0 && firstRate !== rate) return false;
    firstRate = rate;
    const bitrates = version === 3 ? MPEG1_BITRATES : MPEG2_BITRATES;
    const length = Math.floor((version === 3 ? 144e3 : 72e3) * bitrates[bitrateIndex] / rate) + padding;
    if (length < 4 || length > end - offset) return false;
    offset += length;
    frames += 1;
  }
  return frames > 0 && offset === end;
}
function completeMp4(data) {
  let offset = 0;
  let count = 0;
  const kinds = /* @__PURE__ */ new Set();
  while (offset < data.length) {
    if (data.length - offset < 8 || count >= 1e3) return false;
    let size = data.readUInt32BE(offset);
    const kind = data.toString("ascii", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      if (data.length - offset < 16) return false;
      const extended = data.readBigUInt64BE(offset + 8);
      if (extended > BigInt(data.length - offset)) return false;
      size = Number(extended);
      header = 16;
    } else if (size === 0) {
      if (kind !== "mdat") return false;
      size = data.length - offset;
    }
    if (size < header || size > data.length - offset) return false;
    if (count === 0 && (kind !== "ftyp" || size < header + 8 || !MP4_BRANDS.has(data.toString(
      "ascii",
      offset + header,
      offset + header + 4
    )))) return false;
    if ((kind === "ftyp" || kind === "moov") && kinds.has(kind)) return false;
    kinds.add(kind);
    offset += size;
    count += 1;
  }
  return ["ftyp", "moov", "mdat"].every((kind) => kinds.has(kind)) && offset === data.length;
}
var FfmpegBlobContentVerifier = class {
  constructor(ffprobePath, ffmpegPath, prlimitPath, limits = DEFAULT_LIMITS) {
    this.ffprobePath = ffprobePath;
    this.ffmpegPath = ffmpegPath;
    this.prlimitPath = prlimitPath;
    this.active = 0;
    if (![ffprobePath, ffmpegPath, prlimitPath].every((value) => typeof value === "string" && isAbsolute(value)) || !limits || !Number.isSafeInteger(limits.maximumInputBytes) || limits.maximumInputBytes < 1 || limits.maximumInputBytes > 100 * 1024 * 1024 || !Number.isSafeInteger(limits.maximumFrames) || limits.maximumFrames < 1 || limits.maximumFrames > 1e6 || !Number.isSafeInteger(limits.maximumVideoPixels) || limits.maximumVideoPixels < 1 || limits.maximumVideoPixels > 64e6 || !Number.isSafeInteger(limits.concurrentVerifications) || limits.concurrentVerifications < 1 || limits.concurrentVerifications > 32) {
      throw new Error("BLOB_POLICY_INVALID");
    }
    this.limits = Object.freeze({ ...limits });
  }
  get supportedExtensions() {
    return ["mp3", "mp4"];
  }
  async execute(binary, args, input, timeoutMs = 15e3) {
    return new Promise((resolve, reject) => {
      let child;
      try {
        child = spawn(this.prlimitPath, [
          "--cpu=10:10",
          "--as=536870912:536870912",
          "--",
          binary,
          ...args
        ], {
          stdio: ["pipe", "pipe", "ignore"],
          env: { LC_ALL: "C" },
          windowsHide: true
        });
      } catch {
        reject(new Error("BLOB_FORMAT_NOT_ALLOWED"));
        return;
      }
      const parts = [];
      let length = 0;
      let failed = false;
      let settled = false;
      const timer = setTimeout(() => {
        failed = true;
        child.kill("SIGKILL");
      }, timeoutMs);
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!ok || failed) reject(new Error("BLOB_FORMAT_NOT_ALLOWED"));
        else resolve(Buffer.concat(parts, length));
      };
      child.stdout.on("data", (part) => {
        length += part.length;
        if (length > 65536) {
          failed = true;
          child.kill("SIGKILL");
        } else parts.push(part);
      });
      child.stdin.on("error", () => {
      });
      child.on("error", () => finish(false));
      child.on("close", (code) => finish(code === 0));
      child.stdin.end(input);
    });
  }
  async validateReady() {
    if (process.platform !== "linux") throw new Error("BLOB_CAPABILITY_MISSING");
    try {
      for (const binary of [this.ffprobePath, this.ffmpegPath, this.prlimitPath]) {
        if (!statSync(binary).isFile()) throw new Error("not a file");
        accessSync(binary, constants.X_OK);
      }
      for (const [binary, prefix] of [
        [this.ffprobePath, "ffprobe version "],
        [this.ffmpegPath, "ffmpeg version "]
      ]) {
        const version = await this.execute(binary, ["-version"], Buffer.alloc(0), 3e3);
        if (!version.toString("utf8", 0, prefix.length).startsWith(prefix)) {
          throw new Error("unexpected FFmpeg binary");
        }
      }
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
      const bound = Math.min(maximumBytes, this.limits.maximumInputBytes);
      let size = 0;
      try {
        for await (const chunk of content) {
          if (!(chunk instanceof Uint8Array)) throw new Error("BLOB_STORE_FAILED");
          if (chunk.length > bound - size) throw new Error("BLOB_SIZE_EXCEEDED");
          const owned = Buffer.from(chunk);
          chunks.push(owned);
          digest.update(owned);
          size += owned.length;
        }
      } catch (error) {
        if (error instanceof Error && ["BLOB_SIZE_EXCEEDED", "BLOB_STORE_FAILED"].includes(error.message)) {
          throw error;
        }
        throw new Error("BLOB_STORE_FAILED");
      }
      const data = Buffer.concat(chunks, size);
      const demuxer = extension === "mp3" ? "mp3" : "mov";
      if (!(extension === "mp3" ? completeMp3(data, this.limits.maximumFrames) : completeMp4(data))) throw new Error("BLOB_FORMAT_NOT_ALLOWED");
      await this.validateReady();
      const probe = await this.execute(this.ffprobePath, [
        "-v",
        "error",
        "-protocol_whitelist",
        "pipe",
        "-f",
        demuxer,
        "-count_frames",
        "-show_entries",
        "stream=codec_type,codec_name,nb_read_frames,width,height,sample_rate:stream_disposition=attached_pic:format=format_name",
        "-of",
        "json",
        "-i",
        "pipe:0"
      ], data);
      let maps;
      try {
        const result = JSON.parse(probe.toString("utf8"));
        const streams = result.streams;
        if (!Array.isArray(streams) || streams.length < 1 || streams.length > 8) {
          throw new Error("invalid streams");
        }
        if (extension === "mp3") {
          const audio = streams[0];
          const rate = Number(audio.sample_rate);
          const frames = Number(audio.nb_read_frames);
          if (result.format?.format_name !== "mp3" || streams.length !== 1 || audio.codec_type !== "audio" || audio.codec_name !== "mp3" || !Number.isSafeInteger(rate) || rate < 8e3 || rate > 192e3 || !Number.isSafeInteger(frames) || frames < 1 || frames > this.limits.maximumFrames) throw new Error("invalid MP3");
          maps = ["-map", "0:a:0"];
        } else {
          const videos = streams.filter((item) => item.codec_type === "video");
          if (typeof result.format?.format_name !== "string" || !result.format.format_name.includes("mp4") || videos.length < 1 || videos.length > 4 || streams.some((item) => !["audio", "video"].includes(item.codec_type)) || videos.some((item) => {
            const pixels = Number(item.width) * Number(item.height);
            const frames = Number(item.nb_read_frames);
            return item.disposition?.attached_pic !== 0 || !Number.isSafeInteger(pixels) || pixels < 1 || pixels > this.limits.maximumVideoPixels || !Number.isSafeInteger(frames) || frames < 1 || frames > this.limits.maximumFrames;
          })) throw new Error("invalid MP4");
          maps = ["-map", "0:v", "-map", "0:a?"];
        }
      } catch {
        throw new Error("BLOB_FORMAT_NOT_ALLOWED");
      }
      await this.execute(this.ffmpegPath, [
        "-nostdin",
        "-v",
        "error",
        "-xerror",
        "-err_detect",
        "explode",
        "-threads",
        "1",
        "-protocol_whitelist",
        "pipe",
        "-f",
        demuxer,
        "-i",
        "pipe:0",
        ...maps,
        "-f",
        "null",
        "-"
      ], data);
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
  FfmpegBlobContentVerifier
};
//# sourceMappingURL=content-ffmpeg.js.map
