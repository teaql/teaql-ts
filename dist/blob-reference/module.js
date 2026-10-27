"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlobReferenceModule = void 0;
const runtime_capability_1 = require("../core/runtime-capability");
const sql_catalog_1 = require("./sql-catalog");
const upload_service_1 = require("./upload-service");
const mutation_participant_1 = require("./mutation-participant");
const read_service_1 = require("./read-service");
/** Explicit assembly of the optional SQLite Blob runtime. Schema migration is a separate host action. */
class BlobReferenceModule {
    constructor(catalog, upload, mutation, response) {
        this.catalog = catalog;
        this.upload = upload;
        this.mutation = mutation;
        this.response = response;
        if (!(catalog instanceof sql_catalog_1.SqlBlobCatalog) || catalog.driver.databaseKind !== 'sqlite' ||
            !(upload instanceof upload_service_1.SqliteBlobUploadService) ||
            !(mutation instanceof mutation_participant_1.SqliteBlobMutationParticipant) ||
            !(response instanceof read_service_1.SqlBlobResponseContributor)) {
            throw new Error('BLOB_CAPABILITY_MISSING');
        }
    }
    install(context) {
        if (!context || ['teaql.runtime.capability:blob.v1', 'blobUploadService',
            'blobMutationParticipant', 'blobResponseContributor'].some(name => context.getResource(name))) {
            throw new Error('BLOB_CAPABILITY_MISSING');
        }
        (0, runtime_capability_1.installRuntimeCapability)(context, { name: 'blob.v1', assertReady: current => {
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
    async ready(context) {
        (0, runtime_capability_1.requireRuntimeCapabilities)(context, ['blob.v1']);
        await this.catalog.validateSchema();
    }
}
exports.BlobReferenceModule = BlobReferenceModule;
//# sourceMappingURL=module.js.map