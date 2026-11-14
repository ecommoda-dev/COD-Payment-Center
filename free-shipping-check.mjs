// free-shipping-check.mjs — Worker v3.14.0: الشحن المجاني (رسوم المندوب 75 ثابتة بعد تأكيد الموظف).
// تشغيل: node free-shipping-check.mjs   (من غير شبكة ولا D1 حقيقية — شوبيفاي ووكيل D1 وهميين)
// الحالات الحقيقية: #64603 (شحن اتشال بتعديل) · #63607 (اتعمل بلا شحن) · #65609 · أوردر Showroom بشحن 0 وبشحن 75.
import w from './index.js';

let ok = 0, bad = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) ok++; else { bad++; console.log('❌', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };

// ── أوردرات شوبيفاي ─────────────────────────────────────────────────
// ship = قيمة سطر الشحن الحالي (null = السطر اتشال) · courier = ميتافيلد custom.courier
const ORDERS = {
  '1':  { name: '#64603', amount: '4150.0', ship: null,  courier: 'Mohamed Torky', returns: [] },
  '2':  { name: '#63607', amount: '1750.0', ship: '0.0', courier: 'Kareem',        returns: [] },
  '3':  { name: '#64708', amount: '2675.0', ship: '75.0', courier: 'Mohamed Torky', returns: [] },
  '4':  { name: '#70010', amount: '3000.0', ship: null,  courier: 'Showroom',      returns: [] },
  '5':  { name: '#70011', amount: '2000.0', ship: '75.0', courier: 'Showroom',      returns: [] },
  '6':  { name: '#70012', amount: '2500.0', ship: null,  courier: null,            returns: [] },
  '7':  { name: '#70013', amount: '2500.0', ship: null,  courier: 'Bosta',         returns: [] },
  '8':  { name: '#70014', amount: '1500.0', ship: null,  courier: 'Saif',          returns: [{ id: 'r1', status: 'CLOSED', createdAt: '2026-11-01T10:00:00Z', returnShippingFees: [], returnLineItems: { nodes: [] }, exchangeLineItems: { nodes: [] } }] },
  '9':  { name: '#70015', amount: '2900.0', ship: '100.0', courier: 'Abo Yassin',  returns: [] },
  '10': { name: '#70016', amount: '2000.0', ship: null,  courier: ' showroom ',    returns: [] },
  '11': { name: '#70017', amount: '-500.0', ship: null,  courier: 'Saif',          returns: [], refund: true },
};
const gqlOrder = o => ({ data: { order: {
  id: 'gid://shopify/Order/1', name: o.name, cancelledAt: null, canMarkAsPaid: !o.refund, displayFinancialStatus: 'PENDING',
  totalOutstandingSet: { shopMoney: { amount: o.amount } }, subtotalPriceSet: { shopMoney: { amount: o.amount } },
  shippingLine: o.ship == null ? null : { originalPriceSet: { shopMoney: { amount: o.ship } } },
  courierMeta: o.courier == null ? null : { value: o.courier }, preRegMeta: null, s1Meta: { value: 'Delivered' }, s2Meta: null,
  discountApplications: { edges: [] }, lineItems: { nodes: [] }, returns: { nodes: o.returns }, refunds: [], transactions: [],
} } });

let gqlCalls = 0, captures = 0, KV_PENDING = null, PRE_STATE = null;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('/oauth/access_token')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
  if (u.includes('/graphql.json')) {
    gqlCalls++;
    const { query, variables } = JSON.parse(init.body);
    const id = String(variables.id).split('/').pop();
    if (query.includes('getOrderById')) {
      if (ORDERS[id]?.failRead) return new Response('boom', { status: 500 });
      return new Response(JSON.stringify(gqlOrder(ORDERS[id] || ORDERS['3'])), { status: 200 });
    }
    if (query.includes('getPreRegPayState')) return new Response(JSON.stringify({ data: { order: PRE_STATE } }), { status: 200 });
  }
  if (u.includes('/transactions.json')) { captures++; return new Response(JSON.stringify({ transaction: { id: 99 } }), { status: 200 }); }
  return new Response('{}', { status: 404 });
};
const rows = [];
const DB = { prepare: sql => ({ _b: [], bind(...a) { this._b = a; return this; }, async run() { if (/INSERT INTO logs/.test(sql)) rows.push(this._b); return {}; }, async first() { return null; }, async all() { return { results: [] }; } }) };
const KV = { async get(k) { return KV_PENDING && k.startsWith('preReg:') ? JSON.stringify(KV_PENDING) : null; }, async delete() {}, async list() { return { keys: [] }; } };
const env = { DB, PRE_REG_KV: KV, WORKER_SECRET: 's', SHOP_DOMAIN: 'x.myshopify.com', CLIENT_ID: 'a', CLIENT_SECRET: 'b' };
const call = async body => (await w.fetch(new Request('https://x/', { method: 'POST', headers: { Authorization: 'Bearer s', 'Content-Type': 'application/json', Origin: 'https://ecommoda-dev.github.io' }, body: JSON.stringify(body) }), env)).json();
const extraOf = i => JSON.parse(rows[i][12]);
const fee = d => ({ freeShipping: d.freeShipping, courierFee: d.courierFee, courierKind: d.courierKind, courierMissing: d.courierMissing });

console.log('══ ① preview: القاعدة ══');
eq('#64603 سطر الشحن اتشال + Torky ← شحن مجاني 75', fee(await call({ action: 'preview', orderId: '1' })), { freeShipping: true, courierFee: 75, courierKind: 'courier', courierMissing: false });
eq('#63607 شحن 0 + Kareem ← شحن مجاني 75', fee(await call({ action: 'preview', orderId: '2' })), { freeShipping: true, courierFee: 75, courierKind: 'courier', courierMissing: false });
eq('#64708 شحن 75 على شوبيفاي ← عادي (بلا تنبيه)', fee(await call({ action: 'preview', orderId: '3' })), { freeShipping: false, courierFee: null, courierKind: null, courierMissing: false });
eq('Showroom شحن 0 ← تنبيه بلا خصم', fee(await call({ action: 'preview', orderId: '4' })), { freeShipping: true, courierFee: 0, courierKind: 'showroom', courierMissing: false });
eq('Showroom بشحن 75 ← أوردر عادي (قرار أحمد)', fee(await call({ action: 'preview', orderId: '5' })), { freeShipping: false, courierFee: null, courierKind: null, courierMissing: false });
eq('شحن 0 وبلا مندوب ← courierMissing', fee(await call({ action: 'preview', orderId: '6' })), { freeShipping: true, courierFee: null, courierKind: null, courierMissing: true });
eq('Bosta شحن 0 ← بلا تغيير', fee(await call({ action: 'preview', orderId: '7' })), { freeShipping: false, courierFee: null, courierKind: null, courierMissing: false });
eq('أوردر عليه مرتجع ← خارج النطاق', fee(await call({ action: 'preview', orderId: '8' })), { freeShipping: false, courierFee: null, courierKind: null, courierMissing: false });
eq('شحن 100 (محافظة) ← عادي — مفيش تغيير على القديم', fee(await call({ action: 'preview', orderId: '9' })), { freeShipping: false, courierFee: null, courierKind: null, courierMissing: false });
eq('اسم Showroom بمسافات/حروف صغيرة', fee(await call({ action: 'preview', orderId: '10' })).courierKind, 'showroom');
eq('أوردر استرداد (outstanding<0) ← مالوش علاقة', (await call({ action: 'preview', orderId: '11' })).freeShipping, false);
eq('preview بيرجّع flatFee', (await call({ action: 'preview', orderId: '1' })).flatFee, 75);

console.log('══ ② pay: الحارس ══');
const ack = (kind, f) => ({ confirmed: true, courierKind: kind, courierFee: f });
const sess = { courier: 'Mohamed Torky', paymentMethods: { cash: '4075', instapay: '0', wallet: '0' } };
let c0 = captures, r0 = rows.length;
let d = await call({ action: 'pay', orderId: '1', amount: '4150.00', employee: 'Fady', batchId: 'b1', sessionMeta: sess, orderMeta: { courierCollect: 4150 } });
eq('بلا تأكيد ← blocked + صفر كتابة', { success: d.success, blocked: d.blocked, cap: captures - c0, rows: rows.length - r0 }, { success: false, blocked: true, cap: 0, rows: 0 });
eq('رسالة المنع بتسمّي الخصم', /خصم 75/.test(d.error || ''), true);
d = await call({ action: 'pay', orderId: '1', amount: '4150.00', employee: 'Fady', batchId: 'b1', sessionMeta: sess, orderMeta: { courierCollect: 4075, freeShipping: { confirmed: true, courierKind: 'courier', courierFee: 50 } } });
eq('تأكيد برسوم مختلفة عن اللي الـ Worker حسبه ← blocked', { blocked: d.blocked, cap: captures - c0 }, { blocked: true, cap: 0 });
d = await call({ action: 'pay', orderId: '1', amount: '4150.00', employee: 'Fady', batchId: 'b1', sessionMeta: sess, orderMeta: { courierCollect: 4150, freeShipping: ack('courier', 75) } });
eq('تأكيد صح ← نجح', { success: d.success, cap: captures - c0 }, { success: true, cap: 1 });
eq('courierCollect اتحسب في الـ Worker (4150 − 75) حتى لو المتصفح بعت 4150', extraOf(0).courierCollect, 4075);
eq('extra.freeShipping مكتوب', { c: extraOf(0).freeShipping.confirmed, by: extraOf(0).freeShipping.confirmedBy, k: extraOf(0).freeShipping.courierKind, f: extraOf(0).freeShipping.courierFee, s: extraOf(0).freeShipping.shopifyShipping }, { c: true, by: 'Fady', k: 'courier', f: 75, s: 0 });
eq('actions بتقول الخصم', (extraOf(0).actions || []).some(a => /اتخصم 75/.test(a)), true);

c0 = captures; r0 = rows.length;
d = await call({ action: 'pay', orderId: '4', amount: '3000.00', employee: 'Fady', batchId: 'b2', sessionMeta: { courier: 'Showroom' }, orderMeta: { courierCollect: 3000, freeShipping: ack('showroom', 0) } });
eq('Showroom مؤكَّد ← نجح وcourierCollect = المبلغ كامل', { success: d.success, cc: extraOf(1).courierCollect, f: extraOf(1).freeShipping.courierFee }, { success: true, cc: 3000, f: 0 });
d = await call({ action: 'pay', orderId: '4', amount: '3000.00', batchId: 'b2', sessionMeta: { courier: 'Showroom' }, orderMeta: { courierCollect: 3000, freeShipping: ack('courier', 75) } });
eq('Showroom بتأكيد «مندوب عادي» ← blocked (النوع لازم يطابق)', d.blocked, true);

c0 = captures; r0 = rows.length;
d = await call({ action: 'pay', orderId: '6', amount: '2500.00', batchId: 'b3', sessionMeta: { courier: 'X' }, orderMeta: { courierCollect: 2500, freeShipping: ack('courier', 75) } });
eq('بلا مندوب على الأوردر ← blocked + «حدد المندوب»', { blocked: d.blocked, msg: /حدد المندوب/.test(d.error || ''), cap: captures - c0, rows: rows.length - r0 }, { blocked: true, msg: true, cap: 0, rows: 0 });

d = await call({ action: 'pay', orderId: '3', amount: '2675.00', employee: 'Fady', batchId: 'b4', sessionMeta: { courier: 'Mohamed Torky' }, orderMeta: { courierCollect: 2600 } });
eq('أوردر شحنه 75 ← يتسجّل زي الأول بلا تأكيد', { success: d.success, cc: extraOf(rows.length - 1).courierCollect, hasFs: 'freeShipping' in extraOf(rows.length - 1) }, { success: true, cc: 2600, hasFs: false });
d = await call({ action: 'pay', orderId: '9', amount: '2900.00', batchId: 'b5', sessionMeta: { courier: 'Abo Yassin' }, orderMeta: { courierCollect: 2800, freeShipping: ack('courier', 75) } });
eq('تأكيد على أوردر مش مجاني ← يتجاهَل (مفيش extra.freeShipping، ومفيش تعديل على courierCollect)', { success: d.success, cc: extraOf(rows.length - 1).courierCollect, hasFs: 'freeShipping' in extraOf(rows.length - 1) }, { success: true, cc: 2800, hasFs: false });
d = await call({ action: 'pay', orderId: '8', amount: '1500.00', batchId: 'b6', sessionMeta: { courier: 'Saif' }, orderMeta: { courierCollect: 1500, hasReturn: true } });
eq('أوردر عليه مرتجع ← زي الأول (خارج النطاق)', { success: d.success, cc: extraOf(rows.length - 1).courierCollect }, { success: true, cc: 1500 });

c0 = captures; r0 = rows.length;
ORDERS['1'].failRead = true;
d = await call({ action: 'pay', orderId: '1', amount: '4150.00', batchId: 'b7', sessionMeta: sess, orderMeta: { freeShipping: ack('courier', 75) } });
eq('فشل قراءة شوبيفاي قبل التحصيل ← وقف نضيف (لا شوبيفاي ولا D1)', { success: d.success, blocked: d.blocked || false, cap: captures - c0, rows: rows.length - r0 }, { success: false, blocked: false, cap: 0, rows: 0 });
delete ORDERS['1'].failRead;

console.log('══ ③ الأوردر المسجّل مسبقًا ══');
KV_PENDING = { amount: '1750.00', subtotal: '1750.00', shippingAmount: '0.00', courier: 'Kareem', orderName: '#63607', lineItems: [], preRegisteredAt: '2026-11-03T10:00:00Z' };
PRE_STATE = { totalOutstandingSet: { shopMoney: { amount: '0.0' } }, s2Meta: null, courierMeta: { value: 'Kareem' }, returns: { nodes: [] } };
const pv = await call({ action: 'preview', orderId: '2' });
eq('preview مسجّل مسبقًا بشحن 0 ← شحن مجاني 75', { pre: pv.preRegistered, ...fee(pv) }, { pre: true, freeShipping: true, courierFee: 75, courierKind: 'courier', courierMissing: false });
c0 = captures; r0 = rows.length;
d = await call({ action: 'pay', orderId: '2', amount: '1750.00', batchId: 'b8', sessionMeta: { courier: 'Kareem' }, orderMeta: { courierCollect: 1750, preRegistered: true } });
eq('مسجّل مسبقًا بلا تأكيد ← blocked قبل أي كتابة (ولا مسح KV)', { blocked: d.blocked, rows: rows.length - r0 }, { blocked: true, rows: 0 });
d = await call({ action: 'pay', orderId: '2', amount: '1750.00', employee: 'Fady', batchId: 'b8', sessionMeta: { courier: 'Kareem' }, orderMeta: { courierCollect: 1750, preRegistered: true, freeShipping: ack('courier', 75) } });
eq('مسجّل مسبقًا بتأكيد ← courierCollect = 1750 − 75', { success: d.success, cc: extraOf(rows.length - 1).courierCollect, f: extraOf(rows.length - 1).freeShipping?.courierFee }, { success: true, cc: 1675, f: 75 });
KV_PENDING = null;

console.log(`\n${bad ? '❌' : '✅'} ${ok} بند عدّى · ${bad} فشل`);
process.exit(bad ? 1 : 0);
