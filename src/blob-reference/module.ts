import type { UserContext } from '../core/context';
import { installRuntimeCapability, requireRuntimeCapabilities } from '../core/runtime-capability';
import { SqlBlobCatalog } from './sql-catalog';
import { SqliteBlobUploadService } from './upload-service';
import { SqliteBlobMutationParticipant } from './mutation-participant';
import { SqlBlobResponseContributor } from './read-service';

/** Explicit assembly of the optional SQLite Blob runtime. Schema migration is a separate host action. */
export class BlobReferenceModule {
  constructor(
    readonly catalog: SqlBlobCatalog,
    readonly upload: SqliteBlobUploadService,
    readonly mutation: SqliteBlobMutationParticipant,
    readonly response: SqlBlobResponseContributor,
  ) {
    if (!(catalog instanceof SqlBlobCatalog) || catalog.driver.databaseKind !== 'sqlite' ||
        !(upload instanceof SqliteBlobUploadService) ||
        !(mutation instanceof SqliteBlobMutationParticipant) ||
        !(response instanceof SqlBlobResponseContributor)) {
      throw new Error('BLOB_CAPABILITY_MISSING');
    }
  }

  install(context: UserContext): void {
    if (!context || ['teaql.runtime.capability:blob.v1', 'blobUploadService',
      'blobMutationParticipant', 'blobResponseContributor'].some(name => context.getResource(name))) {
      throw new Error('BLOB_CAPABILITY_MISSING');
    }
    installRuntimeCapability(context, { name: 'blob.v1', assertReady: current => {
      if (current !== context || current.getResource('blobUploadService') !== this.upload ||
          current.getResource('blobMutationParticipant') !== this.mutation ||
          current.getResource('blobResponseContributor') !== this.response ||
          !current.getResource('objectStorageProvider')) {
        throw new Error('BLOB_CAPABILITY_MISSING');
      }
    } });
    context.insertResource('blobUploadService', this.upload);
    context.insertResource('blobMutationParticipant', this.mutation);
    context.insertResource('blobResponseContributor', this.response);
  }

  /** Called explicitly after the host runs its catalog migration. */
  async ready(context: UserContext): Promise<void> {
    requireRuntimeCapabilities(context, ['blob.v1']);
    await this.catalog.validateSchema();
  }
}
