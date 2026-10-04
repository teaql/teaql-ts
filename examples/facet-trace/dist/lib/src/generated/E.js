"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.E = exports.SchoolListExpression = exports.SchoolTypeListExpression = exports.PlatformListExpression = exports.SchoolExpression = exports.SchoolTypeExpression = exports.PlatformExpression = exports.ValueExpression = exports.TeaQLNotLoadedError = void 0;
const Platform_1 = require("./models/Platform");
const SchoolType_1 = require("./models/SchoolType");
class TeaQLNotLoadedError extends Error {
    root;
    accessPath;
    breakPoint;
    details;
    constructor(root, accessPath, breakPoint) {
        const suggestedFix = `select${breakPoint.charAt(0).toUpperCase()}${breakPoint.slice(1)}(...)`;
        const details = {
            error: 'TeaQLNotLoadedError',
            root,
            accessPath: accessPath.split('.'),
            breakPoint,
            missingPreload: [breakPoint],
            suggestedFix,
            severity: 'error',
            humanMessage: `访问 ${root}.${accessPath} 时缺少预加载。请在查询中加入 ${suggestedFix}`,
        };
        super(JSON.stringify(details));
        this.root = root;
        this.accessPath = accessPath;
        this.breakPoint = breakPoint;
        this.name = 'TeaQLNotLoadedError';
        this.details = details;
    }
}
exports.TeaQLNotLoadedError = TeaQLNotLoadedError;
function expressionPath(prefix, field) {
    return prefix ? `${prefix}.${field}` : field;
}
class ValueExpression {
    value;
    present;
    notLoaded;
    constructor(value, present = true, notLoaded) {
        this.value = value;
        this.present = present;
        this.notLoaded = notLoaded;
    }
    static missing() {
        return new ValueExpression(undefined, false);
    }
    static notLoaded(error) {
        return new ValueExpression(undefined, false, error);
    }
    eval() {
        if (this.notLoaded)
            throw this.notLoaded;
        return this.present ? this.value : undefined;
    }
    isPresent() {
        if (this.notLoaded)
            throw this.notLoaded;
        return this.present;
    }
    orElse(fallback) {
        const value = this.eval();
        return this.present && value != null ? value : fallback;
    }
}
exports.ValueExpression = ValueExpression;
class PlatformExpression {
    value;
    root;
    path;
    notLoaded;
    constructor(value, root = 'Platform(null)', path = '', notLoaded) {
        this.value = value;
        this.root = root;
        this.path = path;
        this.notLoaded = notLoaded;
    }
    eval() {
        if (this.notLoaded)
            throw this.notLoaded;
        return this.value;
    }
    id() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'id'));
        }
        return new ValueExpression(this.value.id);
    }
    name() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'name');
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'name'));
        }
        return new ValueExpression(this.value.name);
    }
    baseUrl() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'baseUrl');
        if (!this.value.isLoaded('baseUrl')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'baseUrl'));
        }
        return new ValueExpression(this.value.baseUrl);
    }
    createTime() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'createTime');
        if (!this.value.isLoaded('createTime')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'createTime'));
        }
        return new ValueExpression(this.value.createTime);
    }
    updateTime() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'updateTime');
        if (!this.value.isLoaded('updateTime')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'updateTime'));
        }
        return new ValueExpression(this.value.updateTime);
    }
    version() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'version'));
        }
        return new ValueExpression(this.value.version);
    }
    schoolTypeList() {
        const path = expressionPath(this.path, 'schoolTypeList');
        if (this.notLoaded) {
            return new SchoolTypeListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value)
            return SchoolTypeListExpression.missing(this.root, path);
        if (!this.value.isLoaded('schoolTypeList')) {
            return new SchoolTypeListExpression([], this.root, path, false, new TeaQLNotLoadedError(this.root, path, 'schoolTypeList'));
        }
        return new SchoolTypeListExpression(this.value.schoolTypeList(), this.root, path);
    }
    schoolList() {
        const path = expressionPath(this.path, 'schoolList');
        if (this.notLoaded) {
            return new SchoolListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value)
            return SchoolListExpression.missing(this.root, path);
        if (!this.value.isLoaded('schoolList')) {
            return new SchoolListExpression([], this.root, path, false, new TeaQLNotLoadedError(this.root, path, 'schoolList'));
        }
        return new SchoolListExpression(this.value.schoolList(), this.root, path);
    }
}
exports.PlatformExpression = PlatformExpression;
class SchoolTypeExpression {
    value;
    root;
    path;
    notLoaded;
    constructor(value, root = 'SchoolType(null)', path = '', notLoaded) {
        this.value = value;
        this.root = root;
        this.path = path;
        this.notLoaded = notLoaded;
    }
    eval() {
        if (this.notLoaded)
            throw this.notLoaded;
        return this.value;
    }
    id() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'id'));
        }
        return new ValueExpression(this.value.id);
    }
    name() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'name');
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'name'));
        }
        return new ValueExpression(this.value.name);
    }
    code() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'code');
        if (!this.value.isLoaded('code')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'code'));
        }
        return new ValueExpression(this.value.code);
    }
    displayOrder() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'displayOrder');
        if (!this.value.isLoaded('displayOrder')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'displayOrder'));
        }
        return new ValueExpression(this.value.displayOrder);
    }
    version() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'version'));
        }
        return new ValueExpression(this.value.version);
    }
    platformId() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'platform');
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'platform'));
        }
        const relation = this.value.platform;
        return new ValueExpression(relation != null && typeof relation === 'object' ? relation.id : relation);
    }
    platform() {
        const path = expressionPath(this.path, 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value)
            return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path, new TeaQLNotLoadedError(this.root, path, 'platform'));
        }
        const relation = this.value.platform;
        const target = relation == null
            ? undefined
            : relation instanceof Platform_1.Platform
                ? relation
                : Platform_1.Platform.fromRecord({ id: relation });
        return new PlatformExpression(target, this.root, path);
    }
    schoolList() {
        const path = expressionPath(this.path, 'schoolList');
        if (this.notLoaded) {
            return new SchoolListExpression([], this.root, path, false, this.notLoaded);
        }
        if (!this.value)
            return SchoolListExpression.missing(this.root, path);
        if (!this.value.isLoaded('schoolList')) {
            return new SchoolListExpression([], this.root, path, false, new TeaQLNotLoadedError(this.root, path, 'schoolList'));
        }
        return new SchoolListExpression(this.value.schoolList(), this.root, path);
    }
}
exports.SchoolTypeExpression = SchoolTypeExpression;
class SchoolExpression {
    value;
    root;
    path;
    notLoaded;
    constructor(value, root = 'School(null)', path = '', notLoaded) {
        this.value = value;
        this.root = root;
        this.path = path;
        this.notLoaded = notLoaded;
    }
    eval() {
        if (this.notLoaded)
            throw this.notLoaded;
        return this.value;
    }
    id() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'id');
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'id'));
        }
        return new ValueExpression(this.value.id);
    }
    name() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'name');
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'name'));
        }
        return new ValueExpression(this.value.name);
    }
    address() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'address');
        if (!this.value.isLoaded('address')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'address'));
        }
        return new ValueExpression(this.value.address);
    }
    establishedDate() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'establishedDate');
        if (!this.value.isLoaded('establishedDate')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'establishedDate'));
        }
        return new ValueExpression(this.value.establishedDate);
    }
    studentCapacity() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'studentCapacity');
        if (!this.value.isLoaded('studentCapacity')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'studentCapacity'));
        }
        return new ValueExpression(this.value.studentCapacity);
    }
    active() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'active');
        if (!this.value.isLoaded('active')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'active'));
        }
        return new ValueExpression(this.value.active);
    }
    createTime() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'createTime');
        if (!this.value.isLoaded('createTime')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'createTime'));
        }
        return new ValueExpression(this.value.createTime);
    }
    updateTime() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'updateTime');
        if (!this.value.isLoaded('updateTime')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'updateTime'));
        }
        return new ValueExpression(this.value.updateTime);
    }
    version() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'version');
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'version'));
        }
        return new ValueExpression(this.value.version);
    }
    platformId() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'platform');
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'platform'));
        }
        const relation = this.value.platform;
        return new ValueExpression(relation != null && typeof relation === 'object' ? relation.id : relation);
    }
    schoolTypeId() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        if (!this.value)
            return ValueExpression.missing();
        const path = expressionPath(this.path, 'schoolType');
        if (!this.value.isLoaded('schoolType')) {
            return ValueExpression.notLoaded(new TeaQLNotLoadedError(this.root, path, 'schoolType'));
        }
        const relation = this.value.schoolType;
        return new ValueExpression(relation != null && typeof relation === 'object' ? relation.id : relation);
    }
    platform() {
        const path = expressionPath(this.path, 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value)
            return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path, new TeaQLNotLoadedError(this.root, path, 'platform'));
        }
        const relation = this.value.platform;
        const target = relation == null
            ? undefined
            : relation instanceof Platform_1.Platform
                ? relation
                : Platform_1.Platform.fromRecord({ id: relation });
        return new PlatformExpression(target, this.root, path);
    }
    schoolType() {
        const path = expressionPath(this.path, 'schoolType');
        if (this.notLoaded) {
            return new SchoolTypeExpression(undefined, this.root, path, this.notLoaded);
        }
        if (!this.value)
            return new SchoolTypeExpression(undefined, this.root, path);
        if (!this.value.isLoaded('schoolType')) {
            return new SchoolTypeExpression(undefined, this.root, path, new TeaQLNotLoadedError(this.root, path, 'schoolType'));
        }
        const relation = this.value.schoolType;
        const target = relation == null
            ? undefined
            : relation instanceof SchoolType_1.SchoolType
                ? relation
                : SchoolType_1.SchoolType.fromRecord({ id: relation });
        return new SchoolTypeExpression(target, this.root, path);
    }
}
exports.SchoolExpression = SchoolExpression;
class PlatformListExpression {
    items;
    root;
    path;
    present;
    notLoaded;
    constructor(items, root = 'Platform(null)', path = '', present = true, notLoaded) {
        this.items = items;
        this.root = root;
        this.path = path;
        this.present = present;
        this.notLoaded = notLoaded;
    }
    static missing(root, path = '') {
        return new PlatformListExpression([], root, path, false);
    }
    size() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        return this.present
            ? new ValueExpression(this.items.length)
            : ValueExpression.missing();
    }
    first() {
        return this.get(0);
    }
    get(index) {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new PlatformExpression(undefined, this.root, itemPath)
            : new PlatformExpression(this.items[index], this.root, itemPath);
    }
}
exports.PlatformListExpression = PlatformListExpression;
class SchoolTypeListExpression {
    items;
    root;
    path;
    present;
    notLoaded;
    constructor(items, root = 'SchoolType(null)', path = '', present = true, notLoaded) {
        this.items = items;
        this.root = root;
        this.path = path;
        this.present = present;
        this.notLoaded = notLoaded;
    }
    static missing(root, path = '') {
        return new SchoolTypeListExpression([], root, path, false);
    }
    size() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        return this.present
            ? new ValueExpression(this.items.length)
            : ValueExpression.missing();
    }
    first() {
        return this.get(0);
    }
    get(index) {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new SchoolTypeExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new SchoolTypeExpression(undefined, this.root, itemPath)
            : new SchoolTypeExpression(this.items[index], this.root, itemPath);
    }
}
exports.SchoolTypeListExpression = SchoolTypeListExpression;
class SchoolListExpression {
    items;
    root;
    path;
    present;
    notLoaded;
    constructor(items, root = 'School(null)', path = '', present = true, notLoaded) {
        this.items = items;
        this.root = root;
        this.path = path;
        this.present = present;
        this.notLoaded = notLoaded;
    }
    static missing(root, path = '') {
        return new SchoolListExpression([], root, path, false);
    }
    size() {
        if (this.notLoaded)
            return ValueExpression.notLoaded(this.notLoaded);
        return this.present
            ? new ValueExpression(this.items.length)
            : ValueExpression.missing();
    }
    first() {
        return this.get(0);
    }
    get(index) {
        const itemPath = expressionPath(this.path, `get(${index})`);
        if (this.notLoaded) {
            return new SchoolExpression(undefined, this.root, itemPath, this.notLoaded);
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new SchoolExpression(undefined, this.root, itemPath)
            : new SchoolExpression(this.items[index], this.root, itemPath);
    }
}
exports.SchoolListExpression = SchoolListExpression;
class E {
    static platform(value) {
        return new PlatformExpression(value, `Platform(id=${value?.id ?? 'null'})`);
    }
    static schoolType(value) {
        return new SchoolTypeExpression(value, `SchoolType(id=${value?.id ?? 'null'})`);
    }
    static school(value) {
        return new SchoolExpression(value, `School(id=${value?.id ?? 'null'})`);
    }
}
exports.E = E;
