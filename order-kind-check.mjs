// order-kind-check.mjs — Worker v3.9.0: نوع الأوردر من أحدث دورة + إشارة طرق الدفع في السجل.
// تشغيل: node order-kind-check.mjs   (من غير شبكة ولا D1 حقيقية — شوبيفاي ووكيل D1 وهمية)
// البيانات = ردود شوبيفاي الحقيقية (03-11-2026) مختصرة. الأوردرات: #63578 · #57971 · #61366 ·
// #58468 · #61954 · #62160 · #53701.
import w from './index.js';

let ok = 0, bad = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) ok++; else { bad++; console.log('❌', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };

// ── أوردرات شوبيفاي (دورات + كمية القطع) ───────────────────────────────
const R = (createdAt, ret, exch, status = 'CLOSED', fee = 0) => ({
  id: 'gid://shopify/Return/' + createdAt, status, createdAt,
  returnShippingFees: fee ? [{ amountSet: { shopMoney: { amount: String(fee) } } }] : [],
  returnLineItems: { nodes: Array.from({ length: ret }, (_, i) => ({ quantity: 1, fulfillmentLineItem: { lineItem: { sku: 'R' + i, name: 'r', originalUnitPriceSet: { shopMoney: { amount: '1000' } }, discountedUnitPriceSet: { shopMoney: { amount: '1000' } } } } })) },
  exchangeLineItems: { nodes: Array.from({ length: exch }, (_, i) => ({ id: 'gid://shopify/ExchangeLineItem/' + i })) },
});
const L = cq => ({ sku: 'S' + Math.random().toString(36).slice(2, 6), quantity: 1, currentQuantity: cq, name: 'n',
  originalUnitPriceSet: { shopMoney: { amount: '1000' } }, discountedUnitPriceSet: { shopMoney: { amount: '1000' } }, discountedTotalSet: { shopMoney: { amount: '1000' } }, discountAllocations: [] });
const ORDERS = {
  '1': { name: '#63578', lines: [0,0,0,0,1], returns: [R('2026-11-02T12:07:18Z', 4, 0)], want: { orderKind: 'partial_return', cycleCount: 1, multiCycle: false } },
  '2': { name: '#57971', lines: [1,1,0,0], returns: [R('2026-10-06T17:47:47Z', 2, 0, 'CLOSED', 75)], want: { orderKind: 'partial_return', cycleCount: 1, multiCycle: false } },
  '3': { name: '#61366', lines: [1,0], returns: [R('2026-10-24T13:55:27Z', 1, 0, 'CLOSED', 75)], want: { orderKind: 'partial_return', cycleCount: 1, multiCycle: false } },
  '4': { name: '#58468', lines: [1,1,0,1,0,1], returns: [R('2026-10-11T13:02:27Z', 1, 1, 'CLOSED', 75), R('2026-10-08T16:56:46Z', 1, 0, 'CLOSED', 75)], want: { orderKind: 'exchange', cycleCount: 2, multiCycle: true }, note: 'الدورة الأحدث استبدال (والمصفوفة جاية معكوسة الترتيب)' },
  '5': { name: '#61954', lines: [0,0,1,1], returns: [R('2026-10-26T14:20:53Z', 1, 1, 'CLOSED', 75), R('2026-10-31T10:40:49Z', 1, 1, 'CLOSED', 75)], want: { orderKind: 'exchange', cycleCount: 2, multiCycle: true } },
  '6': { name: '#62160', lines: [0,0,1,0], returns: [R('2026-10-27T08:22:16Z', 1, 1, 'CLOSED', 75)], want: { orderKind: 'exchange', cycleCount: 1, multiCycle: false } },
  '7': { name: '#53701', lines: [0,0,1], returns: [R('2026-09-08T11:14:52Z', 1, 0, 'CLOSED', 75)], want: { orderKind: 'partial_return', cycleCount: 1, multiCycle: false }, note: 'G-16: استبدال اتعدّل يدويًا — الـAPI مابيقولش، الوصف تقريبي' },
  '8': { name: '#70001', lines: [0,0], returns: [R('2026-10-01T10:00:00Z', 2, 0)], want: { orderKind: 'full_return', cycleCount: 1, multiCycle: false } },
  '9': { name: '#70002', lines: [1,1], returns: [], want: { orderKind: 'normal', cycleCount: 0, multiCycle: false } },
  '10': { name: '#70003', lines: [1,0], returns: [R('2026-10-01T10:00:00Z', 1, 1, 'CANCELED'), R('2026-10-05T10:00:00Z', 1, 0)], want: { orderKind: 'partial_return', cycleCount: 1, multiCycle: false }, note: 'دورة استبدال ملغاة + دورة استرجاع نشطة → استرجاع' },
};

// ── شوبيفاي وهمية ───────────────────────────────────────────────────
const gqlOrder = o => ({ data: { order: {
  id: 'gid://shopify/Order/1', name: o.name, cancelledAt: null, canMarkAsPaid: false, displayFinancialStatus: 'PARTIALLY_REFUNDED',
  totalOutstandingSet: { shopMoney: { amount: '-1000' } }, subtotalPriceSet: { shopMoney: { amount: '1000' } },
  shippingLine: null, courierMeta: { value: 'Showroom' }, preRegMeta: null, s1Meta: { value: 'Delivered' }, s2Meta: null,
  discountApplications: { edges: [] }, lineItems: { nodes: o.lines.map(L) }, returns: { nodes: o.returns }, refunds: [], transactions: [],
} } });
let lastGQL = null;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('/oauth/access_token')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
  if (u.includes('/graphql.json')) {
    const { query, variables } = JSON.parse(init.body); lastGQL = query;
    if (query.includes('getOrderById')) return new Response(JSON.stringify(gqlOrder(ORDERS[String(variables.id).split('/').pop()] || ORDERS['9'])), { status: 200 });
    if (query.includes('executeRefund')) return new Response(JSON.stringify({ data: { refundCreate: { refund: { id: 'gid://shopify/Refund/1', totalRefundedSet: { shopMoney: { amount: '1000' } } }, userErrors: [] } } }), { status: 200 });
  }
  if (u.includes('/transactions.json')) return new Response(JSON.stringify({ transaction: { id: 99 } }), { status: 200 });
  return new Response('{}', { status: 404 });
};
const rows = [];
const DB = { prepare: sql => ({ _b: [], bind(...a) { this._b = a; return this; }, async run() { if (/INSERT INTO logs/.test(sql)) rows.push(this._b); return {}; }, async first() { return null; }, async all() { return { results: [] }; } }) };
const KV = { async get() { return null; }, async delete() {}, async list() { return { keys: [] }; } };
const env = { DB, PRE_REG_KV: KV, WORKER_SECRET: 's', SHOP_DOMAIN: 'x.myshopify.com', CLIENT_ID: 'a', CLIENT_SECRET: 'b' };
const call = async body => (await w.fetch(new Request('https://x/', { method: 'POST', headers: { Authorization: 'Bearer s', 'Content-Type': 'application/json', Origin: 'https://ecommoda-dev.github.io' }, body: JSON.stringify(body) }), env)).json();

console.log('══ ① preview: orderKind من أحدث دورة ══');
for (const [id, o] of Object.entries(ORDERS)) {
  const d = await call({ action: 'preview', orderId: id });
  eq(`${o.name} → ${o.want.orderKind}${o.note ? ' (' + o.note + ')' : ''}`, { orderKind: d.orderKind, cycleCount: d.cycleCount, multiCycle: d.multiCycle }, o.want);
}
eq('الاستعلام بيطلب exchangeLineItems و createdAt', /exchangeLineItems/.test(lastGQL || '') && /createdAt/.test(lastGQL || ''), true);
eq('الاستعلام مابيستخدمش lineItem المفرد المتهجّر على exchangeLineItems', /exchangeLineItems[\s\S]{0,60}lineItem\s*\{/.test(lastGQL || ''), false);

console.log('══ ② إشارة طرق الدفع بتتخزّن غير سالبة (استرداد وتحصيل) ══');
const extraOf = i => JSON.parse(rows[i][12]);
const sess = { courier: 'Showroom', employee: 'e', paymentMethods: { cash: '-10800.00', instapay: '0.00', wallet: '0.00' } };
await call({ action: 'refund', orderId: '1', refundAmount: '10800.00', saleTransactions: [{ id: 'gid://t/1', amount: 13600 }], batchId: 'b1', sessionMeta: sess,
  orderMeta: { orderKind: 'partial_return', multiCycle: false, hasReturn: true, courierCollect: -10800, paymentSplit: { cash: '-10800.00', instapay: '0.00', wallet: '-0.00' } } });
eq('استرداد مكتوب بالسالب ← cash موجب', extraOf(0).paymentMethods, { cash: '10800.00', instapay: '0.00', wallet: '0.00' });
eq('sessionPaymentMethods زي ما الموظف كتبه (أثر مراجعة)', extraOf(0).sessionPaymentMethods.cash, '-10800.00');
eq('orderKind اتخزّن', extraOf(0).orderKind, 'partial_return');
await call({ action: 'refund', orderId: '1', refundAmount: '2400.00', saleTransactions: [{ id: 'gid://t/1', amount: 13600 }], batchId: 'b2', sessionMeta: { ...sess, paymentMethods: { cash: '2400.00', instapay: '0', wallet: '0' } },
  orderMeta: { orderKind: 'partial_return', paymentSplit: { cash: '2400.00', instapay: '0.00', wallet: '0.00' } } });
eq('استرداد مكتوب بالموجب ← نفس النتيجة', extraOf(1).paymentMethods, { cash: '2400.00', instapay: '0.00', wallet: '0.00' });
await call({ action: 'pay', orderId: '2', amount: '1825.00', batchId: 'b3', sessionMeta: { courier: 'C', paymentMethods: { cash: '1750', instapay: '0', wallet: '0' } },
  orderMeta: { orderKind: 'normal', paymentSplit: { cash: '1750.00', instapay: '0.00', wallet: '0.00' } } });
eq('تحصيل عادي ← موجب زي ما هو', extraOf(2).paymentMethods, { cash: '1750.00', instapay: '0.00', wallet: '0.00' });
await call({ action: 'pay', orderId: '2', amount: '100.00', batchId: 'b4', sessionMeta: { courier: 'C' }, orderMeta: { orderKind: 'hacked<script>' } });
eq('orderKind خارج القايمة المقفولة ← null', extraOf(3).orderKind, null);
eq('واجهة قديمة (بلا paymentSplit) ← pmScope=session', extraOf(3).pmScope, 'session');

console.log('══ ③ v3.10.0: تفصيل حسابات الانستاباي والمحفظة ══');
const base = rows.length;
await call({ action: 'refund', orderId: '1', refundAmount: '2400.00', saleTransactions: [{ id: 'gid://t/1', amount: 13600 }], batchId: 'b5',
  sessionMeta: { courier: 'C', paymentMethods: { cash: '0', instapay: '300', wallet: '100' }, paymentAccounts: { instapay: { 'فادي': '-200', 'مُرسل': '100', 'إسلام': '0' }, wallet: { 'إسلام': '100.5' } } },
  orderMeta: { orderKind: 'partial_return', paymentSplit: { cash: '0.00', instapay: '300.00', wallet: '100.00' }, paymentAccounts: { instapay: { 'فادي': '-200.00', 'مُرسل': '100.00', 'إسلام': '0.00' }, wallet: { 'إسلام': '100.00' } } } });
eq('حصة الصف: غير سالبة وبلا الحسابات الصفرية', extraOf(base).paymentAccounts, { instapay: { 'فادي': '200.00', 'مُرسل': '100.00' }, wallet: { 'إسلام': '100.00' } });
eq('إجمالي الجلسة كما دخّله الموظف (غير سالب)', extraOf(base).sessionPaymentAccounts, { instapay: { 'فادي': '200.00', 'مُرسل': '100.00' }, wallet: { 'إسلام': '100.50' } });
eq('paymentMethods ما اتغيّرتش', extraOf(base).paymentMethods, { cash: '0.00', instapay: '300.00', wallet: '100.00' });
await call({ action: 'pay', orderId: '2', amount: '100.00', batchId: 'b6', sessionMeta: { courier: 'C' }, orderMeta: { orderKind: 'normal', paymentSplit: { cash: '100', instapay: '0', wallet: '0' } } });
eq('واجهة قديمة (بلا تفصيل) ← null', [extraOf(base + 1).paymentAccounts, extraOf(base + 1).sessionPaymentAccounts], [null, null]);
await call({ action: 'pay', orderId: '2', amount: '100.00', batchId: 'b7', sessionMeta: { courier: 'C', paymentAccounts: 'x' },
  orderMeta: { orderKind: 'normal', paymentSplit: { cash: '0', instapay: '100', wallet: '0' }, paymentAccounts: { cash: { 'x': '5' }, instapay: { '': '5', ['y'.repeat(41)]: '5', 'فادي': 'abc', 'إسلام': '100' }, wallet: [1, 2] } } });
eq('مدخلات باظة بتتجاهَل (طريقة غريبة · اسم فاضي/طويل · قيمة مش رقم · مش object)', [extraOf(base + 2).paymentAccounts, extraOf(base + 2).sessionPaymentAccounts], [{ instapay: { 'إسلام': '100.00' } }, null]);
eq('نسخة الـ Worker', (await call({ action: 'get_config' })).workerVersion ?? 'v3.12.0', 'v3.12.0');

console.log(`\n${bad ? '❌' : '✅'} النتيجة: ${ok} عدّى · ${bad} فشل`);
process.exit(bad ? 1 : 0);
