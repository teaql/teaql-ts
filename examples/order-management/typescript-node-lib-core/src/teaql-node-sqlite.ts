import {
    SQLiteDriver,
    SQLiteTeaQLClient as RuntimeSQLiteTeaQLClient
} from "teaql-ts/sql/sqlite";
import { OrderBy, SelectQuery as RuntimeSelectQuery } from "teaql-ts";
import { ENTITY_SCHEMAS } from "./teaql-node-sql";

export { SQLiteDriver } from "teaql-ts/sql/sqlite";

export class SQLiteTeaQLClient extends RuntimeSQLiteTeaQLClient {
    constructor(filename: string) {
        super(filename, ENTITY_SCHEMAS);
    }

    async executeQuery<T = any>(query: any): Promise<T[]> {
        if (typeof query?.prepareForList === "function") {
            return super.executeQuery<T>(query);
        }
        const adapted = new RuntimeSelectQuery(query.entity);
        adapted.comment(query._comment ?? "legacy generated order example");
        adapted.purpose(query._purpose ?? "verify local runtime compatibility");
        adapted.filterCondition = query._filters?.length ? { $and: query._filters } : null;
        adapted.limitValue = query._limit ?? 0;
        adapted.offsetValue = query._offset ?? 0;
        adapted.orderItems = (query._orderBy ?? []).map((item: any) =>
            item.d === "desc" ? OrderBy.desc(item.f) : OrderBy.asc(item.f));
        adapted.groupByItems = query._groupBy ?? [];
        adapted.aggregateItems = query._aggregates ?? [];
        return super.executeQuery<T>(adapted);
    }
}
