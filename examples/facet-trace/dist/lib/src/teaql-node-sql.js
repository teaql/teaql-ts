"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTITY_SCHEMAS = void 0;
exports.ENTITY_SCHEMAS = {
    "Platform": {
        table: "platform_data",
        auditMaskFields: ["name"],
        columns: { "id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "baseUrl": { columnName: "base_url", modelName: "base_url", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "createTime": { columnName: "create_time", modelName: "create_time", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "updateTime": { columnName: "update_time", modelName: "update_time", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false } },
        relations: { "schoolTypeList": { targetEntity: "SchoolType", localKey: "id", foreignKey: "platform", many: true }, "schoolList": { targetEntity: "School", localKey: "id", foreignKey: "platform", many: true } }
    },
    "SchoolType": {
        table: "school_type_data",
        auditMaskFields: [],
        columns: { "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "code": { columnName: "code", modelName: "code", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "displayOrder": { columnName: "display_order", modelName: "display_order", logPolicy: "plain", logicalType: "decimal", decode: "number", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false } },
        relations: { "platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "schoolList": { targetEntity: "School", localKey: "id", foreignKey: "schoolType", many: true } }
    },
    "School": {
        table: "school_data",
        auditMaskFields: ["name"],
        columns: { "id": { columnName: "id", modelName: "id", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "platform": { columnName: "platform", modelName: "platform", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "schoolType": { columnName: "school_type", modelName: "school_type", logPolicy: "plain", logicalType: "integer", decode: "string", nullable: false }, "name": { columnName: "name", modelName: "name", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "address": { columnName: "address", modelName: "address", logPolicy: "plain", logicalType: "text", decode: "native", nullable: false }, "establishedDate": { columnName: "established_date", modelName: "established_date", logPolicy: "plain", logicalType: "date", decode: "date", nullable: false }, "studentCapacity": { columnName: "student_capacity", modelName: "student_capacity", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false }, "active": { columnName: "active", modelName: "active", logPolicy: "plain", logicalType: "boolean", decode: "native", nullable: false }, "createTime": { columnName: "create_time", modelName: "create_time", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "updateTime": { columnName: "update_time", modelName: "update_time", logPolicy: "plain", logicalType: "datetime", decode: "date", nullable: false }, "version": { columnName: "version", modelName: "version", logPolicy: "plain", logicalType: "integer", decode: "number", nullable: false } },
        relations: { "platform": { targetEntity: "Platform", localKey: "platform", foreignKey: "id", many: false }, "schoolType": { targetEntity: "SchoolType", localKey: "schoolType", foreignKey: "id", many: false } }
    }
};
