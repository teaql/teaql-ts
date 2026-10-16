import {
  mergeDynamicSearch,
  OrderBy,
  SelectQuery,
  SmartList,
  UserContext,
  executeRelationFacets,
  type QueryOperation,
} from 'teaql-ts';
import { ORDER_STATUS } from '../order-model';

type Row = Record<string, unknown>;
type DataService = {
  executeQuery<T = Row>(query: SelectQuery): Promise<T[]>;
  executeCount(query: SelectQuery, alias?: string, operation?: QueryOperation): Promise<number>;
};

const qString = (value: string): string =>
  `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n')}'`;
const nestedQ = (request: GeneratedRequest): string =>
  request.toQExpression().replace(/\s*\n\s*/g, '');

const orderSearchModel = {
  CustomerOrder: {
    fields: {
      id: 'integer', orderNumber: 'string', orderDate: 'date', status: 'integer',
      totalAmount: 'decimal', currency: 'string', customerId: 'integer', platformId: 'integer',
    },
    relations: { status: 'OrderStatus', itemList: 'OrderItem' },
  },
  OrderStatus: {
    fields: { id: 'integer', name: 'string', code: 'string', color: 'string', displayOrder: 'integer' },
    relations: {},
  },
  OrderItem: {
    fields: { id: 'integer', orderId: 'integer', productName: 'string', sku: 'string' },
    relations: {},
  },
} as const;

function normalizeOrderSearch(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const normalized = structuredClone(input as Record<string, unknown>);
  const candidate = normalized.filter;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || !('status' in candidate)) return normalized;
  const filter = candidate as Record<string, unknown>;
  const status = filter.status;
  const idFor = (code: unknown) => {
    const id = ORDER_STATUS[String(code) as keyof typeof ORDER_STATUS];
    return id === undefined ? code : Number(id);
  };
  if (status && typeof status === 'object' && !Array.isArray(status) && '$in' in status) {
    filter.status = { $in: Array.isArray(status.$in) ? status.$in.map(idFor) : status.$in };
  } else {
    filter.status = idFor(status);
  }
  return normalized;
}

/** Generated domain request base. Application code should enter through Q, not SelectQuery. */
abstract class GeneratedRequest {
  protected readonly query: SelectQuery;
  protected readonly filters: unknown[] = [];
  private readonly qRoot: string;
  private readonly qSteps: string[] = [];
  private auditComment = '';
  private queryPurpose = '';
  private pageTotalAlias?: string;

  protected constructor(entity: string, qRoot: string) {
    this.query = new SelectQuery(entity);
    this.qRoot = qRoot;
  }

  comment(value: string): this {
    this.auditComment = value;
    this.query.comment(value);
    this.record(`comment(${qString(value)})`);
    return this;
  }

  purpose(value: string): this {
    this.queryPurpose = value;
    this.query.purpose(value);
    this.record(`purpose(${qString(value)})`);
    return this;
  }

  limit(value: number): this { this.query.limit(value); this.record(`limit(${value})`); return this; }
  offset(value: number): this { this.query.offset(value); this.record(`offset(${value})`); return this; }

  /** The expression is recorded by this exact request while it is being built. */
  toQExpression(terminal?: string): string {
    const steps = terminal ? [...this.qSteps, terminal] : this.qSteps;
    return [this.qRoot, ...steps.map(step => `  .${step}`)].join('\n');
  }

  toQuery(): SelectQuery {
    const query = this.query.clone();
    if (this.filters.length) query.filter({ $and: [...this.filters] });
    return query;
  }

  async executeForList(context: UserContext): Promise<SmartList<Row>> {
    return this.executeList(context, this.pageTotalAlias !== undefined);
  }

  async executeForRows(context: UserContext): Promise<SmartList<Row>> {
    return this.executeList(context, false);
  }

  private async executeList(context: UserContext, counted: boolean): Promise<SmartList<Row>> {
    this.ensureIntent();
    const service = this.service(context);
    const query = this.toQuery();
    const totalCount = counted ? await service.executeCount(
      query,
      this.pageTotalAlias,
      { kind: 'named-count', method: 'countAs', alias: this.pageTotalAlias },
    ) : undefined;
    const rowsQuery = query.clone();
    if (counted) {
      rowsQuery.aggregateItems = rowsQuery.aggregateItems.filter(item =>
        !(String(item.function).toLowerCase() === 'count' && item.alias === this.pageTotalAlias));
    }
    const rows = await service.executeQuery<Row>(context.prepareQuery(rowsQuery));
    const data = new SmartList(rows, { totalCount });
    if (counted && this.pageTotalAlias !== undefined) {
      data.aggregations[this.pageTotalAlias] = totalCount;
    }
    if (query.facets.length) {
      data.facets = await executeRelationFacets(
        service, nested => context.prepareQuery(nested), query, query.facets,
      );
    }
    return data;
  }
  protected addFilter(filter: unknown): this { this.filters.push(filter); return this; }
  protected select(...fields: string[]): this { this.query.select(fields); return this; }
  protected order(field: string, direction: 'asc' | 'desc'): this {
    this.query.order(direction === 'asc' ? OrderBy.asc(field) : OrderBy.desc(field));
    return this;
  }
  protected group(field: string): this { this.query.groupBy(field); return this; }
  protected aggregate(fn: string, field: string, alias: string): this {
    this.query.aggregate(fn, field, alias);
    return this;
  }
  protected record(step: string): this { this.qSteps.push(step); return this; }
  protected includePageTotalAs(alias: string): this {
    this.pageTotalAlias = alias;
    return this;
  }

  private service(context: UserContext): DataService {
    return context.requireResource<DataService>('dataService');
  }

  private ensureIntent(): void {
    if (!this.auditComment.trim() || !this.queryPurpose.trim()) {
      throw new Error('Generated Q requests require comment() and purpose() before execution');
    }
  }
}

export class PlatformRequest extends GeneratedRequest {
  constructor() { super('Platform', 'Q.platforms()'); }
  selectId(): this { return this.select('id'); }
  selectName(): this { return this.select('name'); }
  selectCode(): this { return this.select('code'); }
  withIdIs(value: string): this { return this.addFilter({ id: { $eq: value } }); }
}

export class CustomerRequest extends GeneratedRequest {
  constructor() { super('Customer', 'Q.customers()'); }
  selectId(): this { return this.select('id'); }
  selectName(): this { return this.select('name'); }
  selectCity(): this { return this.select('city'); }
  selectTier(): this { return this.select('tier'); }
  selectPlatformWith(request: PlatformRequest): this {
    this.query.relationQuery('platform', request.toQuery(), 'platformId', 'id', false);
    return this;
  }
  countOrderListAs(alias: string): this {
    this.query.relationAggregate('orderList', alias,
      new SelectQuery('CustomerOrder').aggregate('Count', 'id', alias));
    return this;
  }
  orderByNameAscending(): this { return this.order('name', 'asc'); }
}

export class OrderItemRequest extends GeneratedRequest {
  constructor() { super('OrderItem', 'Q.orderItems()'); }
  selectId(): this { this.select('id'); return this.record('selectId()'); }
  selectOrderId(): this { this.select('orderId'); return this.record('selectOrderId()'); }
  selectProductName(): this { this.select('productName'); return this.record('selectProductName()'); }
  selectSku(): this { this.select('sku'); return this.record('selectSku()'); }
  selectQuantity(): this { this.select('quantity'); return this.record('selectQuantity()'); }
  withProductNameContaining(value: string): this {
    return this.addFilter({ productName: { $contains: value } });
  }
  orderByIdAscending(): this { this.order('id', 'asc'); return this.record('orderByIdAscending()'); }
  groupByProductName(): this { return this.group('productName'); }
  sumQuantityAs(alias: string): this { return this.aggregate('Sum', 'quantity', alias); }
  sumLineAmountAs(alias: string): this { return this.aggregate('Sum', 'lineAmount', alias); }
  countAs(alias: string): this { return this.aggregate('Count', 'id', alias); }
}

export class OrderStatusRequest extends GeneratedRequest {
  constructor() { super('OrderStatus', 'Q.orderStatuses()'); }
  selectId(): this { this.select('id'); return this.record('selectId()'); }
  selectName(): this { this.select('name'); return this.record('selectName()'); }
  selectCode(): this { this.select('code'); return this.record('selectCode()'); }
  selectColor(): this { this.select('color'); return this.record('selectColor()'); }
  selectDisplayOrder(): this { this.select('displayOrder'); return this.record('selectDisplayOrder()'); }
  withCodeIs(value: string): this { return this.addFilter({ code: { $eq: value } }); }
  countAs(alias: string): this {
    this.aggregate('Count', 'id', alias);
    return this.record(`countAs(${qString(alias)})`);
  }
  sumOrderTotalAmountAs(alias: string): this {
    this.aggregate('Sum', 'totalAmount', alias);
    return this.record(`sumOrderTotalAmountAs(${qString(alias)})`);
  }
  orderByDisplayOrderAscending(): this {
    this.order('displayOrder', 'asc');
    return this.record('orderByDisplayOrderAscending()');
  }
}

export class PaymentRequest extends GeneratedRequest {
  constructor() { super('Payment', 'Q.payments()'); }
  groupByCurrency(): this { return this.group('currency'); }
  groupByProvider(): this { return this.group('provider'); }
  groupByStatus(): this { return this.group('status'); }
  countAs(alias: string): this { return this.aggregate('Count', 'id', alias); }
  sumAmountAs(alias: string): this { return this.aggregate('Sum', 'amount', alias); }
  orderByCurrencyAscending(): this { return this.order('currency', 'asc'); }
  orderByProviderAscending(): this { return this.order('provider', 'asc'); }
  orderByIdAscending(): this { return this.order('id', 'asc'); }
}

export class ShipmentRequest extends GeneratedRequest {
  constructor() { super('Shipment', 'Q.shipments()'); }
  withStatusIn(...values: string[]): this { return this.addFilter({ status: { $in: values } }); }
  selectOrderWith(request: CustomerOrderRequest): this {
    this.query.relationQuery('order', request.toQuery(), 'orderId', 'id', false);
    return this;
  }
  orderByStatusAscending(): this { return this.order('status', 'asc'); }
  orderByIdAscending(): this { return this.order('id', 'asc'); }
}

export class CustomerOrderRequest extends GeneratedRequest {
  private dynamicWarnings: unknown[] = [];
  private countAlias?: string;
  private rowCountApplied = false;

  constructor(minimal = false) {
    super('CustomerOrder', minimal ? 'Q.customerOrdersWithMinimalFields()' : 'Q.customerOrders()');
    if (minimal) this.query.select(['id', 'version']);
    else {
      this.query.select([
        'id', 'orderNumber', 'orderDate', 'status', 'totalAmount', 'currency',
        'customerId', 'platformId', 'version',
      ]);
    }
  }
  selectId(): this { return this.select('id'); }
  selectOrderNumber(): this { this.select('orderNumber'); return this.record('selectOrderNumber()'); }
  selectOrderDate(): this { this.select('orderDate'); return this.record('selectOrderDate()'); }
  selectStatus(): this { return this.select('status'); }
  selectTotalAmount(): this { return this.select('totalAmount'); }
  selectCurrency(): this { return this.select('currency'); }
  withOrderNumberIs(value: string): this { return this.addFilter({ orderNumber: { $eq: value } }); }
  withOrderNumberContaining(value: string): this { return this.addFilter({ orderNumber: { $contains: value } }); }
  withStatusMatching(request: OrderStatusRequest): this {
    return this.addFilter({ status: { $inSubquery: { query: request.toQuery(), field: 'id' } } });
  }
  withStatusIsPendingPayment(): this { return this.addFilter({ status: { $eq: ORDER_STATUS.PENDING_PAYMENT } }); }
  withStatusIsPaid(): this { return this.addFilter({ status: { $eq: ORDER_STATUS.PAID } }); }
  withStatusIsShipped(): this { return this.addFilter({ status: { $eq: ORDER_STATUS.SHIPPED } }); }
  withStatusIsDelivered(): this { return this.addFilter({ status: { $eq: ORDER_STATUS.DELIVERED } }); }
  withStatusIsCancelled(): this { return this.addFilter({ status: { $eq: ORDER_STATUS.CANCELLED } }); }
  withCurrencyIs(value: string): this { return this.addFilter({ currency: { $eq: value } }); }
  withTotalAmountGreaterThanOrEqualTo(value: number): this {
    return this.addFilter({ totalAmount: { $gte: value } });
  }
  withOrderDateGreaterThanOrEqualTo(value: string): this {
    return this.addFilter({ orderDate: { $gte: value } });
  }
  withPlatformIdIs(value: string): this { return this.addFilter({ platformId: { $eq: value } }); }
  withItemListMatching(request: OrderItemRequest): this {
    return this.addFilter({ id: { $inSubquery: { query: request.toQuery(), field: 'orderId' } } });
  }
  filterByJson(input: unknown): this {
    const { query, warnings } = mergeDynamicSearch(this.toQuery(), normalizeOrderSearch(input), orderSearchModel, {
      filter: (path, predicate) => {
        if (path === 'status.code') {
          return { status: { $inSubquery: {
            query: new SelectQuery('OrderStatus').filter({ code: predicate }), field: 'id',
          } } };
        }
        if (path === 'itemList.productName') {
          return { id: { $inSubquery: {
            query: new SelectQuery('OrderItem').filter({ productName: predicate }), field: 'orderId',
          } } };
        }
        return { [path]: predicate };
      },
      order: (path, direction) => direction === 'asc' ? OrderBy.asc(path) : OrderBy.desc(path),
    });
    this.dynamicWarnings = warnings;
    this.query.filterCondition = query.filterCondition;
    this.query.orderItems = [...query.orderItems];
    this.record('filterByJson(searchParams)');
    return this;
  }
  warnings(): readonly unknown[] { return this.dynamicWarnings; }
  selectPlatformWith(request: PlatformRequest): this {
    this.query.relationQuery('platform', request.toQuery(), 'platformId', 'id', false);
    return this;
  }
  selectCustomerWith(request: CustomerRequest): this {
    this.query.relationQuery('customer', request.toQuery(), 'customerId', 'id', false);
    return this;
  }
  selectStatusWith(request: OrderStatusRequest): this {
    this.query.select(['status']);
    this.query.relationQuery('status', request.toQuery(), 'status', 'id', false, {
      kind: 'relation-select', method: 'selectStatusWith', relation: 'status',
    });
    return this.record(`selectStatusWith(${nestedQ(request)})`);
  }
  selectItemListWith(request: OrderItemRequest): this {
    this.query.relationQuery('itemList', request.toQuery(), 'id', 'orderId', true, {
      kind: 'relation-select', method: 'selectItemListWith', relation: 'itemList',
    });
    return this.record(`selectItemListWith(${nestedQ(request)})`);
  }
  selectPaymentListWith(request: PaymentRequest): this {
    this.query.relationQuery('paymentList', request.toQuery(), 'id', 'orderId', true);
    return this;
  }
  selectShipmentListWith(request: ShipmentRequest): this {
    this.query.relationQuery('shipmentList', request.toQuery(), 'id', 'orderId', true);
    return this;
  }
  countItemListAs(alias: string): this {
    this.query.relationAggregate('itemList', alias,
      new SelectQuery('OrderItem').aggregate('Count', 'id', alias)
        .comment('count items'), true, {
        kind: 'relation-count', method: 'countItemListAs', relation: 'itemList', alias,
      });
    return this.record(`countItemListAs(${qString(alias)})`);
  }
  facetByStatusAs(name: string, request: OrderStatusRequest, includeAllFacets = true): this {
    const facet = request.toQuery();
    if (!facet.commentText) facet.comment('load status facets');
    this.query.facetBy(name, 'status', { toQuery: () => facet }, includeAllFacets, {
      kind: 'facet', method: 'facetByStatusAs', relation: 'status', alias: name,
    });
    return this.record(`facetByStatusAs(${qString(name)}, ${nestedQ(request)})`);
  }
  orderByOrderDateDescending(): this {
    this.order('orderDate', 'desc');
    return this.record('orderByOrderDateDescending()');
  }
  orderByOrderDateAscending(): this { return this.order('orderDate', 'asc'); }
  orderByIdDescending(): this { this.order('id', 'desc'); return this.record('orderByIdDescending()'); }
  orderByTotalAmountDescending(): this { return this.order('totalAmount', 'desc'); }
  groupByCurrency(): this { return this.group('currency'); }
  groupByStatus(): this { return this.group('status'); }
  countAs(alias: string): this {
    this.countAlias = alias;
    return this.record(`countAs(${qString(alias)})`);
  }
  sumTotalAmountAs(alias: string): this { return this.aggregate('Sum', 'totalAmount', alias); }
  averageTotalAmountAs(alias: string): this { return this.aggregate('Avg', 'totalAmount', alias); }

  override executeForList(context: UserContext): Promise<SmartList<Row>> {
    if (this.countAlias) this.includePageTotalAs(this.countAlias);
    return super.executeForList(context);
  }

  override executeForRows(context: UserContext): Promise<SmartList<Row>> {
    this.applyRowCount();
    return super.executeForRows(context);
  }

  private applyRowCount(): void {
    if (!this.countAlias || this.rowCountApplied) return;
    this.query.aggregate('Count', 'id', this.countAlias);
    this.rowCountApplied = true;
  }
}

export class Q {
  static platforms(): PlatformRequest { return new PlatformRequest(); }
  static customers(): CustomerRequest { return new CustomerRequest(); }
  static customerOrders(): CustomerOrderRequest { return new CustomerOrderRequest(); }
  static customerOrdersWithMinimalFields(): CustomerOrderRequest { return new CustomerOrderRequest(true); }
  static orderItems(): OrderItemRequest { return new OrderItemRequest(); }
  static orderStatuses(): OrderStatusRequest { return new OrderStatusRequest(); }
  static payments(): PaymentRequest { return new PaymentRequest(); }
  static shipments(): ShipmentRequest { return new ShipmentRequest(); }
}
