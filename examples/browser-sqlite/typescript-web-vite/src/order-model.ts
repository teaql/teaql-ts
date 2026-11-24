import type { EntitySchema } from 'teaql-ts/sql/core';

const id = (columnName: string) => ({
  columnName,
  modelName: columnName,
  logicalType: 'integer' as const,
  decode: 'string' as const,
});

const text = (columnName: string) => ({
  columnName,
  modelName: columnName,
  logicalType: 'text' as const,
  decode: 'native' as const,
});

const date = (columnName: string) => ({
  columnName,
  modelName: columnName,
  logicalType: 'date' as const,
  decode: 'date' as const,
});

const dateTime = (columnName: string) => ({
  columnName,
  modelName: columnName,
  logicalType: 'datetime' as const,
  decode: 'date' as const,
});

const number = (columnName: string, logicalType: 'integer' | 'decimal' = 'decimal') => ({
  columnName,
  modelName: columnName,
  logicalType,
  decode: 'number' as const,
});

export const ORDER_STATUS = Object.freeze({
  PENDING_PAYMENT: '1001',
  PAID: '1002',
  SHIPPED: '1003',
  DELIVERED: '1004',
  CANCELLED: '1005',
} as const);

export const ORDER_STATUS_CONSTANTS = [
  { entity: 'OrderStatus', id: ORDER_STATUS.PENDING_PAYMENT, values: { name: 'Pending payment', code: 'PENDING_PAYMENT', color: '#D97706', displayOrder: 10 } },
  { entity: 'OrderStatus', id: ORDER_STATUS.PAID, values: { name: 'Paid', code: 'PAID', color: '#2563EB', displayOrder: 20 } },
  { entity: 'OrderStatus', id: ORDER_STATUS.SHIPPED, values: { name: 'Shipped', code: 'SHIPPED', color: '#16A34A', displayOrder: 30 } },
  { entity: 'OrderStatus', id: ORDER_STATUS.DELIVERED, values: { name: 'Delivered', code: 'DELIVERED', color: '#047857', displayOrder: 40 } },
  { entity: 'OrderStatus', id: ORDER_STATUS.CANCELLED, values: { name: 'Cancelled', code: 'CANCELLED', color: '#9F1239', displayOrder: 50 } },
] as const;

/** A familiar commerce model with OrderStatus represented as constant objects. */
export const ORDER_SCHEMAS: Record<string, EntitySchema> = {
  Platform: {
    table: 'platform_data',
    columns: {
      id: id('id'),
      name: text('name'),
      code: text('code'),
      region: text('region'),
      currency: text('currency'),
      version: number('version', 'integer'),
    },
    relations: {
      customerList: { targetEntity: 'Customer', localKey: 'id', foreignKey: 'platformId', many: true },
      orderList: { targetEntity: 'CustomerOrder', localKey: 'id', foreignKey: 'platformId', many: true },
    },
  },
  Customer: {
    table: 'customer_data',
    columns: {
      id: id('id'),
      name: text('name'),
      email: text('email'),
      city: text('city'),
      tier: text('tier'),
      platformId: id('platform_id'),
      version: number('version', 'integer'),
    },
    relations: {
      platform: { targetEntity: 'Platform', localKey: 'platformId', foreignKey: 'id', many: false },
      orderList: { targetEntity: 'CustomerOrder', localKey: 'id', foreignKey: 'customerId', many: true },
    },
  },
  CustomerOrder: {
    table: 'customer_order_data',
    columns: {
      id: id('id'),
      orderNumber: text('order_number'),
      orderDate: date('order_date'),
      status: id('status_id'),
      totalAmount: number('total_amount'),
      currency: text('currency'),
      customerId: id('customer_id'),
      platformId: id('platform_id'),
      version: number('version', 'integer'),
    },
    relations: {
      platform: { targetEntity: 'Platform', localKey: 'platformId', foreignKey: 'id', many: false },
      customer: { targetEntity: 'Customer', localKey: 'customerId', foreignKey: 'id', many: false },
      status: { targetEntity: 'OrderStatus', localKey: 'status', foreignKey: 'id', many: false },
      itemList: { targetEntity: 'OrderItem', localKey: 'id', foreignKey: 'orderId', many: true },
      paymentList: { targetEntity: 'Payment', localKey: 'id', foreignKey: 'orderId', many: true },
      shipmentList: { targetEntity: 'Shipment', localKey: 'id', foreignKey: 'orderId', many: true },
    },
  },
  OrderStatus: {
    table: 'order_status_data',
    columns: {
      id: id('id'),
      name: text('name'),
      code: text('code'),
      color: text('color'),
      displayOrder: number('display_order', 'integer'),
      version: number('version', 'integer'),
    },
    relations: {
      orderList: { targetEntity: 'CustomerOrder', localKey: 'id', foreignKey: 'status', many: true },
    },
  },
  OrderItem: {
    table: 'order_item_data',
    columns: {
      id: id('id'),
      orderId: id('order_id'),
      productName: text('product_name'),
      sku: text('sku'),
      quantity: number('quantity', 'integer'),
      unitPrice: number('unit_price'),
      lineAmount: number('line_amount'),
      version: number('version', 'integer'),
    },
    relations: {
      order: { targetEntity: 'CustomerOrder', localKey: 'orderId', foreignKey: 'id', many: false },
    },
  },
  Payment: {
    table: 'payment_data',
    columns: {
      id: id('id'),
      orderId: id('order_id'),
      provider: text('provider'),
      status: text('status'),
      amount: number('amount'),
      currency: text('currency'),
      transactionId: text('transaction_id'),
      paidAt: dateTime('paid_at'),
      version: number('version', 'integer'),
    },
    relations: {
      order: { targetEntity: 'CustomerOrder', localKey: 'orderId', foreignKey: 'id', many: false },
    },
  },
  Shipment: {
    table: 'shipment_data',
    columns: {
      id: id('id'),
      orderId: id('order_id'),
      carrier: text('carrier'),
      status: text('status'),
      trackingNumber: text('tracking_number'),
      shipToCity: text('ship_to_city'),
      shippedAt: dateTime('shipped_at'),
      deliveredAt: dateTime('delivered_at'),
      version: number('version', 'integer'),
    },
    relations: {
      order: { targetEntity: 'CustomerOrder', localKey: 'orderId', foreignKey: 'id', many: false },
    },
  },
};

export type SeedRecord = Readonly<{
  entity: keyof typeof ORDER_SCHEMAS;
  id: string;
  payload: Readonly<Record<string, unknown>>;
}>;

export const ORDER_SEED: readonly SeedRecord[] = [
  { entity: 'Platform', id: '1', payload: { name: 'TeaQL Store', code: 'TEAQL-CN', region: 'China', currency: 'CNY' } },
  { entity: 'Platform', id: '2', payload: { name: 'TeaQL Global', code: 'TEAQL-GLOBAL', region: 'Global', currency: 'USD' } },

  { entity: 'Customer', id: '101', payload: { name: 'Lin Xiao', email: 'lin.xiao@example.com', city: 'Shanghai', tier: 'GOLD', platformId: '1' } },
  { entity: 'Customer', id: '102', payload: { name: 'Zhou Ran', email: 'zhou.ran@example.com', city: 'Hangzhou', tier: 'SILVER', platformId: '1' } },
  { entity: 'Customer', id: '103', payload: { name: 'Maya Patel', email: 'maya.patel@example.com', city: 'Singapore', tier: 'GOLD', platformId: '2' } },
  { entity: 'Customer', id: '104', payload: { name: 'Lucas Martin', email: 'lucas.martin@example.com', city: 'Paris', tier: 'SILVER', platformId: '2' } },
  { entity: 'Customer', id: '105', payload: { name: 'Wang Ning', email: 'wang.ning@example.com', city: 'Chengdu', tier: 'BRONZE', platformId: '1' } },

  { entity: 'CustomerOrder', id: '1001', payload: { orderNumber: 'TQL-2026-1001', orderDate: '2026-08-28', status: ORDER_STATUS.DELIVERED, totalAmount: 499, currency: 'CNY', customerId: '101', platformId: '1' } },
  { entity: 'CustomerOrder', id: '1002', payload: { orderNumber: 'TQL-2026-1002', orderDate: '2026-09-02', status: ORDER_STATUS.SHIPPED, totalAmount: 1299, currency: 'CNY', customerId: '102', platformId: '1' } },
  { entity: 'CustomerOrder', id: '1003', payload: { orderNumber: 'TQL-2026-1003', orderDate: '2026-09-06', status: ORDER_STATUS.PAID, totalAmount: 328.8, currency: 'CNY', customerId: '101', platformId: '1' } },
  { entity: 'CustomerOrder', id: '1004', payload: { orderNumber: 'TQL-2026-1004', orderDate: '2026-09-11', status: ORDER_STATUS.PENDING_PAYMENT, totalAmount: 79.9, currency: 'CNY', customerId: '105', platformId: '1' } },
  { entity: 'CustomerOrder', id: '1005', payload: { orderNumber: 'TQL-2026-1005', orderDate: '2026-09-14', status: ORDER_STATUS.DELIVERED, totalAmount: 219, currency: 'USD', customerId: '103', platformId: '2' } },
  { entity: 'CustomerOrder', id: '1006', payload: { orderNumber: 'TQL-2026-1006', orderDate: '2026-09-18', status: ORDER_STATUS.PAID, totalAmount: 640, currency: 'USD', customerId: '104', platformId: '2' } },
  { entity: 'CustomerOrder', id: '1007', payload: { orderNumber: 'TQL-2026-1007', orderDate: '2026-09-21', status: ORDER_STATUS.CANCELLED, totalAmount: 159, currency: 'CNY', customerId: '102', platformId: '1' } },
  { entity: 'CustomerOrder', id: '1008', payload: { orderNumber: 'TQL-2026-1008', orderDate: '2026-09-25', status: ORDER_STATUS.SHIPPED, totalAmount: 268, currency: 'CNY', customerId: '105', platformId: '1' } },

  { entity: 'OrderItem', id: '2001', payload: { orderId: '1001', productName: 'TeaQL Mechanical Keyboard', sku: 'KB-TQL-87', quantity: 1, unitPrice: 299, lineAmount: 299 } },
  { entity: 'OrderItem', id: '2002', payload: { orderId: '1001', productName: 'Silent Wireless Mouse', sku: 'MS-SILENT', quantity: 2, unitPrice: 100, lineAmount: 200 } },
  { entity: 'OrderItem', id: '2003', payload: { orderId: '1002', productName: '27-inch Developer Monitor', sku: 'MON-27-4K', quantity: 1, unitPrice: 1299, lineAmount: 1299 } },
  { entity: 'OrderItem', id: '2004', payload: { orderId: '1003', productName: 'White Porcelain Travel Tea Set', sku: 'TEA-TRAVEL', quantity: 1, unitPrice: 168.8, lineAmount: 168.8 } },
  { entity: 'OrderItem', id: '2005', payload: { orderId: '1003', productName: 'Pre-Qingming Longjing Tea', sku: 'TEA-LJ-100', quantity: 2, unitPrice: 80, lineAmount: 160 } },
  { entity: 'OrderItem', id: '2006', payload: { orderId: '1004', productName: 'Double-wall Glass Tumbler', sku: 'CUP-GLASS', quantity: 1, unitPrice: 79.9, lineAmount: 79.9 } },
  { entity: 'OrderItem', id: '2007', payload: { orderId: '1005', productName: 'Travel Brew Kit', sku: 'BREW-KIT', quantity: 1, unitPrice: 219, lineAmount: 219 } },
  { entity: 'OrderItem', id: '2008', payload: { orderId: '1006', productName: 'Desktop Studio Speaker', sku: 'SPK-STUDIO', quantity: 2, unitPrice: 200, lineAmount: 400 } },
  { entity: 'OrderItem', id: '2009', payload: { orderId: '1006', productName: 'Speaker Stand', sku: 'SPK-STAND', quantity: 1, unitPrice: 80, lineAmount: 80 } },
  { entity: 'OrderItem', id: '2010', payload: { orderId: '1007', productName: 'Desktop Reading Lamp', sku: 'LAMP-DESK', quantity: 1, unitPrice: 159, lineAmount: 159 } },
  { entity: 'OrderItem', id: '2011', payload: { orderId: '1008', productName: 'TeaQL Portable Keyboard', sku: 'KB-TQL-68', quantity: 1, unitPrice: 168, lineAmount: 168 } },
  { entity: 'OrderItem', id: '2012', payload: { orderId: '1008', productName: 'Keyboard Protective Case', sku: 'KB-CASE-68', quantity: 1, unitPrice: 30, lineAmount: 30 } },
  { entity: 'OrderItem', id: '2013', payload: { orderId: '1008', productName: 'Foldable Travel Stand', sku: 'KB-STAND-FOLD', quantity: 1, unitPrice: 25, lineAmount: 25 } },
  { entity: 'OrderItem', id: '2014', payload: { orderId: '1008', productName: 'Braided USB-C Cable', sku: 'CABLE-USBC', quantity: 1, unitPrice: 20, lineAmount: 20 } },
  { entity: 'OrderItem', id: '2015', payload: { orderId: '1008', productName: 'Accent Keycap Set', sku: 'KEYCAP-ACCENT', quantity: 1, unitPrice: 25, lineAmount: 25 } },
  { entity: 'OrderItem', id: '2016', payload: { orderId: '1006', productName: 'Balanced Audio Cable', sku: 'AUDIO-XLR', quantity: 1, unitPrice: 40, lineAmount: 40 } },
  { entity: 'OrderItem', id: '2017', payload: { orderId: '1006', productName: 'Speaker Isolation Pads', sku: 'SPK-PADS', quantity: 1, unitPrice: 60, lineAmount: 60 } },
  { entity: 'OrderItem', id: '2018', payload: { orderId: '1006', productName: 'USB DAC Adapter', sku: 'AUDIO-DAC-USB', quantity: 1, unitPrice: 60, lineAmount: 60 } },

  { entity: 'Payment', id: '3001', payload: { orderId: '1001', provider: 'Alipay', status: 'CAPTURED', amount: 499, currency: 'CNY', transactionId: 'ALI-260828-01', paidAt: '2026-08-28T10:14:00Z' } },
  { entity: 'Payment', id: '3002', payload: { orderId: '1002', provider: 'WeChat Pay', status: 'CAPTURED', amount: 1299, currency: 'CNY', transactionId: 'WX-260902-08', paidAt: '2026-09-02T03:20:00Z' } },
  { entity: 'Payment', id: '3003', payload: { orderId: '1003', provider: 'Alipay', status: 'CAPTURED', amount: 328.8, currency: 'CNY', transactionId: 'ALI-260906-11', paidAt: '2026-09-06T11:42:00Z' } },
  { entity: 'Payment', id: '3004', payload: { orderId: '1004', provider: 'WeChat Pay', status: 'PENDING', amount: 79.9, currency: 'CNY', transactionId: 'WX-260911-02', paidAt: null } },
  { entity: 'Payment', id: '3005', payload: { orderId: '1005', provider: 'Stripe', status: 'CAPTURED', amount: 219, currency: 'USD', transactionId: 'PI-260914-05', paidAt: '2026-09-14T06:10:00Z' } },
  { entity: 'Payment', id: '3006', payload: { orderId: '1006', provider: 'Stripe', status: 'CAPTURED', amount: 640, currency: 'USD', transactionId: 'PI-260918-03', paidAt: '2026-09-18T15:08:00Z' } },
  { entity: 'Payment', id: '3007', payload: { orderId: '1007', provider: 'Alipay', status: 'REFUNDED', amount: 159, currency: 'CNY', transactionId: 'ALI-260921-07', paidAt: '2026-09-21T02:55:00Z' } },
  { entity: 'Payment', id: '3008', payload: { orderId: '1008', provider: 'WeChat Pay', status: 'CAPTURED', amount: 268, currency: 'CNY', transactionId: 'WX-260925-06', paidAt: '2026-09-25T08:31:00Z' } },

  { entity: 'Shipment', id: '4001', payload: { orderId: '1001', carrier: 'SF Express', status: 'DELIVERED', trackingNumber: 'SF2608281001', shipToCity: 'Shanghai', shippedAt: '2026-08-29T02:00:00Z', deliveredAt: '2026-08-30T07:26:00Z' } },
  { entity: 'Shipment', id: '4002', payload: { orderId: '1002', carrier: 'JD Logistics', status: 'IN_TRANSIT', trackingNumber: 'JD2609021002', shipToCity: 'Hangzhou', shippedAt: '2026-09-03T04:12:00Z', deliveredAt: null } },
  { entity: 'Shipment', id: '4003', payload: { orderId: '1003', carrier: 'SF Express', status: 'READY', trackingNumber: 'SF2609061003', shipToCity: 'Shanghai', shippedAt: null, deliveredAt: null } },
  { entity: 'Shipment', id: '4004', payload: { orderId: '1005', carrier: 'DHL', status: 'DELIVERED', trackingNumber: 'DHL2609141005', shipToCity: 'Singapore', shippedAt: '2026-09-15T01:10:00Z', deliveredAt: '2026-09-17T09:22:00Z' } },
  { entity: 'Shipment', id: '4005', payload: { orderId: '1006', carrier: 'DHL', status: 'READY', trackingNumber: 'DHL2609181006', shipToCity: 'Paris', shippedAt: null, deliveredAt: null } },
  { entity: 'Shipment', id: '4006', payload: { orderId: '1008', carrier: 'SF Express', status: 'IN_TRANSIT', trackingNumber: 'SF2609251008', shipToCity: 'Chengdu', shippedAt: '2026-09-26T03:18:00Z', deliveredAt: null } },
] as const;
