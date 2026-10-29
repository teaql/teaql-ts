import type { UserContext } from '../core/context';
import type { TeaQLDataService } from '../sql/core';
import { installRuntimeCapability, requireRuntimeCapabilities } from '../core/runtime-capability';
import { SqlBlobCatalog } from './sql-catalog';
import { SqliteBlobUploadService } from './upload-service';
import { SqliteBlobMutationParticipant } from './mutation-participant';
import { SqlBlobResponseContributor } from './read-service';
import { SqliteBlobMaintenanceService } from './maintenance-service';

/** Explicit assembly of the optional SQLite Blob runtime. Schema migration is a separate host action. */
export class BlobReferenceModule {
  constructor(
    readonly catalog: SqlBlobCatalog,
    readonly upload: SqliteBlobUploadService,
    readonly mutation: SqliteBlobMutationParticipant,
    readonly response: SqlBlobResponseContributor,
    readonly maintenance?: SqliteBlobMaintenanceService,
  ) {
    this.assertCoherentAssembly();
  }

  private assertCoherentAssembly(): void {
    if (!(this.catalog instanceof SqlBlobCatalog) || this.catalog.driver.databaseKind !== 'sqlite' ||
        !(this.upload instanceof SqliteBlobUploadService) ||
        !(this.mutation instanceof SqliteBlobMutationParticipant) ||
        !(this.response instanceof SqlBlobResponseContributor) ||
        !this.upload.usesCatalog(this.catalog) || !this.mutation.usesCatalog(this.catalog) ||
        !this.response.usesCatalog(this.catalog) ||
        (this.maintenance !== undefined && (!(this.maintenance instanceof SqliteBlobMaintenanceService) ||
          !this.maintenance.usesCatalog(this.catalog)))) {
      throw new Error('BLOB_CAPABILITY_MISSING');
    }
  }

  install(context: UserContext): void {
    this.assertCoherentAssembly();
    if (!context || ['teaql.runtime.capability:blob.v1', 'blobUploadService',
      'blobMutationParticipant', 'blobResponseContributor',
      'blobMaintenanceService'].some(name => context.getResource(name))) {
      throw new Error('BLOB_CAPABILITY_MISSING');
    }
    installRuntimeCapability(context, { name: 'blob.v1', assertReady: current => {
      this.assertCoherentAssembly();
      const owner = current.getResource<TeaQLDataService>('dataService');
      let compatibleOwner = false;
      try { compatibleOwner = owner?.usesSqlDatabase?.(this.catalog.driver) === true; }
      catch { /* A host resource cannot prove readiness by throwing. */ }
      if (current !== context || current.getResource('blobUploadService') !== this.upload ||
          current.getResource('blobMutationParticipant') !== this.mutation ||
          current.getResource('blobResponseContributor') !== this.response ||
          (this.maintenance !== undefined &&
            current.getResource('blobMaintenanceService') !== this.maintenance) ||
          !current.getResource('objectStorageProvider') || !compatibleOwner) {
        throw new Error('BLOB_CAPABILITY_MISSING');
      }
    } });
    context.insertResource('blobUploadService', this.upload);
    context.insertResource('blobMutationParticipant', this.mutation);
    context.insertResource('blobResponseContributor', this.response);
    if (this.maintenance) context.insertResource('blobMaintenanceService', this.maintenance);
  }

  /** Called explicitly after the host runs its catalog migration. */
  async ready(context: UserContext): Promise<void> {
    requireRuntimeCapabilities(context, ['blob.v1']);
    await this.catalog.validateSchema();
    await this.upload.validateVerifierReady();
  }
}
