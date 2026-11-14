import { CheckResult, I18nCatalog, Locale } from '../i18n';
import { CheckerMessageCatalog, MessageSelection, SafeArguments } from './catalog';
import { CheckerMessageWarning, CheckerPresentation, CheckerPresentationModel, MessageOutput } from './presentation';
export { CheckerMessageCatalog, ordinal } from './catalog';
export type { MessageShape, MessageSelection, SafeArguments } from './catalog';
export { CheckerPresentation, CheckerPresentationModel } from './presentation';
export type { CheckerMessageWarning, MessageOutput } from './presentation';
export type CheckerMessageRequest = Readonly<{
    presentation: CheckerPresentation;
    catalog: CheckerMessageCatalog;
    selection: MessageSelection;
    arguments: SafeArguments;
}>;
export type CheckerMessageRenderer = (request: CheckerMessageRequest) => MessageOutput;
export declare const standardCheckerMessageRenderer: CheckerMessageRenderer;
export type CheckerMessageConfiguration = Readonly<{
    model: CheckerPresentationModel;
    catalog: CheckerMessageCatalog;
    legacy: I18nCatalog;
    locale: Locale;
    renderer: CheckerMessageRenderer;
    warning: (code: CheckerMessageWarning) => void;
}>;
/** Immutable invocation data. No Context or entity graph in this boundary. */
export type CheckerValidationOrigin = Readonly<{
    model: CheckerPresentationModel;
    entity: string;
}>;
/** Runtime Checker admission supplies the actual local origin, never a type guessed from an error. */
export declare function bindCheckerOrigin(results: readonly CheckResult[], origin: CheckerValidationOrigin): CheckResult[];
export declare function renderNaturalCheckerResult(config: CheckerMessageConfiguration, result: CheckResult, warnings?: Set<CheckerMessageWarning>, force?: CheckerValidationOrigin): CheckResult;
//# sourceMappingURL=index.d.ts.map