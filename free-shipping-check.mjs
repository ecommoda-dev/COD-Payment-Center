// free-shipping-check.mjs — Worker v3.15.0: الشحن المجاني (رسوم المندوب 75 ثابتة بعد تأكيد الموظف) — S1 + المرتجع/الاستبدال (S2).
// تشغيل: node free-shipping-check.mjs   (من غير شبكة ولا D1 حقيقية — شوبيفاي ووكيل D1 وهميين)
// الحالات الحقيقية: #64603 (شحن اتشال بتعديل) · #63607 (اتعمل بلا شحن) · #65609 · أوردر Showroom بشحن 0 وبشحن 75.
import w from './index.js';

let ok = 0, bad = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) ok++; else { bad++; console.log('❌', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };

// ── أوردرات شوبيفاي ─────────────────────────────────────────────────
// ship = قيمة سطر الشحن الحالي (null = السطر اتشال) · courier = ميتافيلد custom.courier
const RET = fee => ({ id: 'r', status: 'CLOSED', createdAt: '2026-11-14T14:37:31Z', returnShippingFees: fee ? [{ amountSet: { shopMoney: { amount: String(fee.toFixed ? fee.toFixed(1) : fee) } } }] : [], returnLineItems: { nodes: [] }, exchangeLineItems: { nodes: [] } });
const RET0 = () => RET(0);
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
  // ── v3.15.0: المرتجع/الاستبدال (S2) ──
  '12': { name: '#65609', amount: '-200.0', ship: null,  courier: 'Abo Selim',     returns: [RET0()], refund: true },   // الحالة الحقيقية: استرجاع كلي بلا رسوم مرتجع
  '13': { name: '#70020', amount: '-125.0', ship: null,  courier: 'Abo Selim',     returns: [RET(75)], refund: true },   // رسوم مرتجع 75 على شوبيفاي ← القديم
  '14': { name: '#70021', amount: '100.0',  ship: null,  courier: 'Saif',          returns: [RET0()] },                   // استبدال بفرق 100 يتحصّل
  '15': { name: '#70022', amount: '-200.0', ship: '75.0', courier: 'Saif',         returns: [RET0()], refund: true },   // شحن أصلي 75 ← القديم
  '16': { name: '#70023', amount: '-200.0', ship: null,  courier: 'Showroom',      returns: [RET0()], refund: true },
  '17': { name: '#70024', amount: '-200.0', ship: null,  courier: null,            returns: [RET0()], refund: true },
  '18': { name: '#70025', amount: '-200.0', ship: null,  courier: 'Bosta',         returns: [RET0()], refund: true },
  '19': { name: '#70026', amount: '0.0',    ship: null,  courier: 'Saif',          returns: [RET0()] },                   // متبقي صفر ← مفيش حاجة تتسجّل
};
const gqlOrder = o => ({ data: { order: {
  id: 'gid://shopify/Order/1', name: o.name, cancelledAt: null, canMarkAsPaid: !o.refund, displayFinancialStatus: 'PENDING',
  totalOutstandingSet: { shopMoney: { amount: o.amount } }, subtotalPriceSet: { shopMoney: { amount: o.amount } },
  shippingLine: o.ship == null ? null : { originalPriceSet: { shopMoney: { amount: o.ship } } },
  courierMeta: o.courier == null ? null : { value: o.courier }, preRegMeta: null, s1Meta: { value: 'Delivered' }, s2Meta: null,
  discountApplications: { edges: [] }, lineItems: { nodes: [] }, returns: { nodes: o.returns }, refunds: [], transactions: [],
} } });

let gqlCalls = 0, captures = 0, refunds = 0, KV_PENDING = null, PRE_STATE = null;
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
    if (query.includes('executeRefund')) { refunds++; return new Response(JSON.stringify({ data: { refundCreate: { refund: { id: 'gid://shopify/Refund/1' }, userErrors: [] } } }), { status: 200 }); }
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
const feeL = d => ({ ...fee(d), leg: d.feeLeg });

console.log('══ ① preview: القاعدة ══');
eq('#64603 سطر الشحن اتشال + Torky ← شحن مجاني 75', fee(await call({ action: 'preview', orderId: '1' })), { freeShipping: true, courierFee: 75, courierKind: 'courier', courierMissing: false });
eq('#63607 شحن 0 + Kareem ← شحن مجاني 75', fee(await call({ action: 'preview', orderId: '2' })), { freeShipping: true, courierFee: 75, courierKind: 'courier', courierMissing: false });
eq('#64708 شحن 75 على شوبيفاي ← عادي (بلا تنبيه)', fee(await call({ action: 'preview', orderId: '3' })), { freeShipping: false, courierFee: null, courierKind: null, courierMissing: false });
eq('Showroom شحن 0 ← تنبيه بلا خصم', fee(await call({ action: 'preview', orderId: '4' })), { freeShipping: true, courierFee: 0, courierKind: 'showroom', courierMissing: false });
eq('Showroom بشحن 75 ← أوردر عادي (قرار أحمد)', fee(await call({ action: 'preview', orderId: '5' })), { freeShipping: false, courierFee: null, courierKind: null, courierMissing: false });
eq('شحن 0 وبلا مندوب ← courierMissing', fee(await call({ action: 'preview', orderId: '6' })), { freeShipping: true, courierFee: null, courierKind: null, courierMissing: true });
eq('Bosta شحن 0 ← بلا تغيير', fee(await call({ action: 'preview', orderId: '7' })), { freeShipping: false, courierFee: null, courierKind: null, courierMissing: false });
eq('أوردر عليه مرتجع بلا رسوم مرتجع + شحن 0 + مندوب عادي ← جوّه النطاق (v3.15.0)', fee(await call({ action: 'preview', orderId: '8' })), { freeShipping: true, courierFee: 75, courierKind: 'courier', courierMissing: false });
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
eq('أوردر مرتجع برسوم 0 بلا تأكيد ← blocked (v3.15.0)', { success: d.success, blocked: d.blocked }, { success: false, blocked: true });

c0 = captures; r0 = rows.length;
ORDERS['1'].failRead = true;
d = await call({ action: 'pay', orderId: '1', amount: '4150.00', batchId: 'b7', sessionMeta: sess, orderMeta: { freeShipping: ack('courier', 75) } });
eq('فشل قراءة شوبيفاي قبل التحصيل ← وقف نضيف (لا شوبيفاي ولا D1)', { success: d.success, blocked: d.blocked || false, cap: captures - c0, rows: rows.length - r0 }, { success: false, blocked: false, cap: 0, rows: 0 });
delete ORDERS['1'].failRead;

console.log('══ ③ المرتجع/الاستبدال (v3.15.0) ══');
const L = (kind, f) => ({ freeShipping: true, courierFee: f, courierKind: kind, courierMissing: false, leg: 'return' });
const NOFS = { freeShipping: false, courierFee: null, courierKind: null, courierMissing: false, leg: null };
eq('#65609 استرجاع كلي بلا رسوم مرتجع + Abo Selim ← أجر 75 (leg=return)', feeL(await call({ action: 'preview', orderId: '12' })), L('courier', 75));
eq('رسوم مرتجع 75 على شوبيفاي ← الحساب القديم', feeL(await call({ action: 'preview', orderId: '13' })), NOFS);
eq('استبدال بفرق 100 (تحصيل) بلا رسوم مرتجع ← أجر 75', feeL(await call({ action: 'preview', orderId: '14' })), L('courier', 75));
eq('مرتجع بلا رسوم لكن شحن الأوردر الأصلي 75 ← الحساب القديم', feeL(await call({ action: 'preview', orderId: '15' })), NOFS);
eq('مرتجع Showroom ← تنبيه بلا أجر', feeL(await call({ action: 'preview', orderId: '16' })), L('showroom', 0));
eq('مرتجع بلا مندوب ← courierMissing', feeL(await call({ action: 'preview', orderId: '17' })), { freeShipping: true, courierFee: null, courierKind: null, courierMissing: true, leg: 'return' });
eq('مرتجع Bosta ← بلا تغيير', feeL(await call({ action: 'preview', orderId: '18' })), NOFS);
eq('مرتجع بمتبقي صفر ← مفيش حاجة تتسجّل', feeL(await call({ action: 'preview', orderId: '19' })), NOFS);
eq('أوردر عادي feeLeg=null', (await call({ action: 'preview', orderId: '1' })).feeLeg, null);

const rsess = { courier: 'Abo Selim', paymentMethods: { cash: '275', instapay: '0', wallet: '0' } };
const ackR = (kind, f, leg = 'return') => ({ confirmed: true, courierKind: kind, courierFee: f, ...(leg ? { leg } : {}) });
let rf0 = refunds; r0 = rows.length;
d = await call({ action: 'refund', orderId: '12', refundAmount: '200.00', saleTransactions: [{ id: 't1', amount: 200 }], employee: 'Fady', batchId: 'r1', sessionMeta: rsess, orderMeta: { hasReturn: true, courierCollect: -200 } });
eq('استرداد بلا تأكيد ← blocked + صفر كتابة (لا شوبيفاي ولا D1)', { success: d.success, blocked: d.blocked, rf: refunds - rf0, rows: rows.length - r0 }, { success: false, blocked: true, rf: 0, rows: 0 });
eq('رسالة المنع بتسمّي أجر المرتجع', /المرتجع/.test(d.error || '') && /أجر 75/.test(d.error || ''), true);
d = await call({ action: 'refund', orderId: '12', refundAmount: '200.00', saleTransactions: [{ id: 't1', amount: 200 }], employee: 'Fady', batchId: 'r1', sessionMeta: rsess, orderMeta: { hasReturn: true, courierCollect: -200, freeShipping: ackR('courier', 75, null) } });
eq('تأكيد بلا leg (نسخة صفحة قديمة) على مرتجع ← blocked', { blocked: d.blocked, rf: refunds - rf0 }, { blocked: true, rf: 0 });
d = await call({ action: 'refund', orderId: '12', refundAmount: '200.00', saleTransactions: [{ id: 't1', amount: 200 }], employee: 'Fady', batchId: 'r1', sessionMeta: rsess, orderMeta: { hasReturn: true, courierCollect: -200, freeShipping: ackR('courier', 75) } });
let xr = extraOf(rows.length - 1);
eq('استرداد مؤكَّد ← نجح وشوبيفاي اتلمس مرة', { success: d.success, rf: refunds - rf0 }, { success: true, rf: 1 });
eq('courierCollect اتحسب في الـ Worker: −200 − 75 = −275 (حتى لو المتصفح بعت −200)', xr.courierCollect, -275);
eq('extra.freeShipping فيه leg=return والأجر 75', { k: xr.freeShipping.courierKind, f: xr.freeShipping.courierFee, leg: xr.freeShipping.leg, by: xr.freeShipping.confirmedBy }, { k: 'courier', f: 75, leg: 'return', by: 'Fady' });
eq('صف الاسترداد type=refund وisRefund', { t: rows[rows.length - 1][2] ?? null, isRefund: xr.isRefund, ra: xr.refundAmount }, { t: rows[rows.length - 1][2] ?? null, isRefund: true, ra: 200 });
eq('actions بتقول أجر المرتجع', (xr.actions || []).some(a => /شحن مرتجع مجاني — اتحسب 75/.test(a)), true);

rf0 = refunds; r0 = rows.length;
d = await call({ action: 'refund', orderId: '13', refundAmount: '125.00', saleTransactions: [{ id: 't1', amount: 200 }], employee: 'Fady', batchId: 'r2', sessionMeta: { courier: 'Abo Selim' }, orderMeta: { hasReturn: true, returnShipping: '75.00', courierCollect: -200 } });
xr = extraOf(rows.length - 1);
eq('مرتجع برسوم 75 على شوبيفاي ← القديم بالظبط (courierCollect المتصفح −200، ومفيش freeShipping)', { success: d.success, cc: xr.courierCollect, hasFs: 'freeShipping' in xr }, { success: true, cc: -200, hasFs: false });

rf0 = refunds; r0 = rows.length;
d = await call({ action: 'refund', orderId: '16', refundAmount: '200.00', saleTransactions: [{ id: 't1', amount: 200 }], employee: 'Fady', batchId: 'r3', sessionMeta: { courier: 'Showroom' }, orderMeta: { hasReturn: true, courierCollect: -200, freeShipping: ackR('showroom', 0) } });
xr = extraOf(rows.length - 1);
eq('Showroom مرتجع مؤكَّد ← courierCollect = −200 (بلا أجر) وleg=return', { success: d.success, cc: xr.courierCollect, leg: xr.freeShipping?.leg }, { success: true, cc: -200, leg: 'return' });

rf0 = refunds; r0 = rows.length;
d = await call({ action: 'refund', orderId: '17', refundAmount: '200.00', saleTransactions: [{ id: 't1', amount: 200 }], batchId: 'r4', sessionMeta: { courier: 'X' }, orderMeta: { hasReturn: true, freeShipping: ackR('courier', 75) } });
eq('مرتجع بلا مندوب ← blocked + «حدد المندوب» + صفر كتابة', { blocked: d.blocked, msg: /حدد المندوب/.test(d.error || ''), rf: refunds - rf0, rows: rows.length - r0 }, { blocked: true, msg: true, rf: 0, rows: 0 });

rf0 = refunds; r0 = rows.length;
ORDERS['12'].failRead = true;
d = await call({ action: 'refund', orderId: '12', refundAmount: '200.00', saleTransactions: [{ id: 't1', amount: 200 }], batchId: 'r5', sessionMeta: rsess, orderMeta: { freeShipping: ackR('courier', 75) } });
eq('فشل قراءة شوبيفاي قبل الاسترداد ← وقف نضيف (لا شوبيفاي ولا D1)', { success: d.success, blocked: d.blocked || false, rf: refunds - rf0, rows: rows.length - r0 }, { success: false, blocked: false, rf: 0, rows: 0 });
delete ORDERS['12'].failRead;

// استبدال بفرق يتحصّل (pay) — الأجر بيتطرح من فرق الاستبدال
c0 = captures; r0 = rows.length;
d = await call({ action: 'pay', orderId: '14', amount: '100.00', employee: 'Fady', batchId: 'p1', sessionMeta: { courier: 'Saif' }, orderMeta: { hasReturn: true, courierCollect: 100, freeShipping: ackR('courier', 75) } });
xr = extraOf(rows.length - 1);
eq('استبدال بفرق 100 مؤكَّد ← courierCollect = 100 − 75 = 25', { success: d.success, cap: captures - c0, cc: xr.courierCollect, leg: xr.freeShipping?.leg }, { success: true, cap: 1, cc: 25, leg: 'return' });
d = await call({ action: 'pay', orderId: '14', amount: '100.00', batchId: 'p1', sessionMeta: { courier: 'Saif' }, orderMeta: { hasReturn: true, courierCollect: 100, freeShipping: ackR('courier', 75, null) } });
eq('استبدال بتأكيد بلا leg ← blocked', d.blocked, true);

console.log('══ ④ الأوردر المسجّل مسبقًا ══');
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
