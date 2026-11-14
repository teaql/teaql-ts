"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNaturalCheckerResult = exports.bindCheckerOrigin = exports.standardCheckerMessageRenderer = exports.CheckerPresentationModel = exports.CheckerPresentation = exports.ordinal = exports.CheckerMessageCatalog = void 0;
const i18n_1 = require("../i18n");
const object_location_1 = require("../object-location");
const checker_privacy_1 = require("../checker-privacy");
const catalog_1 = require("./catalog");
const presentation_1 = require("./presentation");
var catalog_2 = require("./catalog");
Object.defineProperty(exports, "CheckerMessageCatalog", { enumerable: true, get: function () { return catalog_2.CheckerMessageCatalog; } });
Object.defineProperty(exports, "ordinal", { enumerable: true, get: function () { return catalog_2.ordinal; } });
var presentation_2 = require("./presentation");
Object.defineProperty(exports, "CheckerPresentation", { enumerable: true, get: function () { return presentation_2.CheckerPresentation; } });
Object.defineProperty(exports, "CheckerPresentationModel", { enumerable: true, get: function () { return presentation_2.CheckerPresentationModel; } });
const standardCheckerMessageRenderer = request => request.presentation.render(request.catalog, request.selection, request.arguments);
exports.standardCheckerMessageRenderer = standardCheckerMessageRenderer;
const token = Symbol('TeaQL.NaturalCheckerPresentation');
const bindings = new WeakMap();
const binding = (result) => { const key = result[token]; return key && bindings.get(key); };
function retain(result, presentation, automaticMessage, plan) {
    const key = Object.freeze({});
    bindings.set(key, Object.freeze({ presentation, automaticMessage, plan }));
    Object.defineProperty(result, token, { value: key, enumerable: true, configurable: true });
}
function automatic(result) {
    const state = binding(result);
    return state?.automaticMessage !== undefined && state.automaticMessage === result.message || (0, checker_privacy_1.checkerRenderingWasAutomatic)(result);
}
/** Runtime Checker admission supplies the actual local origin, never a type guessed from an error. */
function bindCheckerOrigin(results, origin) {
    return results.map(result => {
        const copy = { ...result }, auto = automatic(result);
        retain(copy, presentation_1.CheckerPresentation.capture(origin.model, origin.entity, result.location), auto ? result.message : undefined, auto ? binding(result)?.plan : undefined);
        return copy;
    });
}
exports.bindCheckerOrigin = bindCheckerOrigin;
const ruleKeys = Object.freeze({ required: 'checker.required', min: 'checker.min', max: 'checker.max', min_str_len: 'checker.minLength', min_length: 'checker.minLength', max_str_len: 'checker.maxLength', max_length: 'checker.maxLength' });
function scalar(value) {
    if (value === null)
        return 'null';
    if (value === undefined)
        return 'undefined';
    if (typeof value === 'string')
        return (0, presentation_1.sanitize)(value);
    if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean')
        return String(value);
    if (value instanceof Date && Object.getPrototypeOf(value) === Date.prototype && Number.isFinite(value.getTime()))
        return value.toISOString();
    return '[value omitted]';
}
const warningCodes = ['CHECKER_MESSAGE_LABEL_FALLBACK', 'CHECKER_MESSAGE_GENERIC_RULE', 'CHECKER_MESSAGE_RENDER_FALLBACK'];
/** Only this rule's finite Locale/depth plans survive the privacy scope. */
function preparePlan(config, result, rule) {
    const project = (text) => (0, checker_privacy_1.checkerTemplateLiteral)(result, text);
    const patterns = new Map();
    const prepared = Object.fromEntries(i18n_1.locales.map(locale => [locale, Object.freeze(Object.fromEntries(['one', 'two', 'deep'].map(shape => {
            let selection, legacy, application = false;
            for (const candidate of [locale, 'en']) {
                selection = config.catalog.override(candidate, rule, shape);
                if (selection) {
                    application = true;
                    break;
                }
                const text = config.legacy.applicationMessage(candidate, rule);
                if (text !== undefined) {
                    legacy = Object.freeze(text.split(/(\{(?:location|system|input|input_len)\})/g).map(part => /^\{(?:location|system|input|input_len)\}$/.test(part) ? Object.freeze({ argument: part.slice(1, -1) }) : project(part)));
                    break;
                }
                selection = catalog_1.CheckerMessageCatalog.builtin.lookup(candidate, rule, shape);
                if (selection)
                    break;
            }
            const generic = !selection && !legacy;
            if (generic)
                selection = catalog_1.CheckerMessageCatalog.builtin.select(locale, 'checker.invalid', shape);
            if (selection && application)
                selection = (0, catalog_1.projectMessageSelection)(selection, project);
            const effective = selection?.locale ?? locale;
            if (!patterns.has(effective))
                patterns.set(effective, config.catalog.projectPatterns(effective, project));
            return [shape, Object.freeze({ selection, legacy, catalog: patterns.get(effective), generic, application })];
        })))]));
    return Object.freeze({ locales: Object.freeze(prepared) });
}
function projectPlan(plan, project) {
    if (plan.literal !== undefined)
        return Object.freeze({ literal: project(plan.literal) });
    const prepared = {};
    for (const locale of i18n_1.locales) {
        const shapes = {};
        for (const shape of ['one', 'two', 'deep']) {
            const item = plan.locales[locale][shape];
            shapes[shape] = Object.freeze({ ...item,
                selection: item.application && item.selection ? (0, catalog_1.projectMessageSelection)(item.selection, project) : item.selection,
                legacy: item.legacy && Object.freeze(item.legacy.map(node => typeof node === 'string' ? project(node) : node)),
                catalog: item.catalog.projectPatterns(item.selection?.locale ?? locale, project) });
        }
        prepared[locale] = Object.freeze(shapes);
    }
    return Object.freeze({ locales: Object.freeze(prepared) });
}
function safeArguments(result, locale) {
    return Object.freeze({ system: scalar(result.systemValue), input: scalar(result.inputValue), input_len: String((0, checker_privacy_1.checkerInputLength)(result)), unit: (0, presentation_1.checkerCountingUnit)(locale, 'scalar') });
}
function renderPlan(plan, presentation, result, locale) {
    if (plan.literal !== undefined)
        return Object.freeze({ message: plan.literal, warnings: Object.freeze([]) });
    const item = plan.locales[locale][presentation.shape], args = safeArguments(result, item.selection?.locale ?? locale);
    if (item.legacy) {
        const values = { ...args, location: result.location.nativePath() };
        return Object.freeze({ message: item.legacy.map(node => typeof node === 'string' ? node : values[node.argument] ?? '-').join(''), warnings: Object.freeze([]) });
    }
    const output = presentation.render(item.catalog, item.selection, args);
    return item.generic ? Object.freeze({ ...output, warnings: Object.freeze([...output.warnings, 'CHECKER_MESSAGE_GENERIC_RULE']) }) : output;
}
function renderNaturalCheckerResult(config, result, warnings = new Set(), force) {
    // A safe customer literal is authoritative, even for a known built-in rule.
    if (result.message?.trim() && !automatic(result))
        return result;
    const warn = (code) => {
        const known = warningCodes.includes(code) ? code : 'CHECKER_MESSAGE_RENDER_FALLBACK';
        if (!warnings.has(known)) {
            warnings.add(known);
            try {
                config.warning(known);
            }
            catch { /* Diagnostics cannot replace validation. */ }
        }
    };
    const previous = binding(result), model = force?.model ?? previous?.presentation.model ?? config.model;
    const origin = force?.entity ?? previous?.presentation.origin;
    let presentation;
    try {
        presentation = presentation_1.CheckerPresentation.capture(model, origin, result.location);
    }
    catch {
        warn('CHECKER_MESSAGE_RENDER_FALLBACK');
        presentation = presentation_1.CheckerPresentation.capture(presentation_1.CheckerPresentationModel.empty, undefined, object_location_1.ObjectLocation.root());
    }
    const rule = ruleKeys[result.ruleId.toLowerCase()] ?? `checker.${result.ruleId.toLowerCase()}`;
    const locale = (0, i18n_1.parseLocale)(config.locale); // Invalid explicit Locale remains a typed error.
    let plan = automatic(result) ? previous?.plan : undefined;
    if (plan)
        plan = projectPlan(plan, literal => (0, checker_privacy_1.checkerTemplateLiteral)(result, literal));
    try {
        let output;
        if (plan)
            output = renderPlan(plan, presentation, result, locale);
        else {
            plan = preparePlan(config, result, rule);
            const item = plan.locales[locale][presentation.shape];
            if (config.renderer === exports.standardCheckerMessageRenderer || item.legacy)
                output = renderPlan(plan, presentation, result, locale);
            else {
                const request = Object.freeze({ presentation, catalog: item.catalog, selection: item.selection, arguments: safeArguments(result, item.selection.locale) });
                const custom = config.renderer(request);
                output = Object.freeze({ ...custom, message: (0, checker_privacy_1.checkerTemplateLiteral)(result, custom.message) });
                plan = Object.freeze({ literal: output.message });
            }
        }
        if (!output || typeof output.message !== 'string' || !output.message.trim())
            throw new Error('Empty rendered message');
        for (const warning of output.warnings)
            warn(warning);
        result.message = output.message;
    }
    catch {
        warn('CHECKER_MESSAGE_RENDER_FALLBACK');
        const fallback = presentation.render(catalog_1.CheckerMessageCatalog.builtin, catalog_1.CheckerMessageCatalog.builtin.select(locale, 'checker.invalid', presentation.shape), {});
        result.message = fallback.message;
        for (const warning of fallback.warnings)
            warn(warning);
        plan = Object.freeze({ literal: result.message });
    }
    retain(result, presentation, result.message, plan);
    (0, checker_privacy_1.markCheckerRendering)(result);
    return result;
}
exports.renderNaturalCheckerResult = renderNaturalCheckerResult;
//# sourceMappingURL=index.js.map