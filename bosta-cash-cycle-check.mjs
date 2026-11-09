// bosta-cash-cycle-check.mjs — Worker v3.11.1: تحصيل بوسطة من ملف Cash Cycles (§BOSTA).
// تشغيل: node bosta-cash-cycle-check.mjs   (من غير شبكة — شوبيفاي ووكيل D1 وKV وهمية)
// الأرقام مأخوذة من ملف حقيقي (Cash-out MONCOD02NOV26) ومن ردود شوبيفاي الحقيقية 04-11-2026:
//   #61945 (2675) · #62701 (أونلاين 1850) · #61540 (ملغي صفر) · #61298 (استرداد −1650) ·
//   #61141 (استبدال 500) · #61655 (ملف −2000 مقابل شوبيفاي −7500 ← لازم يتمنع).
import w from './index.js';

let ok = 0, bad = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) ok++; else { bad++; console.log('❌', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (name, c) => eq(name, !!c, true);

const CASH = 'MONCOD02NOV26', PAID = '2026-11-02', BIZ = 'MrQkqmcexcHuuMo7n';

// ── شوبيفاي وهمية ────────────────────────────────────────────────
const mk = (name, id, out, extra = {}) => ({ name, id, out, courier: 'Bosta', createdAt: '2026-10-20T10:00:00Z', t1: null, t2: null, cancelledAt: null, tx: [], ...extra });
const SHOP = {
  '61945': mk('#61945', 101, '2675.0', { t1: '7371541199', tx: [{ id: 'gid://shopify/OrderTransaction/1', kind: 'SALE', status: 'PENDING', amt: '2675.0' }] }),
  '62701': mk('#62701', 102, '1850.0', { t1: '3577596929' }),
  '61540': mk('#61540', 103, '0.0', { t1: '4388357834', cancelledAt: '2026-10-26T12:05:10Z' }),
  '61298': mk('#61298', 104, '-1650.0', { t1: '1459150867', t2: '1873830310', tx: [{ id: 'gid://shopify/OrderTransaction/9', kind: 'SALE', status: 'SUCCESS', amt: '1850.0' }] }),
  '61141': mk('#61141', 105, '500.0', { t1: '6372219945', t2: '6967283787' }),
  '61655': mk('#61655', 106, '-7500.0', { t1: '9688500431', t2: '5886282274', tx: [{ id: 'gid://shopify/OrderTransaction/8', kind: 'SALE', status: 'SUCCESS', amt: '9000.0' }] }),
  '70001': mk('#70001', 107, '1000.0', { t1: '1111111111', courier: 'Showroom' }),
  '70002': mk('#70002', 108, '1000.0', { t1: '2222222222' }),
  '70003': mk('#70003', 109, '300.0', { t1: '3333333333' }),
  '70004': mk('#70004', 110, '0.0', { t1: '4444444444' }),
  '49764': mk('#49764', 111, '2200.0', { createdAt: '2026-08-05T01:53:42Z' }),            // قديم بلا تتبع
  '46820': mk('#46820', 112, '0.0', { createdAt: '2026-07-07T23:53:27Z' }),               // قديم بلا تتبع · صفر
  '70010': mk('#70010', 113, '300.0', { createdAt: '2026-09-20T10:00:00Z' }),             // جديد بلا تتبع = عطل
  '70011': mk('#70011', 114, '0.0', { t1: '5555555555' }),                                // شحنة بديلة (الحالية 5555555555)
  '70012': mk('#70012', 115, '800.0', { createdAt: '2026-08-10T10:00:00Z', t1: '6666666666' }),  // قديم + له تتبع تاني
};
const byGid = {}; for (const o of Object.values(SHOP)) byGid[`gid://shopify/Order/${o.id}`] = o;
const rest = [], refunds = [], gqlOps = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('/oauth/access_token')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
  if (u.includes('/graphql.json')) {
    const { query, variables } = JSON.parse(init.body);
    if (query.includes('bostaFind')) {
      gqlOps.push('find');
      const num = variables.q.replace('name:#', '');
      const o = SHOP[num];
      return new Response(JSON.stringify({ data: { orders: { nodes: o ? [{ id: `gid://shopify/Order/${o.id}`, name: o.name }] : [] } } }), { status: 200 });
    }
    if (query.includes('bostaOrders')) {
      gqlOps.push('nodes');
      const nodes = variables.ids.map(g => { const o = byGid[g]; if (!o) return null; return {
        id: g, name: o.name, createdAt: o.createdAt, cancelledAt: o.cancelledAt, displayFinancialStatus: 'PENDING',
        totalOutstandingSet: { shopMoney: { amount: o.out } }, courier: o.courier ? { value: o.courier } : null,
        t1: o.t1 ? { value: o.t1 } : null, t2: o.t2 ? { value: o.t2 } : null, t0: null,
        transactions: o.tx.map(t => ({ id: t.id, kind: t.kind, status: t.status, amountSet: { shopMoney: { amount: t.amt } } })),
      }; });
      return new Response(JSON.stringify({ data: { nodes } }), { status: 200 });
    }
    if (query.includes('executeRefund')) {
      refunds.push(variables.input);
      const o = byGid[variables.input.orderId]; if (o) o.out = '0.0';
      return new Response(JSON.stringify({ data: { refundCreate: { refund: { id: 'gid://shopify/Refund/1', totalRefundedSet: { shopMoney: { amount: '1' } } }, userErrors: [] } } }), { status: 200 });
    }
  }
  const m = u.match(/orders\/(\d+)\/transactions\.json/);
  if (m) {
    const body = JSON.parse(init.body); rest.push({ id: m[1], ...body.transaction });
    const o = Object.values(SHOP).find(x => String(x.id) === m[1]); if (o) o.out = '0.0';
    return new Response(JSON.stringify({ transaction: { id: 777 } }), { status: 200 });
  }
  return new Response('{}', { status: 404 });
};

// ── D1 وهمية بتفهم اللي بنكتبه ونقراه ────────────────────────────
const logs = [];
const DB = { prepare: sql => ({ _b: [], bind(...a) { this._b = a; return this; },
  async run() { if (/INSERT INTO logs/.test(sql)) { const b = this._b; logs.push({ id: logs.length + 1, timestamp: b[0], tool: b[1], type: b[2], employee: b[3], order_id: b[4], order_name: b[5], value_after: b[10], notes: b[11], extra: b[12] }); } return {}; },
  async first() { return null; },
  async all() {
    if (/FROM logs WHERE tool = \? AND timestamp >= \?/.test(sql)) {
      const [tool, since, src, cash, ...tn] = this._b;
      return { results: logs.filter(l => { const e = JSON.parse(l.extra || '{}'); return l.tool === tool && l.timestamp >= since && e.source === src && e.cashOutId === cash && tn.includes(e.trackingNumber); })
        .map(l => ({ id: l.id, timestamp: l.timestamp, type: l.type, order_name: l.order_name, tn: JSON.parse(l.extra).trackingNumber })) };
    }
    return { results: [] };
  } }) };
const kvGets = [], kvDeletes = [];
const PREREG = { '105': JSON.stringify({ orderId: '105', amount: '4500', orderName: '#61141' }) };
const KV = { async get(k) { kvGets.push(k); return PREREG[k.replace('preReg:', '')] || null; }, async delete(k) { kvDeletes.push(k); }, async list() { return { keys: [] }; } };
const env = { DB, PRE_REG_KV: KV, WORKER_SECRET: 's', SHOP_DOMAIN: 'x.myshopify.com', CLIENT_ID: 'a', CLIENT_SECRET: 'b' };
const call = async (body, auth = 'Bearer s') => { const r = await w.fetch(new Request('https://x/', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json', Origin: 'https://ecommoda-dev.github.io' }, body: JSON.stringify(body) }), env); return { status: r.status, body: await r.json() }; };

// ── صفوف الملف ──────────────────────────────────────────────────
let rn = 1;
const R = (ref, trk, type, cod, online, net, fees, o = {}) => ({ rowNo: rn++, trackingNumber: trk, orderRef: ref, orderType: type, orderStatus: 'DELIVERED',
  businessId: BIZ, paymentStatus: 'Paid', cashOutId: CASH, paidAt: PAID, cod, online, netValue: net, totalFees: fees, flexShipAmount: 0, ...o });
const ROWS = {
  ok:      R('#61945', '7371541199', 'SEND', 2675, 0, 2538.2, 136.8),
  online:  R('#62701', '3577596929', 'SEND', 0, 1850, 1700.5, 149.5),
  zero:    R('#61540', '4388357834', 'SEND', 0, 0, -85.82, 185.82, { flexShipAmount: 100, orderStatus: 'RETURNED' }),
  refund:  R('#61298', '1873830310', 'CUSTOMER_RETURN_PICKUP', -1650, 0, -1771.41, 121.41),
  exch:    R('#61141', '6967283787', 'EXCHANGE', 500, 0, 334.7, 165.3),
  mism:    R('#61655', '5886282274', 'CUSTOMER_RETURN_PICKUP', -2000, 0, -2152.76, 152.76),
};
const ctx = { cashOutId: CASH, paidAt: PAID, rowsTotal: 6, netTotal: '0.00', payOrders: 4, refundOrders: 2 };
ctx.netTotal = ((Object.values(ROWS).reduce((s, r) => s + Math.round(r.netValue * 100), 0)) / 100).toFixed(2);
const val = async (rows, c = ctx) => (await call({ action: 'bostaValidate', rows, ctx: c })).body;

console.log('══ ① validate: الحالات الأساسية ══');
let v = (await val(Object.values(ROWS))).results;
const st = Object.fromEntries(v.map(r => [r.orderRef, r.status]));
eq('SEND 2675 == مستحق 2675 → ready', st['#61945'], 'ready');
eq('أونلاين فقط 1850 → ready (الإجمالي COD+Online)', st['#62701'], 'ready');
eq('ملغي صفر == صفر → ready_zero (يتسجّل لرسوم بوسطة)', st['#61540'], 'ready_zero');
eq('استرداد −1650 == −1650 → ready', st['#61298'], 'ready');
eq('استبدال 500 == 500 → ready', st['#61141'], 'ready');
eq('ملف −2000 ≠ شوبيفاي −7500 → error', st['#61655'], 'error');
yes('سبب عدم التطابق فيه الرقمين', /-2000\.00/.test(v.find(r => r.orderRef === '#61655').reasons.join()) && /-7500\.00/.test(v.find(r => r.orderRef === '#61655').reasons.join()));
eq('الإجمالي المعروض للأونلاين', v.find(r => r.orderRef === '#62701').gross, '1850.00');
eq('الـ slot: SEND→S1 / EXCHANGE→S2', [v.find(r => r.orderRef === '#61945').slot, v.find(r => r.orderRef === '#61141').slot], ['S1', 'S2']);
eq('مسجّل مسبقًا (#61141) متعلّم', v.find(r => r.orderRef === '#61141').preRegistered, true);
eq('غير مسجّل مسبقًا (#61945)', v.find(r => r.orderRef === '#61945').preRegistered, false);
yes('الرد مفيهوش حقول داخلية', !JSON.stringify(v).includes('_n') && !JSON.stringify(v).includes('_sale'));
eq('KV: مفيش مسح أبدًا', kvDeletes, []);
eq('validate ما كتبش ولا لوج ولا نداء كتابة', [logs.length, rest.length, refunds.length], [0, 0, 0]);

console.log('══ ② قواعد الصف ══');
const bad1 = async (patch, re, name, base = ROWS.online) => {
  const r = (await val([{ ...base, ...patch, rowNo: 99 }])).results[0];
  eq(`${name} → error`, r.status, 'error'); yes(`${name} → السبب`, re.test(r.reasons.join(' | ')));
  return r;
};
const callsBefore = gqlOps.length;
await bad1({ businessId: 'XXXX' }, /Business ID/, 'Business ID مختلف');
await bad1({ paymentStatus: 'Pending' }, /Payment Status/, 'Payment Status ≠ Paid');
await bad1({ cashOutId: 'OTHER99' }, /Cash-out ID/, 'Cash-out ID مختلف');
await bad1({ paidAt: '2026-11-03' }, /Paid At/, 'Paid At مختلف');
await bad1({ orderType: '' }, /Order Type/, 'Order Type فاضي');
await bad1({ trackingNumber: 'abc' }, /رقم التتبع/, 'رقم تتبع مش رقم');
await bad1({ orderRef: 'ABC' }, /Order Reference/, 'مرجع أوردر مش رقم');
await bad1({ online: -5 }, /سالب/, 'Online سالب');
await bad1({ cod: '' }, /COD/, 'COD فاضي');
await bad1({ netValue: 1700.52 }, /Net Value/, 'Net Value ≠ المعادلة (فرق قرشين)');
eq('فحوصات الملف المحلية ما نادتش شوبيفاي', gqlOps.length, callsBefore);
eq('فرق قرش واحد (0.01) مقبول', (await val([{ ...ROWS.online, netValue: 1700.49 }])).results[0].status, 'ready');
await bad1({ orderRef: '#149622', trackingNumber: '79693546', netValue: 1700.5 }, /مش موجود على شوبيفاي/, 'أوردر مش على شوبيفاي');
await bad1({ trackingNumber: '9999999999' }, /رقم التتبع \(9999999999\)/, 'رقم التتبع ≠ ميتافيلد S1');
await bad1({ orderRef: '#70001', trackingNumber: '1111111111', cod: 1000, online: 0, netValue: 900, totalFees: 100 }, /المندوب على شوبيفاي «Showroom»/, 'المندوب مش Bosta');
await bad1({ orderRef: '#61945', trackingNumber: '7371541199', cod: 2674.99, online: 0, netValue: 2538.19, totalFees: 136.8 }, /≠ مستحق شوبيفاي/, 'فرق قرش في الإجمالي مع شوبيفاي');
await bad1({ orderType: 'EXCHANGE', orderRef: '#61945', trackingNumber: '7371541199', cod: 2675, online: 0, netValue: 2538.2, totalFees: 136.8 }, /S2/, 'SEND↔EXCHANGE: تتبع S1 على صف S2', ROWS.ok);
const dup = (await val([ROWS.ok, { ...ROWS.ok, rowNo: 50 }])).results;
yes('تتبع متكرر في الدفعة → الصف التاني error', dup[1].status === 'error' && /متكرر/.test(dup[1].reasons.join()));
const bigPay = R('#61945', '7371541199', 'SEND', 2675, 0, 2538.2, 136.8);
const dueMixed = await val([bigPay, { ...ROWS.online, businessId: 'Z' }]);
eq('صف فاسد ما بيمنعش الصف السليم في نفس الدفعة', dueMixed.results.map(r => r.status), ['ready', 'error']);

console.log('══ ②-ب أوردرات قديمة بلا رقم تتبع + شحنات متعددة (v3.11.1) ══');
const old1 = (await val([R('#49764', '3214694813', 'SEND', 2200, 0, 2071.75, 128.25, { rowNo: 60 })])).results[0];
eq('قديم (قبل 13-09) بلا أي تتبع + مبلغ مطابق → ready بعلامة', [old1.status, old1.trackingUnverified, old1.reasons], ['ready', true, []]);
const old0 = (await val([R('#46820', '7810489907', 'SEND', 0, 0, -115.14, 115.14, { rowNo: 61 })])).results[0];
eq('قديم صفر/صفر (رسوم) → ready_zero بعلامة', [old0.status, old0.trackingUnverified], ['ready_zero', true]);
const oldBadAmt = (await val([R('#49764', '3214694813', 'SEND', 2000, 0, 1900, 100, { rowNo: 62 })])).results[0];
eq('قديم بلا تتبع بس المبلغ ≠ مستحق شوبيفاي → لسه error', oldBadAmt.status, 'error');
const newNo = (await val([R('#70010', '7777777777', 'SEND', 300, 0, 250, 50, { rowNo: 63 })])).results[0];
eq('جديد (بعد 13-09) بلا تتبع → لسه error', [newNo.status, /مش مسجّل/.test(newNo.reasons.join())], ['error', true]);
const oldOther = (await val([R('#70012', '9999999999', 'SEND', 800, 0, 700, 100, { rowNo: 64 })])).results[0];
eq('تتبع مختلف عن الموجود → error حتى لو الأوردر قديم', [oldOther.status, oldOther.trackingUnverified], ['error', false]);
eq('الأوردر الحديث السليم مش معلّم', (await val([ROWS.ok])).results[0].trackingUnverified, false);
const dupZero = (await val([
  R('#70011', '5555555555', 'SEND', 0, 0, -50, 50, { rowNo: 70 }),
  R('#70011', '5555555555', 'SEND', 0, 0, -50, 50, { rowNo: 71, trackingNumber: '8888888888' }),
])).results;
eq('نفس الأوردر/S1 مرتين بصفرين (شحنة ملغية وبديلها) → الصفين مش بسبب التكرار', dupZero.map(r => /أكتر من صف بمبلغ/.test(r.reasons.join())), [false, false]);
const dupMoney = (await val([
  R('#61945', '7371541199', 'SEND', 2675, 0, 2538.2, 136.8, { rowNo: 72 }),
  R('#61945', '1212121212', 'SEND', 2675, 0, 2538.2, 136.8, { rowNo: 73 }),
])).results;
eq('نفس الأوردر/S1 بصفين عليهم فلوس → التاني بيتمنع', [dupMoney[0].status, dupMoney[1].status, /أكتر من صف بمبلغ/.test(dupMoney[1].reasons.join())], ['ready', 'error', true]);
const dupMix = (await val([
  R('#61945', '7371541199', 'SEND', 2675, 0, 2538.2, 136.8, { rowNo: 74 }),
  R('#61945', '1313131313', 'SEND', 0, 0, -50, 50, { rowNo: 75 }),
])).results;
eq('صف بمبلغ + صف صفر لنفس الأوردر → مفيش منع تكرار', dupMix.map(r => /أكتر من صف بمبلغ/.test(r.reasons.join())), [false, false]);

console.log('══ ③ bostaPay ══');
const pay = async row => (await call({ action: 'bostaPay', row, ctx, employee: 'Ahmed_Ibraheem' })).body;
let p = await pay(ROWS.ok);
eq('تحصيل: نجاح', [p.success, p.status, p.logged, p.kind], [true, 'success', true, 'payment']);
eq('REST: كابتشر 2675.00 بالظبط', rest.map(r => [r.id, r.amount, r.kind]), [['101', '2675.00', 'capture']]);
let L = logs[logs.length - 1], E = JSON.parse(L.extra);
eq('صف D1: tool/type/employee/order', [L.tool, L.type, L.employee, L.order_id, L.order_name], ['cod_payment', 'payment', 'Ahmed_Ibraheem', '101', '#61945']);
eq('value_after = المحصَّل (2675)', L.value_after, 2675);
eq('🔴 courierCollect = Net Value مش المحصَّل', E.courierCollect, 2538.2);
eq('courier=Bosta · batchId ثابت لكل Cash-out · result', [E.courier, E.batchId, E.result], ['Bosta', 'bosta-' + CASH, 'success']);
eq('batchExpected: كل صفوف الملف + مجموع Net', [E.batchExpected.orders, E.batchExpected.collect, E.batchExpected.net, E.batchExpected.extraShippingTotal], [6, ctx.netTotal, ctx.netTotal, '0.00']);
eq('حقول بوسطة', [E.source, E.cashOutId, E.trackingNumber, E.slot, E.grossCollected, E.bostaFees, E.netValue, E.noCollection, E.shopifyCaptured], ['bosta_cash_cycle', CASH, '7371541199', 'S1', '2675.00', '136.80', '2538.20', false, '2675.00']);
eq('شحن إضافي فاضي (الخزنة بتقراه مرة واحدة)', [E.extraShipping, E.extraShippingTotal], [null, '0.00']);
eq('مفيش طرق دفع (إجمالي بس)', [E.paymentMethods, E.sessionPaymentMethods, E.paymentAccounts], [null, null, null]);

const nLogs = logs.length, nRest = rest.length;
p = await pay(ROWS.ok);
eq('تكرار نفس الصف: already بلا كتابة', [p.success, p.status, p.alreadyRegistered, logs.length, rest.length], [true, 'already', true, nLogs, nRest]);

p = await pay(ROWS.online);
E = JSON.parse(logs[logs.length - 1].extra);
eq('أونلاين فقط: كابتشر 1850 وجروس 1850 وCOD 0', [rest[rest.length - 1].amount, E.grossCollected, E.codAmount, E.onlineAmount], ['1850.00', '1850.00', '0.00', '1850.00']);

p = await pay(ROWS.zero);
L = logs[logs.length - 1]; E = JSON.parse(L.extra);
eq('بدون تحصيل: ولا نداء كتابة على شوبيفاي', [rest.length, refunds.length], [2, 0]);
eq('بدون تحصيل: payment · value_after 0 · noCollection · captured 0', [L.type, L.value_after, E.noCollection, E.shopifyCaptured], ['payment', 0, true, '0.00']);
eq('بدون تحصيل: courierCollect = Net السالب (رسوم بوسطة)', E.courierCollect, -85.82);
eq('Flex Ship اتخزّن', E.flexShipAmount, '100.00');
const nLogs2 = logs.length;
p = await pay(ROWS.zero);
eq('بدون تحصيل متكرر: already (حماية D1 الوحيدة — شوبيفاي ماتغيّرتش)', [p.status, logs.length], ['already', nLogs2]);

p = await pay(ROWS.refund);
L = logs[logs.length - 1]; E = JSON.parse(L.extra);
eq('استرداد: نجاح + type=refund + value_after موجب', [p.success, p.kind, L.type, L.value_after], [true, 'refund', 'refund', 1650]);
eq('استرداد: شوبيفاي اتنفّذ بـ1650 على معاملة البيع الناجحة', refunds.map(r => r.transactions.map(t => [t.parentId, t.amount])), [[['gid://shopify/OrderTransaction/9', '1650.00']]]);
eq('استرداد: courierCollect = Net السالب · isRefund · hasReturn', [E.courierCollect, E.isRefund, E.refundAmount, E.hasReturn], [-1771.41, true, 1650, true]);

p = await pay(ROWS.exch);
E = JSON.parse(logs[logs.length - 1].extra);
eq('استبدال مسجّل مسبقًا: بيتحصّل 500 والـ KV ما اتلمسش', [p.success, rest[rest.length - 1].amount, kvDeletes, E.preRegistered, E.slot], [true, '500.00', [], true, 'S2']);

const before = [logs.length, rest.length, refunds.length];
p = await pay(ROWS.mism);
eq('عدم تطابق: رفض بلا أي كتابة', [p.success, p.status, [logs.length, rest.length, refunds.length]], [false, 'error', before]);
yes('عدم تطابق: السبب واضح', /≠ مستحق شوبيفاي/.test(p.error));

// شوبيفاي اتغيّر بين الفحص والتسجيل → لازم يوقف
SHOP['70002'].out = '1000.0';
const stale = R('#70002', '2222222222', 'SEND', 1000, 0, 900, 100);
eq('validate قبل التغيير: ready', (await val([stale])).results[0].status, 'ready');
SHOP['70002'].out = '1200.0';
p = await pay(stale);
eq('الأوردر اتعدّل بعد الفحص → bostaPay بيرفض (إعادة فحص لحظية)', [p.success, rest.some(r => r.id === '108')], [false, false]);

console.log('══ ④ عقد Treasury-Ledger ══');
const rowsFor = logs.filter(l => { const e = JSON.parse(l.extra); return e.source === 'bosta_cash_cycle'; });
const toP = v => { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '').trim()); return Math.round(n * 100); };
const sumP = rowsFor.reduce((s, l) => s + toP(JSON.parse(l.extra).courierCollect), 0);
const registeredNet = ['ok', 'online', 'zero', 'refund', 'exch'].reduce((s, k) => s + Math.round(ROWS[k].netValue * 100), 0);
eq('Σ courierCollect بالقروش == Σ Net للصفوف المسجّلة', sumP, registeredNet);
eq('كل الصفوف بنفس batchId (جلسة واحدة للتحويل)', [...new Set(rowsFor.map(l => JSON.parse(l.extra).batchId))], ['bosta-' + CASH]);
eq('type دايمًا payment/refund (اللي الخزنة بتقراه)', [...new Set(rowsFor.map(l => l.type))].sort(), ['payment', 'refund']);
eq('الجلسة ناقصة (5 من 6) — الخزنة هتعلّمها incomplete', [rowsFor.length < JSON.parse(rowsFor[0].extra).batchExpected.orders, sumP !== toP(JSON.parse(rowsFor[0].extra).batchExpected.collect)], [true, true]);

console.log('══ ⑤ حراسة الطلب ══');
eq('بلا سر → 401', (await call({ action: 'bostaValidate', rows: [], ctx }, 'Bearer x')).status, 401);
eq('ctx ناقص → 400', (await call({ action: 'bostaValidate', rows: [ROWS.ok], ctx: { cashOutId: 'x' } })).status, 400);
eq('أكتر من 15 صف → 400', (await call({ action: 'bostaValidate', rows: Array.from({ length: 16 }, () => ROWS.ok), ctx })).status, 400);
eq('بلا موظف في bostaPay → 400', (await call({ action: 'bostaPay', row: ROWS.ok, ctx })).status, 400);
eq('get_config بيرجّع 3.11.0', (await (await w.fetch(new Request('https://x/?action=get_config', { headers: { Authorization: 'Bearer s' } }), env)).json()).workerVersion, 'v3.11.1');

console.log(`\n${bad ? '❌' : '✅'} ${ok} عدّى · ${bad} فشل`);
process.exit(bad ? 1 : 0);
