"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlobReferenceModule = void 0;
const runtime_capability_1 = require("../core/runtime-capability");
const sql_catalog_1 = require("./sql-catalog");
const upload_service_1 = require("./upload-service");
const mutation_participant_1 = require("./mutation-participant");
const read_service_1 = require("./read-service");
const maintenance_service_1 = require("./maintenance-service");
/** Explicit assembly of the optional SQLite Blob runtime. Schema migration is a separate host action. */
class BlobReferenceModule {
    constructor(catalog, upload, mutation, response, maintenance) {
        this.catalog = catalog;
        this.upload = upload;
        this.mutation = mutation;
        this.response = response;
        this.maintenance = maintenance;
        this.assertCoherentAssembly();
    }
    assertCoherentAssembly() {
        if (!(this.catalog instanceof sql_catalog_1.SqlBlobCatalog) || this.catalog.driver.databaseKind !== 'sqlite' ||
            !(this.upload instanceof upload_service_1.SqliteBlobUploadService) ||
            !(this.mutation instanceof mutation_participant_1.SqliteBlobMutationParticipant) ||
            !(this.response instanceof read_service_1.SqlBlobResponseContributor) ||
            !this.upload.usesCatalog(this.catalog) || !this.mutation.usesCatalog(this.catalog) ||
            !this.response.usesCatalog(this.catalog) ||
            (this.maintenance !== undefined && (!(this.maintenance instanceof maintenance_service_1.SqliteBlobMaintenanceService) ||
                !this.maintenance.usesCatalog(this.catalog)))) {
            throw new Error('BLOB_CAPABILITY_MISSING');
        }
    }
    install(context) {
        this.assertCoherentAssembly();
        if (!context || ['teaql.runtime.capability:blob.v1', 'blobUploadService',
            'blobMutationParticipant', 'blobResponseContributor',
            'blobMaintenanceService'].some(name => context.getResource(name))) {
            throw new Error('BLOB_CAPABILITY_MISSING');
        }
        (0, runtime_capability_1.installRuntimeCapability)(context, { name: 'blob.v1', assertReady: current => {
                this.assertCoherentAssembly();
                const owner = current.getResource('dataService');
                let compatibleOwner = false;
                try {
                    compatibleOwner = owner?.usesSqlDatabase?.(this.catalog.driver) === true;
                }
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
        if (this.maintenance)
            context.insertResource('blobMaintenanceService', this.maintenance);
    }
    /** Called explicitly after the host runs its catalog migration. */
    async ready(context) {
        (0, runtime_capability_1.requireRuntimeCapabilities)(context, ['blob.v1']);
        await this.catalog.validateSchema();
        await this.upload.validateVerifierReady();
    }
}
exports.BlobReferenceModule = BlobReferenceModule;
//# sourceMappingURL=module.js.map