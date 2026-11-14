import { Locale } from '../i18n';
import { ObjectLocation } from '../object-location';
import { CheckerMessageCatalog, MessageSelection, MessageShape, SafeArguments } from './catalog';
export type CheckerMessageWarning = 'CHECKER_MESSAGE_LABEL_FALLBACK' | 'CHECKER_MESSAGE_GENERIC_RULE' | 'CHECKER_MESSAGE_RENDER_FALLBACK';
export type MessageOutput = Readonly<{
    message: string;
    warnings: readonly CheckerMessageWarning[];
}>;
type Labels = Readonly<Partial<Record<Locale, string>>>;
type Field = Readonly<{
    name: string;
    targetType?: string;
    labels: Labels;
    classifiers: Labels;
    aliases: readonly string[];
}>;
export declare function sanitize(value: string): string;
export declare function checkerCountingUnit(locale: Locale, unit: 'utf16' | 'scalar' | 'byte'): string;
declare class Entity {
    #private;
    readonly labels: Labels;
    readonly fingerprint: string;
    constructor(value: unknown);
    field(name: string): Field | undefined;
}
/** Shared model metadata. All public labels/descriptors are frozen copies. */
export declare class CheckerPresentationModel {
    #private;
    readonly revision: string;
    static readonly empty: CheckerPresentationModel;
    private constructor();
    static fromJson(source: string): CheckerPresentationModel;
    entity(name: string | undefined): Entity | undefined;
    currentLabels(): Labels;
    merge(other: CheckerPresentationModel): CheckerPresentationModel;
}
/** Finite path and immutable model only: no entity values, Context or service. */
export declare class CheckerPresentation {
    #private;
    readonly model: CheckerPresentationModel;
    readonly origin: string | undefined;
    readonly shape: MessageShape;
    private constructor();
    static capture(model: CheckerPresentationModel, origin: string | undefined, location: ObjectLocation): CheckerPresentation;
    relocate(location: ObjectLocation): CheckerPresentation;
    render(catalog: CheckerMessageCatalog, selection: MessageSelection, safe: SafeArguments): MessageOutput;
}
export {};
//# sourceMappingURL=presentation.d.ts.map