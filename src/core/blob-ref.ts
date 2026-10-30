/** Stable catalog identity. A Key is never a read URL or an authorization credential. */
export class BlobRef {
  private static readonly KEY = /^blob_[A-Za-z0-9_-]{1,123}$/;
  readonly #key: string;

  constructor(key: string) {
    if (typeof key !== 'string' || !BlobRef.KEY.test(key)) {
      throw new TypeError('BLOB_REFERENCE_INVALID');
    }
    this.#key = key;
    Object.freeze(this);
  }

  get key(): string { return this.#key; }

  static fromJSON(value: unknown): BlobRef {
    if (typeof value !== 'string') throw new TypeError('BLOB_REFERENCE_INVALID');
    return new BlobRef(value);
  }

  static fromSQL(value: unknown): BlobRef {
    if (typeof value !== 'string') throw new TypeError('BLOB_REFERENCE_INVALID');
    return new BlobRef(value);
  }

  equals(other: unknown): boolean {
    return other instanceof BlobRef && this.key === other.key;
  }

  /** Generic JSON output must go through an authorized prepared view. */
  toJSON(): never { throw new Error('BLOB_PRESENTATION_REQUIRED'); }
  toString(): string { return 'BlobRef[masked]'; }
  [Symbol.for('nodejs.util.inspect.custom')](): string { return this.toString(); }
}

const MIME_TYPES: Readonly<Record<string, string>> = Object.freeze({
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  mp4: 'video/mp4', mp3: 'audio/mpeg',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
});

/** Trusted model restrictions; the server-selected profile may narrow them further. */
export class BlobFieldSpec {
  static readonly CAPABILITY = 'blob.v1';
  readonly protocolVersion = BlobFieldSpec.CAPABILITY;
  readonly maxFiles = 1;
  readonly entity: string;
  readonly field: string;
  readonly allowedExtensions: readonly string[];
  readonly allowedContentTypes: readonly string[];
  readonly nullable: boolean;
  readonly policyProfile: string;

  constructor(entity: string, field: string, extensions: Iterable<string>,
              nullable: boolean, policyProfile: string) {
    if (!entity?.trim() || !field?.trim() || !policyProfile?.trim() ||
        entity !== entity.trim() || field !== field.trim() ||
        policyProfile !== policyProfile.trim()) {
      throw new TypeError('BLOB_POLICY_INVALID');
    }
    const normalized = [...new Set(extensions)].sort();
    if (!normalized.length || normalized.some(extension =>
      !Object.prototype.hasOwnProperty.call(MIME_TYPES, extension))) {
      throw new TypeError('BLOB_FORMAT_NOT_ALLOWED');
    }
    this.entity = entity;
    this.field = field;
    this.allowedExtensions = Object.freeze(normalized);
    this.allowedContentTypes = Object.freeze([...new Set(normalized.map(extension => MIME_TYPES[extension]))].sort());
    this.nullable = nullable;
    this.policyProfile = policyProfile;
    Object.freeze(this);
  }
}
