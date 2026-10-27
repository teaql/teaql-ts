import { ObjectKey, ObjectReadUrlOptions } from '../core/object-storage';
import type { UserContext } from '../core/context';
import type { AuthorizedBlobSlot, AuthorizedResponseGraph, BlobResponseContributor } from '../core/view-preparation';
import { SqlBlobCatalog } from './sql-catalog';

export interface BlobReadAuthorization {
  authorize(context: UserContext, slot: AuthorizedBlobSlot): Promise<boolean>;
}

/** Rechecks each current binding before requesting complete URLs from the store. */
export class SqlBlobResponseContributor implements BlobResponseContributor {
  constructor(private readonly catalog: SqlBlobCatalog,
              private readonly authorization: BlobReadAuthorization,
              private readonly maximumUrlSeconds = 600) {
    if (!Number.isSafeInteger(maximumUrlSeconds) || maximumUrlSeconds < 1 || maximumUrlSeconds > 3600) {
      throw new TypeError('BLOB_POLICY_INVALID');
    }
  }

  async projectBatch(context: UserContext, graph: AuthorizedResponseGraph,
                     expiresAt?: Date): Promise<readonly Readonly<{ url: string; expiresAt: Date }>[]> {
    const results: Array<Readonly<{ url: string; expiresAt: Date }>> = [];
    for (const slot of graph.blobSlots) {
      if (!await this.authorization.authorize(context, slot)) throw new Error('BLOB_READ_DENIED');
      const record = await this.catalog.currentRead(slot);
      const seconds = expiresAt
        ? Math.min(this.maximumUrlSeconds, Math.floor((expiresAt.getTime() - Date.now()) / 1000) - 1)
        : this.maximumUrlSeconds;
      if (seconds < 1) throw new Error('BLOB_REFERENCE_EXPIRED');
      const inline = /^(image\/|audio\/|video\/|application\/pdf$)/.test(record.contentType);
      let signed;
      try {
        signed = await context.objectStorage('prepare authorized Blob view').getReadUrl(
          new ObjectKey(record.objectKey),
          new ObjectReadUrlOptions(seconds, inline ? 'inline' : 'attachment', record.fileName));
      } catch { throw new Error('BLOB_SIGN_FAILED'); }
      results.push(Object.freeze({ url: signed.url, expiresAt: signed.expiresAt }));
    }
    return Object.freeze(results);
  }
}
