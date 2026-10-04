"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureGeneratedBootstrap = void 0;
const Q_1 = require("./generated/Q");
const Platform_1 = require("./generated/models/Platform");
const SchoolType_1 = require("./generated/models/SchoolType");
/** @internal Generated typed Mutation bootstrap; never call from application code. */
async function ensureGeneratedBootstrap(context) {
    let domainRoot = (await Q_1.Q.platforms().withIdIs('1').comment('what: locate generated Domain Root').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
    if (!domainRoot) {
        domainRoot = Platform_1.Platform.teaqlBootstrapNew('1');
        domainRoot.updateName("Campus Learning Platform");
        domainRoot.updateBaseUrl("https://campus.example.com");
        await domainRoot.auditAs('create generated Domain Root Platform').save(context);
    }
    context.withActiveRoot({ entity: 'Platform', id: domainRoot.id });
    let constantSchoolType1001 = (await Q_1.Q.schoolTypes().withIdIs("1001").comment('what: locate generated constant SchoolType(1001)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
    if (!constantSchoolType1001) {
        constantSchoolType1001 = SchoolType_1.SchoolType.teaqlBootstrapNew("1001");
        constantSchoolType1001.updatePlatform(domainRoot);
        constantSchoolType1001.updateName("Primary");
        constantSchoolType1001.updateCode("PRIMARY");
        constantSchoolType1001.updateDisplayOrder(1);
        await constantSchoolType1001.auditAs('create model constant SchoolType(1001)').save(context);
    }
    else {
        let changed = false;
        if (String(constantSchoolType1001.platform?.id ?? constantSchoolType1001.platform) !== String(domainRoot.id)) {
            constantSchoolType1001.updatePlatform(domainRoot);
            changed = true;
        }
        if (constantSchoolType1001.name !== "Primary") {
            constantSchoolType1001.updateName("Primary");
            changed = true;
        }
        if (constantSchoolType1001.code !== "PRIMARY") {
            constantSchoolType1001.updateCode("PRIMARY");
            changed = true;
        }
        if (constantSchoolType1001.displayOrder !== 1) {
            constantSchoolType1001.updateDisplayOrder(1);
            changed = true;
        }
        if (changed)
            await constantSchoolType1001.auditAs('reconcile model constant SchoolType(1001)').save(context);
    }
    let constantSchoolType1002 = (await Q_1.Q.schoolTypes().withIdIs("1002").comment('what: locate generated constant SchoolType(1002)').purpose('why: idempotent runtime bootstrap').executeForList(context))[0];
    if (!constantSchoolType1002) {
        constantSchoolType1002 = SchoolType_1.SchoolType.teaqlBootstrapNew("1002");
        constantSchoolType1002.updatePlatform(domainRoot);
        constantSchoolType1002.updateName("Secondary");
        constantSchoolType1002.updateCode("SECONDARY");
        constantSchoolType1002.updateDisplayOrder(2);
        await constantSchoolType1002.auditAs('create model constant SchoolType(1002)').save(context);
    }
    else {
        let changed = false;
        if (String(constantSchoolType1002.platform?.id ?? constantSchoolType1002.platform) !== String(domainRoot.id)) {
            constantSchoolType1002.updatePlatform(domainRoot);
            changed = true;
        }
        if (constantSchoolType1002.name !== "Secondary") {
            constantSchoolType1002.updateName("Secondary");
            changed = true;
        }
        if (constantSchoolType1002.code !== "SECONDARY") {
            constantSchoolType1002.updateCode("SECONDARY");
            changed = true;
        }
        if (constantSchoolType1002.displayOrder !== 2) {
            constantSchoolType1002.updateDisplayOrder(2);
            changed = true;
        }
        if (changed)
            await constantSchoolType1002.auditAs('reconcile model constant SchoolType(1002)').save(context);
    }
}
exports.ensureGeneratedBootstrap = ensureGeneratedBootstrap;
