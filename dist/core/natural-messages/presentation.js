"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Entity_fields, _CheckerPresentationModel_entities, _CheckerPresentationModel_current, _CheckerPresentation_steps;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckerPresentation = exports.CheckerPresentationModel = exports.checkerCountingUnit = exports.sanitize = void 0;
const presentation_defaults_v1_json_1 = __importDefault(require("./presentation-defaults-v1.json"));
const i18n_1 = require("../i18n");
const catalog_1 = require("./catalog");
const invalid = () => { throw new TypeError('Invalid Checker presentation metadata'); };
function sanitize(value) { return value.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, ' ').trim(); }
exports.sanitize = sanitize;
function labels(value) {
    const result = Object.create(null);
    for (const [code, label] of Object.entries((0, catalog_1.object)(value))) {
        const locale = (0, i18n_1.parseLocale)(code);
        if (Object.prototype.hasOwnProperty.call(result, locale))
            return invalid();
        result[locale] = (0, catalog_1.text)(label);
    }
    return Object.freeze(result);
}
const defaults = presentation_defaults_v1_json_1.default.locales;
for (const locale of i18n_1.locales) {
    for (const value of Object.values(defaults[locale]))
        if (!value || sanitize(value) !== value)
            invalid();
    Object.freeze(defaults[locale]);
}
Object.freeze(defaults);
function checkerCountingUnit(locale, unit) { return defaults[locale][unit]; }
exports.checkerCountingUnit = checkerCountingUnit;
class Entity {
    constructor(value) {
        _Entity_fields.set(this, void 0);
        const data = (0, catalog_1.object)(value);
        (0, catalog_1.keys)(data, ['labels', 'fields']);
        this.labels = labels(data.labels ?? {});
        if (!Array.isArray(data.fields))
            throw new TypeError('Invalid Checker presentation fields');
        const index = new Map();
        const canonical = [];
        for (const value of data.fields) {
            const source = (0, catalog_1.object)(value);
            (0, catalog_1.keys)(source, ['name', 'targetType', 'labels', 'classifiers', 'aliases']);
            const name = (0, catalog_1.text)(source.name), targetType = source.targetType === undefined ? undefined : (0, catalog_1.text)(source.targetType);
            if (source.aliases !== undefined && !Array.isArray(source.aliases))
                throw new TypeError('Invalid Checker presentation aliases');
            const aliases = Object.freeze((source.aliases ?? []).map(catalog_1.text));
            const field = Object.freeze({ name, targetType, labels: labels(source.labels ?? {}), classifiers: labels(source.classifiers ?? {}), aliases });
            for (const identity of [name, ...aliases]) {
                if (index.has(identity))
                    throw new TypeError('Ambiguous Checker presentation identity');
                index.set(identity, field);
            }
            canonical.push(field);
        }
        __classPrivateFieldSet(this, _Entity_fields, index, "f");
        const sorted = (data) => Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
        this.fingerprint = JSON.stringify([sorted(this.labels), canonical.sort((a, b) => a.name.localeCompare(b.name)).map(f => [f.name, f.targetType, sorted(f.labels), sorted(f.classifiers), [...f.aliases].sort()])]);
        Object.freeze(this);
    }
    field(name) { return __classPrivateFieldGet(this, _Entity_fields, "f").get(name); }
}
_Entity_fields = new WeakMap();
/** Shared model metadata. All public labels/descriptors are frozen copies. */
class CheckerPresentationModel {
    constructor(revision, entities, current) {
        this.revision = revision;
        _CheckerPresentationModel_entities.set(this, void 0);
        _CheckerPresentationModel_current.set(this, void 0);
        __classPrivateFieldSet(this, _CheckerPresentationModel_entities, entities, "f");
        __classPrivateFieldSet(this, _CheckerPresentationModel_current, current, "f");
        Object.freeze(this);
    }
    static fromJson(source) {
        const root = (0, catalog_1.object)((0, catalog_1.strictJson)(source));
        (0, catalog_1.keys)(root, ['schema', 'revision', 'entities', 'currentObject']);
        if (root.schema !== 'teaql.checker-model/v1')
            return invalid();
        const revision = (0, catalog_1.text)(root.revision), entities = new Map();
        for (const [identity, value] of Object.entries((0, catalog_1.object)(root.entities))) {
            (0, catalog_1.text)(identity);
            entities.set(identity, new Entity(value));
        }
        return new CheckerPresentationModel(revision, entities, Object.freeze({ ...__classPrivateFieldGet(this.empty, _CheckerPresentationModel_current, "f"), ...labels(root.currentObject ?? {}) }));
    }
    entity(name) { return name === undefined ? undefined : __classPrivateFieldGet(this, _CheckerPresentationModel_entities, "f").get(name); }
    currentLabels() { return __classPrivateFieldGet(this, _CheckerPresentationModel_current, "f"); }
    merge(other) {
        if (this === CheckerPresentationModel.empty)
            return other;
        if (other === CheckerPresentationModel.empty || this === other)
            return this;
        const entities = new Map(__classPrivateFieldGet(this, _CheckerPresentationModel_entities, "f"));
        let changed = false;
        for (const [key, entity] of __classPrivateFieldGet(other, _CheckerPresentationModel_entities, "f")) {
            const previous = entities.get(key);
            if (previous && previous.fingerprint !== entity.fingerprint)
                return invalid();
            if (!previous) {
                entities.set(key, entity);
                changed = true;
            }
        }
        for (const locale of i18n_1.locales)
            if (__classPrivateFieldGet(this, _CheckerPresentationModel_current, "f")[locale] !== __classPrivateFieldGet(other, _CheckerPresentationModel_current, "f")[locale])
                return invalid();
        return changed ? new CheckerPresentationModel(this.revision + '+' + other.revision, entities, __classPrivateFieldGet(this, _CheckerPresentationModel_current, "f")) : this;
    }
}
exports.CheckerPresentationModel = CheckerPresentationModel;
_CheckerPresentationModel_entities = new WeakMap(), _CheckerPresentationModel_current = new WeakMap();
CheckerPresentationModel.empty = new CheckerPresentationModel('unconfigured', new Map(), Object.freeze(Object.fromEntries(i18n_1.locales.map(locale => [locale, defaults[locale].currentObject]))));
/** Finite path and immutable model only: no entity values, Context or service. */
class CheckerPresentation {
    constructor(model, origin, shape, steps) {
        this.model = model;
        this.origin = origin;
        this.shape = shape;
        _CheckerPresentation_steps.set(this, void 0);
        __classPrivateFieldSet(this, _CheckerPresentation_steps, steps, "f");
        Object.freeze(this);
    }
    static capture(model, origin, location) {
        let entity = model.entity(origin), unusual = !entity;
        const steps = [];
        for (const segment of location.segments) {
            if (segment.kind === 'property') {
                const field = entity?.field(segment.name);
                entity = model.entity(field?.targetType);
                steps.push({ identity: segment.name, field, indices: [] });
            }
            else {
                if (!Number.isSafeInteger(segment.index) || segment.index < 0)
                    return invalid();
                if (!steps.length) {
                    steps.push({ indices: [] });
                    unusual = true;
                }
                const step = steps[steps.length - 1];
                step.indices.push(segment.index);
                if (step.indices.length > 1)
                    unusual = true;
            }
        }
        if (!steps.length || steps[steps.length - 1].indices.length)
            unusual = true;
        const shape = unusual || steps.length > 2 ? 'deep' : steps.length === 1 ? 'one' : 'two';
        return new CheckerPresentation(model, origin, shape, Object.freeze(steps.map(step => Object.freeze({ ...step, indices: Object.freeze(step.indices) }))));
    }
    relocate(location) { return CheckerPresentation.capture(this.model, this.origin, location); }
    render(catalog, selection, safe) {
        const warnings = new Set(), locale = selection.locale;
        const vocabulary = (labels, identity) => {
            let label = labels[locale];
            if (!label?.trim()) {
                warnings.add('CHECKER_MESSAGE_LABEL_FALLBACK');
                label = labels.en;
            }
            const value = sanitize(label?.trim() ? label : identity.replace(/_/g, ' '));
            if (value)
                return value;
            warnings.add('CHECKER_MESSAGE_LABEL_FALLBACK');
            return defaults[locale].currentObject;
        };
        const current = () => vocabulary(this.model.currentLabels(), 'current object');
        const rootEntity = this.model.entity(this.origin), root = rootEntity ? vocabulary(rootEntity.labels, this.origin) : current();
        const label = (step) => vocabulary(step.field?.labels ?? {}, step.field?.name ?? step.identity ?? 'current object');
        const leaf = __classPrivateFieldGet(this, _CheckerPresentation_steps, "f")[__classPrivateFieldGet(this, _CheckerPresentation_steps, "f").length - 1];
        const args = Object.fromEntries(['system', 'input', 'input_len', 'unit'].filter(key => Object.prototype.hasOwnProperty.call(safe, key)).map(key => [key, safe[key]]));
        args.field = leaf?.identity ? label(leaf) : root;
        const ownerCount = __classPrivateFieldGet(this, _CheckerPresentation_steps, "f").length - (leaf?.identity && !leaf.indices.length ? 1 : 0), owners = [];
        for (const step of __classPrivateFieldGet(this, _CheckerPresentation_steps, "f").slice(0, ownerCount)) {
            const relation = step.identity ? label(step) : root;
            if (!step.indices.length)
                owners.push(catalog.reference(locale, relation));
            else
                for (let j = 0; j < step.indices.length; j++)
                    owners.push(catalog.item(locale, j === 0 ? relation : current(), step.indices[j], sanitize(step.field?.classifiers[locale] ?? (locale === 'zh-CN' || locale === 'zh-TW' ? '项' : ''))));
        }
        args.object = owners[0] ?? root;
        args.objectPath = owners.length ? owners.join(catalog.separator(locale)) : root;
        return Object.freeze({ message: selection.render(args), warnings: Object.freeze([...warnings]) });
    }
}
exports.CheckerPresentation = CheckerPresentation;
_CheckerPresentation_steps = new WeakMap();
//# sourceMappingURL=presentation.js.map