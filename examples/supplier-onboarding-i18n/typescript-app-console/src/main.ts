import { readFileSync } from "node:fs";
import { CatalogData, CheckException, checkResultToWire, I18nCatalog,
         UnsupportedLocaleError, UserContext } from "teaql-ts";
import { SQLiteTeaQLClient } from "teaql-ts/sql/sqlite";
import { Q } from "../../typescript-lib-core/src/generated/Q";
import { GENERATED_RUNTIME_MODULE } from "../../typescript-lib-core/src/runtime-module";

interface Registration {
    name: string | null;
    minimum_order_quantity: number;
}

type Step =
    | { operation: "select"; context: string; locale: string }
    | { operation: "validate"; context: string; case: string; input: Registration }
    | { operation: "install-catalog"; context: string; path: string }
    | { operation: "verify-unchanged"; context: string };

interface Scenario {
    database: string;
    warehouse: { id: number };
    steps: Step[];
}

function emit(step: Step, context: UserContext, type: string, details: object = {}) {
    console.log("TEAQL_I18N_SHOWCASE " + JSON.stringify({
        type, context: step.context, effectiveLocale: context.locale, ...details,
    }));
}

async function verifyFailure(step: Extract<Step, {operation: "validate"}>, context: UserContext, warehouseId: number) {
    const supplier = Q.suppliers().comment("Prepare supplier registration")
        .purpose("Register a supplier for warehouse purchasing").newEntity(context);
    supplier.updateWarehouse(warehouseId);
    if (step.input.name !== null) supplier.updateName(step.input.name);
    supplier.updateMinimumOrderQuantity(step.input.minimum_order_quantity);
    try {
        await supplier.auditAs("Register the supplier for purchasing").save(context);
    } catch (error) {
        if (!(error instanceof CheckException) || error.violations.length !== 1) throw error;
        const [violation] = error.violations;
        const wire = checkResultToWire(violation);
        const rule = violation.ruleId.toLowerCase();
        if (rule !== "required" && rule !== "min") throw error;
        const argumentsForRule = rule === "min" ? { minimum: Number(wire.systemValue) } : {};
        emit(step, context, "validation", {
            case: step.case, messageKey: `checker.${rule}`, nativeRule: violation.ruleId,
            location: violation.location.modelPath(), arguments: argumentsForRule, message: wire.message,
            nativeArguments: { inputValue: wire.inputValue, systemValue: wire.systemValue },
        });
        return;
    }
    throw new Error(`Invalid supplier registration was stored: ${step.case}`);
}

async function main() {
    const plan: Scenario = JSON.parse(readFileSync(0, "utf8"));
    const clients: SQLiteTeaQLClient[] = [];
    try {
        const createContext = () => {
            const client = new SQLiteTeaQLClient(plan.database, {});
            clients.push(client);
            client.install(GENERATED_RUNTIME_MODULE);
            const context = new UserContext().insertResource("dataService", client);
            // The SQL client uses its bound Context during Checker and Fix.
            client.setUserContext(context);
            return context;
        };
        const contexts = new Map([["main", createContext()], ["independent", createContext()]]);
        await contexts.get("main")!.ensureSchema();
        for (const step of plan.steps) {
            const context = contexts.get(step.context);
            if (!context) throw new Error(`Unknown example context: ${step.context}`);
            switch (step.operation) {
                case "select":
                    try {
                        context.setLocaleCode(step.locale);
                        emit(step, context, "locale", { requestedLocale: step.locale, accepted: true });
                    } catch (error) {
                        if (!(error instanceof UnsupportedLocaleError)) throw error;
                        emit(step, context, "locale", {
                            requestedLocale: error.localeCode, accepted: false,
                            nativeError: error.constructor.name,
                        });
                    }
                    break;
                case "validate":
                    await verifyFailure(step, context, plan.warehouse.id);
                    break;
                case "install-catalog": {
                    const catalog: CatalogData = JSON.parse(readFileSync(step.path, "utf8"));
                    context.installI18nCatalog(new I18nCatalog(catalog, I18nCatalog.builtin));
                    emit(step, context, "catalog-installed");
                    break;
                }
                case "verify-unchanged": {
                    const rows = await Q.suppliersWithMinimalFields().limit(1)
                        .comment("Check the rejected registrations").purpose("Verify no invalid supplier was stored")
                        .executeForList(context);
                    emit(step, context, "storage", { supplierCount: rows.length });
                    break;
                }
            }
        }
    } finally {
        await Promise.all(clients.map(client => client.close()));
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
