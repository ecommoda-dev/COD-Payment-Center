// bosta-cash-cycle-check.mjs — Worker v3.18.0: تحصيل بوسطة من ملف Cash Cycles (§BOSTA).
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
const mk = (name, id, out, extra = {}) => ({ name, id, out, refunded: '0.0', courier: 'Bosta', createdAt: '2026-10-20T10:00:00Z', t1: null, t2: null, cancelledAt: null, tx: [], ...extra });
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
  // v3.12.0 — #49395 (حقيقي): S1 اتحصّل بالتسجيل المسبق 4975 (معاملة 8545299431746) والمتبقي 1225 هو فرق S2
  '49395': mk('#49395', 201, '1225.0', { createdAt: '2026-08-01T12:21:08Z', tx: [{ id: 'gid://shopify/OrderTransaction/8545299431746', kind: 'SALE', status: 'SUCCESS', amt: '4975.0' }] }),
  '49400': mk('#49400', 202, '600.0', { createdAt: '2026-08-01T12:21:08Z', t2: '4040404040' }),    // S2 وS1 بتاعه اتحصّل بأداة المناديب
  '49401': mk('#49401', 203, '0.0', { createdAt: '2026-08-01T12:21:08Z', tx: [{ id: 'gid://shopify/OrderTransaction/555', kind: 'SALE', status: 'SUCCESS', amt: '3000.0' }] }),  // S1 مسجّل مسبقًا ومفيش S2
  '70012': mk('#70012', 115, '800.0', { createdAt: '2026-08-10T10:00:00Z', t1: '6666666666' }),  // قديم + له تتبع تاني
};
// v3.13.0 — أوردرات «S1 من بوسطة مباشرة» (المتبقي على شوبيفاي = فرق S2، وS1 اتحصّل قبل كده)
const TX = (id, amt, kind = 'SALE', status = 'SUCCESS') => ({ id: `gid://shopify/OrderTransaction/${id}`, kind, status, amt });
Object.assign(SHOP, {
  '49500': mk('#49500', 301, '1225.0', { createdAt: '2026-08-01T12:21:08Z', t1: '6579132699', t2: '8145633099', tx: [TX('8545299431746', '4975.0')] }),   // #49395 الحقيقي (بنفس الأرقام)
  '49501': mk('#49501', 302, '500.0',  { createdAt: '2026-08-01T12:21:08Z', t1: '3214694801', t2: '3214694802', tx: [TX('777', '1350.0')] }),         // S1 مدفوع أونلاين
  '49502': mk('#49502', 303, '500.0',  { createdAt: '2026-08-01T12:21:08Z', t1: '3214694811', t2: '3214694812', tx: [TX('778', '1350.0')] }),         // أونلاين FAILED
  '49503': mk('#49503', 304, '300.0',  { createdAt: '2026-08-01T12:21:08Z', t1: '5996728906', t2: '5996728907', tx: [] }),                              // S1 راجع RTO (بدون تحصيل)
  '49504': mk('#49504', 305, '300.0',  { createdAt: '2026-08-01T12:21:08Z', t1: '4141414141', t2: '4141414142', tx: [TX('779', '100.0')] }),           // SALE أقل من الإجمالي
  '49505': mk('#49505', 306, '2200.0', { createdAt: '2026-08-01T12:21:08Z', t1: '4242424242', tx: [] }),                                                  // لسه مش متحصّل (المتبقي = إجمالي S1)
  '49506': mk('#49506', 307, '400.0',  { createdAt: '2026-08-01T12:21:08Z', t1: '4343434343', t2: '4343434344', tx: [TX('780', '1000.0')] }),          // شحنتين SEND
  '49507': mk('#49507', 308, '400.0',  { createdAt: '2026-08-01T12:21:08Z', t1: '4444444441', t2: '4444444442', tx: [TX('781', '1000.0')] }),          // لسه ما اتحوّلتش
});
// v3.16.0 — #46008 (حقيقي · 14-11-2026): 3 شحنات في بوسطة (Send 4200 · Exchange 500 · CRP −300) وشوبيفاي: SALE ناجحة 4200 + 500 (manual) والمتبقي −2300
Object.assign(SHOP, {
  '46008': mk('#46008', 401, '-2300.0', { createdAt: '2026-06-26T16:36:25Z', tx: [TX('1', '4200.0', 'SALE', 'PENDING'), TX('2', '4200.0'), TX('3', '500.0')] }),
  '46009': mk('#46009', 402, '-1000.0', { createdAt: '2026-06-26T16:36:25Z', tx: [TX('4', '4200.0')] }),      // SALE 4200 بس — الـ 500 ما اتسجّلتش على شوبيفاي
  '46010': mk('#46010', 403, '-100.0',  { createdAt: '2026-06-26T16:36:25Z', tx: [TX('5', '500.0')] }),       // Exchange بس بلا S1
  '46011': mk('#46011', 404, '-300.0',  { createdAt: '2026-06-26T16:36:25Z', tx: [TX('6', '4200.0')] }),      // المتبقي = الاسترداد
  '46012': mk('#46012', 405, '-100.0',  { createdAt: '2026-06-26T16:36:25Z', refunded: '300.0', tx: [TX('7', '4200.0')] }),   // الاسترداد موجود على شوبيفاي
});
// v3.17.0 — #47530 (حقيقي · 15-11-2026): Send 5275 + Exchange 100 + RTO (كانت Exchange) رسوم 181.26 − FlexShip 100 = −81.26. شوبيفاي: SALE ناجحة 5275 · المتبقي 75
Object.assign(SHOP, {
  '47530': mk('#47530', 501, '75.0', { createdAt: '2026-07-14T14:54:17Z', tx: [TX('11', '5275.0', 'SALE', 'PENDING'), TX('12', '5275.0')] }),
  '70020': mk('#70020', 601, '0.0', { createdAt: '2026-10-20T10:00:00Z', t1: '7000000020', t2: '7000000021' }),   // v3.17.1 — S1 صفر + RTO صفر من ملف الـ Cash-out
  '47531': mk('#47531', 502, '75.0', { createdAt: '2026-07-14T14:54:17Z', tx: [TX('13', '5275.0')] }),   // RTO بلا S1 مسجّلة ولا S1 قابلة (S1 مش في بوسطة)
  '47532': mk('#47532', 503, '75.0', { createdAt: '2026-07-14T14:54:17Z', tx: [TX('14', '5275.0')] }),   // RTO عليها مبلغ
  '47533': mk('#47533', 504, '75.0', { createdAt: '2026-07-14T14:54:17Z', tx: [TX('15', '5275.0')] }),   // RTO بلا oldType
});
// v3.18.0 — #48116 (حقيقي · 15-11-2026): CRP −1150 (بوسطة دفعت للعميل) وشوبيفاي عليها «مستحق استرداد» 1250 (Refund 0 اتكتب وقت الاستبدال)
Object.assign(SHOP, {
  '48116': mk('#48116', 701, '-1250.0', { createdAt: '2026-07-20T03:44:27Z', t1: '4371696766', t2: '5632517136', tx: [TX('21', '1325.0', 'SALE', 'PENDING'), TX('22', '1325.0')] }),
  '48117': mk('#48117', 702, '-1250.0', { createdAt: '2026-07-20T03:44:27Z', tx: [TX('23', '1325.0')] }),                    // مبلغ حر بسبب
  '48118': mk('#48118', 703, '0.0',     { createdAt: '2026-07-20T03:44:27Z', tx: [TX('24', '1325.0')] }),                    // شوبيفاي مفيهاش مستحق (nothing_owed)
  '48119': mk('#48119', 704, '-1250.0', { createdAt: '2026-07-20T03:44:27Z', tx: [TX('25', '1325.0')] }),                    // شوبيفاي ترفض ثم المستحق بالظبط
  '48122': mk('#48122', 707, '-1250.0', { createdAt: '2026-07-20T03:44:27Z', tx: [TX('27', '1325.0')] }),                    // صفحة قديمة
  '48121': mk('#48121', 706, '-1250.0', { createdAt: '2026-07-20T03:44:27Z', refunded: '1000.0', tx: [TX('26', '1325.0')] }), // المتاح للاسترداد 325 بس
});
// v3.20.0 — #47530 النهارده (15-11-2026): SALE ناجحة 5275 (COD) + 75 (manual) = 5350 · المتبقي 0 · Exchange +100 → فرق تغطية 25
Object.assign(SHOP, {
  '47534': mk('#47534', 801, '0.0', { createdAt: '2026-07-14T14:54:17Z', t1: '9300000001', tx: [TX('31', '5275.0', 'SALE', 'PENDING'), TX('32', '5275.0'), TX('33', '75.0')] }),
  '47535': mk('#47535', 802, '0.0', { createdAt: '2026-07-14T14:54:17Z', t1: '9300000011', tx: [TX('34', '5275.0')] }),   // مفيش أي دليل زيادة على S1 → منع
});
const bd = (tn, code, state, o = {}) => ({ trackingNumber: tn, type: { code, value: { 10: 'Send', 20: 'Return to Origin', 30: 'Exchange' }[code] }, state: { code: state }, createdAt: o.createdAt || '2026-08-01T12:00:00Z', ...(o.oldType ? { oldType: o.oldType } : {}) });
const PRIOR_S1_ADD = ['702', '703', '704', '706', '707'];
const wal = (total, fees, tx, date, flex = '0.00') => ({ wallet: { cashCycle: { total_amount: total, bosta_fees: String(fees), flex_ship_amount: flex, deposited_amt: total - fees }, cashout: tx ? { transaction_id: tx, transaction_date: date } : { next_cashout_date: '2026-11-12' } } });
const BOSTA = {
  search: {
    '46008': [bd('5671180009', 25, 46), bd('4132677759', 30, 46), bd('9619903860', 10, 45)],
    '46009': [bd('9000000001', 10, 45), bd('9000000002', 30, 46)], '46010': [bd('9000000003', 30, 46)],
    '46011': [bd('9000000004', 10, 45), bd('9000000005', 25, 46)], '46012': [bd('9000000006', 25, 46)],
    '47530': [bd('3505408529', 20, 46, { oldType: 'EXCHANGE', createdAt: '2026-08-02T09:00:00Z' }), bd('7217235847', 30, 46, { createdAt: '2026-08-06T09:00:00Z' }), bd('3356047136', 10, 45, { createdAt: '2026-07-15T09:00:00Z' })],
    '47534': [bd('9300000001', 10, 45, { createdAt: '2026-07-15T09:00:00Z' }), bd('9300000002', 30, 46, { createdAt: '2026-08-06T09:00:00Z' })],
    '47535': [bd('9300000011', 10, 45, { createdAt: '2026-07-15T09:00:00Z' }), bd('9300000012', 30, 46, { createdAt: '2026-08-06T09:00:00Z' })],
    '47531': [bd('9100000010', 20, 46, { oldType: 'EXCHANGE' })],
    '47532': [bd('9100000001', 20, 46, { oldType: 'EXCHANGE' }), bd('9100000011', 10, 45)],
    '47533': [bd('9100000002', 20, 46), bd('9100000012', 10, 45)],
    '49500': [bd('8145633099', 30, 46), bd('6579132699', 10, 45)],
    '49501': [bd('3214694801', 10, 45)], '49502': [bd('3214694811', 10, 45)], '49503': [bd('5996728906', 20, 46, { oldType: 'SEND' })],
    '49504': [bd('4141414141', 10, 45)], '49505': [bd('4242424242', 10, 45)],
    '49506': [bd('4343434343', 10, 45), bd('4343434399', 10, 49)], '49507': [bd('4444444441', 10, 45)],
    '48116': [bd('6598619692', 25, 46, { createdAt: '2026-07-28T09:00:00Z' }), bd('5632517136', 20, 46, { oldType: 'EXCHANGE', createdAt: '2026-07-27T09:00:00Z' }), bd('4371696766', 10, 45, { createdAt: '2026-07-21T09:00:00Z' })],
    '48117': [bd('9200000002', 25, 46)], '48118': [bd('9200000003', 25, 46)], '48119': [bd('9200000004', 25, 46)], '48121': [bd('9200000006', 25, 46)], '48122': [bd('9200000007', 25, 46)],
  },
  full: {
    '3356047136': { ...bd('3356047136', 10, 45), ...wal(5275, 166.16, 'MONCOD20JUL26', '2026-07-20T00:00:00.000Z') },
    '7217235847': { ...bd('7217235847', 30, 46), ...wal(100, 149.34, 'MONCOD10AUG26', '2026-08-10T00:00:00.000Z') },
    '3505408529': { ...bd('3505408529', 20, 46, { oldType: 'EXCHANGE' }), ...wal(100, 181.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z', '100.00') },
    '9300000001': { ...bd('9300000001', 10, 45), ...wal(5275, 166.16, 'MONCOD20JUL26', '2026-07-20T00:00:00.000Z') },
    '9300000002': { ...bd('9300000002', 30, 46), ...wal(100, 149.34, 'MONCOD10AUG26', '2026-08-10T00:00:00.000Z') },
    '9300000011': { ...bd('9300000011', 10, 45), ...wal(5275, 166.16, 'MONCOD20JUL26', '2026-07-20T00:00:00.000Z') },
    '9300000012': { ...bd('9300000012', 30, 46), ...wal(100, 149.34, 'MONCOD10AUG26', '2026-08-10T00:00:00.000Z') },
    '9100000010': { ...bd('9100000010', 20, 46, { oldType: 'EXCHANGE' }), ...wal(100, 181.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z', '100.00') },
    '9100000001': { ...bd('9100000001', 20, 46, { oldType: 'EXCHANGE' }), ...wal(150, 181.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z', '100.00') },
    '9100000011': { ...bd('9100000011', 10, 45), ...wal(5275, 166.16, 'MONCOD20JUL26', '2026-07-20T00:00:00.000Z') },
    '9100000002': { ...bd('9100000002', 20, 46), ...wal(100, 181.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z', '100.00') },
    '9100000012': { ...bd('9100000012', 10, 45), ...wal(5275, 166.16, 'MONCOD20JUL26', '2026-07-20T00:00:00.000Z') },
    '9619903860': { ...bd('9619903860', 10, 45), ...wal(4200, 163.02, 'WEDCOD01JUL26', '2026-07-01T00:00:00.000Z') },
    '4132677759': { ...bd('4132677759', 30, 46), ...wal(500, 147.06, 'MONCOD03AUG26', '2026-08-03T00:00:00.000Z') },
    '5671180009': { ...bd('5671180009', 25, 46), ...wal(-300, 133.38, 'MONCOD10AUG26', '2026-08-10T00:00:00.000Z') },
    '9000000001': { ...bd('9000000001', 10, 45), ...wal(4200, 163.02, 'WEDCOD01JUL26', '2026-07-01T00:00:00.000Z') },
    '9000000002': { ...bd('9000000002', 30, 46), ...wal(500, 147.06, 'MONCOD03AUG26', '2026-08-03T00:00:00.000Z') },
    '9000000003': { ...bd('9000000003', 30, 46), ...wal(500, 147.06, 'MONCOD03AUG26', '2026-08-03T00:00:00.000Z') },
    '9000000004': { ...bd('9000000004', 10, 45), ...wal(4200, 163.02, 'WEDCOD01JUL26', '2026-07-01T00:00:00.000Z') },
    '9000000005': { ...bd('9000000005', 25, 46), ...wal(-300, 133.38, 'MONCOD10AUG26', '2026-08-10T00:00:00.000Z') },
    '9000000006': { ...bd('9000000006', 25, 46), ...wal(-300, 133.38, 'MONCOD10AUG26', '2026-08-10T00:00:00.000Z') },
    '8145633099': { ...bd('8145633099', 30, 46), ...wal(1225, 172.14, 'WEDCOD12AUG26', '2026-08-12T00:00:00.000Z') },
    '6579132699': { ...bd('6579132699', 10, 45), ...wal(4975, 183.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '3214694801': { ...bd('3214694801', 10, 45), ...wal(0, 119.13, 'WEDCOD12AUG26', '2026-08-12T00:00:00.000Z'), paymentInfo: { amount: 1350, capturedStatus: 'SUCCEEDED', provider: 'Flash', method: 'flash' } },
    '3214694811': { ...bd('3214694811', 10, 45), ...wal(0, 119.13, 'WEDCOD12AUG26', '2026-08-12T00:00:00.000Z'), paymentInfo: { amount: 1350, capturedStatus: 'FAILED', provider: 'Flash' } },
    '5996728906': { ...bd('5996728906', 20, 46, { oldType: 'SEND' }), ...wal(0, 167.01, 'WEDCOD12AUG26', '2026-08-12T00:00:00.000Z') },
    '4141414141': { ...bd('4141414141', 10, 45), ...wal(1000, 100, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '4242424242': { ...bd('4242424242', 10, 45), ...wal(2200, 128.25, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '4343434343': { ...bd('4343434343', 10, 45), ...wal(1000, 100, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '4343434399': { ...bd('4343434399', 10, 49) },   // شحنة ملغية — مفيش cycle
    '4444444441': { ...bd('4444444441', 10, 45), ...wal(1000, 100, null, null) },
    '4371696766': { ...bd('4371696766', 10, 45), ...wal(1325, 133.95, 'MONCOD27JUL26', '2026-07-27T00:00:00.000Z') },
    '5632517136': { ...bd('5632517136', 20, 46, { oldType: 'EXCHANGE' }), ...wal(0, 133.38, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '6598619692': { ...bd('6598619692', 25, 46), ...wal(-1150, 124.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '9200000002': { ...bd('9200000002', 25, 46), ...wal(-1150, 124.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '9200000003': { ...bd('9200000003', 25, 46), ...wal(-1150, 124.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '9200000004': { ...bd('9200000004', 25, 46), ...wal(-1150, 124.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '9200000006': { ...bd('9200000006', 25, 46), ...wal(-1150, 124.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
    '9200000007': { ...bd('9200000007', 25, 46), ...wal(-1150, 124.26, 'WEDCOD05AUG26', '2026-08-05T00:00:00.000Z') },
  },
};
const bostaCalls = []; let bostaMode = 'ok'; let failRefund = false;
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
        totalOutstandingSet: { shopMoney: { amount: o.out } }, totalRefundedSet: { shopMoney: { amount: o.refunded } }, refunds: o.refundObjs || [], courier: o.courier ? { value: o.courier } : null,
        t1: o.t1 ? { value: o.t1 } : null, t2: o.t2 ? { value: o.t2 } : null, t0: null,
        transactions: o.tx.map(t => ({ id: t.id, kind: t.kind, status: t.status, amountSet: { shopMoney: { amount: t.amt } } })),
      }; });
      return new Response(JSON.stringify({ data: { nodes } }), { status: 200 });
    }
    if (query.includes('executeRefund')) {
      if (failRefund) return new Response(JSON.stringify({ data: { refundCreate: { refund: null, userErrors: [{ field: ['input'], message: 'Refund amount exceeds the refundable amount' }] } } }), { status: 200 });
      refunds.push(variables.input);
      const o = byGid[variables.input.orderId];
      const amt = variables.input.transactions.reduce((a, t) => a + parseFloat(t.amount), 0);
      const rid = `gid://shopify/Refund/${9000 + refunds.length}`;
      if (o) { o.out = (parseFloat(o.out) + amt).toFixed(1); o.refunded = (parseFloat(o.refunded) + amt).toFixed(1); (o.refundObjs = o.refundObjs || []).push({ id: rid, note: variables.input.note, totalRefundedSet: { shopMoney: { amount: amt.toFixed(1) } } }); }
      return new Response(JSON.stringify({ data: { refundCreate: { refund: { id: rid, totalRefundedSet: { shopMoney: { amount: amt.toFixed(1) } } }, userErrors: [] } } }), { status: 200 });
    }
  }
  if (u.startsWith('https://app.bosta.co/api/v2/')) {
    bostaCalls.push({ method: init.method || 'GET', path: u.replace('https://app.bosta.co/api/v2', ''), auth: init.headers && init.headers.Authorization });
    if (bostaMode === '401') return new Response('{"message":"Invalid"}', { status: 401 });
    if (u.endsWith('/deliveries/search')) { const ref = JSON.parse(init.body).businessReference.replace('#', ''); return new Response(JSON.stringify({ data: { deliveries: BOSTA.search[ref] || [] } }), { status: 200 }); }
    const g = u.match(/deliveries\/business\/(\d+)$/);
    if (g) return BOSTA.full[g[1]] ? new Response(JSON.stringify({ data: BOSTA.full[g[1]] }), { status: 200 }) : new Response('{}', { status: 400 });
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
const PRIOR_S1 = new Set(['104', '105', '106', '405', ...PRIOR_S1_ADD]);   // S1 اتسجّل قبل كده بأداة المناديب (الأوردرات اللي S2 بتاعها في الاختبارات القديمة)
let failLog = false;
const DB = { prepare: sql => ({ _b: [], bind(...a) { this._b = a; return this; },
  async run() { if (/INSERT INTO logs/.test(sql)) { if (failLog) throw new Error('D1 down'); const b = this._b; logs.push({ id: logs.length + 1, timestamp: b[0], tool: b[1], type: b[2], employee: b[3], order_id: b[4], order_name: b[5], value_after: b[10], notes: b[11], extra: b[12] }); } return {}; },
  async first() { return null; },
  async all() {
    if (/AS co,/.test(sql)) {   // bostaFindByTracking (v3.13.0)
      const [tool, since, src, tn] = this._b;
      return { results: logs.filter(l => { const e = JSON.parse(l.extra || '{}'); return l.tool === tool && l.timestamp >= since && e.source === src && e.trackingNumber === tn; })
        .map(l => ({ id: l.id, timestamp: l.timestamp, order_name: l.order_name, co: JSON.parse(l.extra).cashOutId, s1o: JSON.parse(l.extra).legOrigin || JSON.parse(l.extra).s1Origin || null })) };
    }
    if (/WHERE tool = \? AND order_id = \? AND timestamp >= \?/.test(sql)) {   // bostaOrderLegs (v3.16.0)
      const [tool, oid, since] = this._b;
      return { results: logs.filter(l => l.tool === tool && String(l.order_id) === oid && l.timestamp >= since && ['payment', 'refund'].includes(l.type)).map(l => ({ type: l.type, extra: l.extra })) };
    }
    if (/FROM logs WHERE tool = \? AND timestamp >= \?/.test(sql)) {
      const [tool, since, src, cash, ...tn] = this._b;
      return { results: logs.filter(l => { const e = JSON.parse(l.extra || '{}'); return l.tool === tool && l.timestamp >= since && e.source === src && e.cashOutId === cash && tn.includes(e.trackingNumber); })
        .map(l => ({ id: l.id, timestamp: l.timestamp, type: l.type, order_name: l.order_name, tn: JSON.parse(l.extra).trackingNumber, s1o: JSON.parse(l.extra).legOrigin || JSON.parse(l.extra).s1Origin || null })) };
    }
    if (/SELECT DISTINCT order_id FROM logs/.test(sql)) {
      const [tool, ...ids] = this._b;
      const got = new Set(ids.filter(id => PRIOR_S1.has(String(id))));
      logs.forEach(l => { const e = JSON.parse(l.extra || '{}'); if (l.tool === tool && ['payment', 'refund'].includes(l.type) && ids.includes(String(l.order_id)) && (e.slot || '') !== 'S2') got.add(String(l.order_id)); });
      return { results: [...got].map(order_id => ({ order_id })) };
    }
    return { results: [] };
  } }) };
const kvGets = [], kvDeletes = [];
const PREREG = { '301': JSON.stringify({ orderId: '301', orderName: '#49500', amount: '4975.00', transactionId: 8545299431746 }),
  '105': JSON.stringify({ orderId: '105', amount: '4500', orderName: '#61141' }),
  '201': JSON.stringify({ orderId: '7102191829314', orderName: '#49395', amount: '4975.00', transactionId: 8545299431746 }),
  '203': JSON.stringify({ orderId: '203', orderName: '#49401', amount: '3000.00', transactionId: 555 }) };
const KV = { async get(k) { kvGets.push(k); return PREREG[k.replace('preReg:', '')] || null; }, async delete(k) { kvDeletes.push(k); delete PREREG[k.replace('preReg:', '')]; }, async list() { return { keys: [] }; } };
const env = { DB, PRE_REG_KV: KV, WORKER_SECRET: 's', SHOP_DOMAIN: 'x.myshopify.com', CLIENT_ID: 'a', CLIENT_SECRET: 'b', BOSTA_API_KEY: 'RAWKEY' };
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
await bad1({ orderType: '' }, /Order Type/, 'Order Type فاضي');
await bad1({ trackingNumber: 'abc' }, /رقم التتبع/, 'رقم تتبع مش رقم');
await bad1({ orderRef: 'ABC' }, /Order Reference/, 'مرجع أوردر مش رقم');
await bad1({ online: -5 }, /سالب/, 'Online سالب');
await bad1({ cod: '' }, /COD/, 'COD فاضي');
await bad1({ netValue: 1700.52 }, /Net Value/, 'Net Value ≠ المعادلة (فرق قرشين)');
eq('فحوصات الملف المحلية ما نادتش شوبيفاي', gqlOps.length, callsBefore);
yes('Paid At مختلف عن الملف مش سبب رفض', !(await val([{ ...ROWS.online, paidAt: '2026-11-03', rowNo: 99 }])).results[0].reasons.some(x => /Paid At/.test(x)));
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
eq('get_config بيرجّع 3.20.0', (await (await w.fetch(new Request('https://x/?action=get_config', { headers: { Authorization: 'Bearer s' } }), env)).json()).workerVersion, 'v3.20.0');

console.log('══ ⑥ v3.12.0 — بوابة S2 + S1 المسجّل مسبقًا (#49395) ══');
const kvDel0 = kvDeletes.length, restN = () => rest.length;
const S1_49395 = R('#49395', '6579132603', 'SEND', 4975, 0, 4800, 175, { rowNo: 201, orderStatus: 'DELIVERED' });
const S2_49395 = R('#49395', '8145633046', 'EXCHANGE', 1225, 0, 1052.86, 172.14, { rowNo: 202 });
const ctx6 = { ...ctx, rowsTotal: 2, netTotal: '5852.86', payOrders: 2, refundOrders: 0, s1Orders: ['#49395'] };
const val6 = async (rows, c) => (await call({ action: 'bostaValidate', rows, ctx: c })).body.results;
const pay6 = async (row, c = ctx6) => (await call({ action: 'bostaPay', row, ctx: c, employee: 'Ahmed_Ibraheem' })).body;

let v6 = await val6([S1_49395], ctx6);
eq('S1 مسجّل مسبقًا: ready رغم إن المستحق 1225 ≠ 4975', [v6[0].status, v6[0].kind, v6[0].preRegistered], ['ready', 'prereg_s1', true]);
yes('الرد العام مفيهوش preRegTx الداخلي', !('preRegTx' in v6[0]));
v6 = await val6([S2_49395], { ...ctx6, s1Orders: [] });
eq('S2 لوحده (S1 مش متسجّل ولا في الملف) → error بسبب S1', [v6[0].status, /لم يتم تسجيل التحصيل الخاص بالشحنة الأولى \(S1\) لهذا الأوردر\./.test(v6[0].reasons.join())], ['error', true]);
v6 = await val6([S2_49395], ctx6);
eq('S2 وS1 بتاعه في نفس الملف → ready في الفحص', v6[0].status, 'ready');
const wrN = [logs.length, restN(), kvDeletes.length];
let p6 = await pay6(S2_49395);
eq('bostaPay صارم: S2 قبل S1 → رفض بلا أي كتابة', [p6.success, /الشحنة الأولى \(S1\)/.test(p6.error || ''), [logs.length, restN(), kvDeletes.length]], [false, true, wrN]);

// السجل واقع → مفيش حاجة تتغيّر (لا KV ولا شوبيفاي) وإعادة المحاولة آمنة
failLog = true; p6 = await pay6(S1_49395); failLog = false;
eq('S1: D1 واقعة → فشل نضيف (KV لسه موجود · صفر شوبيفاي)', [p6.success, '201' in PREREG, restN(), kvDeletes.length], [false, true, wrN[1], wrN[2]]);

p6 = await pay6(S1_49395);
let L6 = logs[logs.length - 1], E6 = JSON.parse(L6.extra);
eq('S1: نجاح · kind · مسح KV', [p6.success, p6.kind, p6.preRegCleared, p6.logged], [true, 'prereg_s1', true, true]);
eq('S1: صفر معاملة جديدة على شوبيفاي', restN(), wrN[1]);
eq('S1: صف payment بقيمة 4975 على أوردر 201', [L6.type, L6.value_after, L6.order_id, L6.order_name], ['payment', 4975, '201', '#49395']);
eq('🔴 S1: courierCollect = Net (4800) للخزنة', E6.courierCollect, 4800);
eq('S1: slot · shopifyCaptured · preRegCaptured · tx', [E6.slot, E6.shopifyCaptured, E6.preRegCaptured, E6.preRegTransactionId, E6.noCollection, E6.preRegistered], ['S1', '0.00', '4975.00', '8545299431746', false, true]);
eq('KV اتمسح (مفتاح 201 بس)', [kvDeletes.slice(kvDel0), '201' in PREREG], [['preReg:201'], false]);

p6 = await pay6(S1_49395);
eq('إعادة رفع S1: already بلا كتابة ولا مسح', [p6.status, kvDeletes.length - kvDel0], ['already', 1]);

p6 = await pay6(S2_49395);
L6 = logs[logs.length - 1]; E6 = JSON.parse(L6.extra);
eq('S2 بعد S1: يتسجّل 1225 على شوبيفاي', [p6.success, rest[rest.length - 1].amount, rest[rest.length - 1].id], [true, '1225.00', '201']);
eq('S2: courierCollect = 1052.86 وslot S2 (مايعدّش دليل S1 لغيره)', [E6.courierCollect, E6.slot], [1052.86, 'S2']);

// مبلغ الملف ≠ التسجيل المسبق → مفيش مسار S1 المسجّل مسبقًا
PREREG['203'] = JSON.stringify({ orderId: '203', orderName: '#49401', amount: '3000.00', transactionId: 555 });
const badAmt = (await val6([R('#49401', '1212121299', 'SEND', 2900, 0, 2800, 100, { rowNo: 210 })], ctx6))[0];
eq('S1 بمبلغ ≠ التسجيل المسبق → error والرسالة تقول المبلغين', [badAmt.status, /3000\.00/.test(badAmt.reasons.join()), /2900\.00/.test(badAmt.reasons.join())], ['error', true, true]);
const okNoS2 = (await val6([R('#49401', '1212121298', 'SEND', 3000, 0, 2850, 150, { rowNo: 211 })], ctx6))[0];
eq('أوردر مسجّل مسبقًا بالكامل (بلا S2، مستحق صفر) → ready مسار S1', [okNoS2.status, okNoS2.kind], ['ready', 'prereg_s1']);
// معاملة التسجيل المسبق مش على شوبيفاي (id مختلف) → رفض
PREREG['203'] = JSON.stringify({ orderId: '203', orderName: '#49401', amount: '3000.00', transactionId: 999 });
const noTx = (await val6([R('#49401', '1212121298', 'SEND', 3000, 0, 2850, 150, { rowNo: 212 })], ctx6))[0];
eq('transactionId مش لاقيينه على شوبيفاي → error', [noTx.status, /معاملته الناجحة/.test(noTx.reasons.join())], ['error', true]);
PREREG['203'] = JSON.stringify({ orderId: '203', orderName: '#49401', amount: '3000.00', transactionId: 555 });
// KV اتغيّر بين الفحص والمسح → ما يتمسحش + تحذير
const origGet = KV.get; let gets203 = 0;
KV.get = async k => { if (k === 'preReg:203' && ++gets203 >= 2) return JSON.stringify({ orderId: '203', amount: '3000.00', transactionId: 777 }); return origGet(k); };
const delBefore = kvDeletes.length;
p6 = await pay6(R('#49401', '1212121298', 'SEND', 3000, 0, 2850, 150, { rowNo: 213 }));
KV.get = origGet;
eq('KV اتبدّل بتسجيل أحدث → السجل اتكتب · المفتاح ما اتمسحش · تحذير', [p6.success, p6.status, p6.preRegCleared, /اتغيّر/.test(p6.warning || ''), kvDeletes.length], [true, 'warning', false, true, delBefore]);

// دليل S1 من أداة المناديب (صف cod_payment بلا slot) يفتح بوابة S2
logs.push({ id: 9001, timestamp: new Date().toISOString(), tool: 'cod_payment', type: 'payment', employee: 'x', order_id: '202', order_name: '#49400', value_after: 600, notes: '', extra: JSON.stringify({ courier: 'Bosta' }) });
const s2c = (await val6([R('#49400', '4040404040', 'EXCHANGE', 600, 0, 500, 100, { rowNo: 220 })], { ...ctx6, s1Orders: [] }))[0];
eq('S1 اتسجّل بأداة المناديب (صف بلا slot) → S2 يعدّي', s2c.status, 'ready');
p6 = await pay6(R('#49400', '4040404040', 'EXCHANGE', 600, 0, 500, 100, { rowNo: 220 }));
eq('وbostaPay الصارم كمان يسجّله', [p6.success, rest[rest.length - 1].amount], [true, '600.00']);


console.log('══ ⑦ v3.13.0 — S1 من بوسطة مباشرة (bostaS1Check · bostaPayS1) ══');
const chk = async ref => (await call({ action: 'bostaS1Check', orderRef: ref })).body;
const payS1 = async (ref, tn, expected, extra = {}) => (await call({ action: 'bostaPayS1', orderRef: ref, trackingNumber: tn, expected, employee: 'Ahmed_Ibraheem', ...extra })).body;
const cand = (r, tn) => r.candidates.find(c => c.trackingNumber === tn);
const restBefore7 = rest.length, refBefore7 = refunds.length;

// بوابة S2 تدّي كود يتعرّف عليه الواجهة
const s2mis = (await val6([R('#49500', '8145633099', 'EXCHANGE', 1225, 0, 1052.86, 172.14, { rowNo: 301 })], { ...ctx6, s1Orders: [] }))[0];
eq('S2 الممنوع: code = S1_MISSING + الرسالة «لم يتم تسجيل التحصيل الخاص بالشحنة الأولى (S1)»', [s2mis.status, s2mis.code, /لم يتم تسجيل التحصيل الخاص بالشحنة الأولى \(S1\)/.test(s2mis.reasons.join())], ['error', 'S1_MISSING', true]);

// ① #49395 الحقيقي: كل الشحنات بتتعرض، S1 قابلة للتسجيل (Net 4791.74 — الرقم الحقيقي من داشبورد بوسطة)
const w0 = [logs.length, rest.length, refunds.length, kvDeletes.length];
let c1 = await chk('#49500');
eq('الفحص: نجاح + الأوردر', [c1.success, c1.orderName, c1.hasS1, c1.candidates.length], [true, '#49500', false, 2]);
eq('الفحص: S1 الأول (مرتّبة) وS2 معاها', c1.candidates.map(c => c.trackingNumber), ['6579132699', '8145633099']);
const k1 = cand(c1, '6579132699');
eq('S1: إجمالي 4975 · صافي 4791.74 · Cash-out WEDCOD05AUG26 · 2026-08-05', [k1.gross, k1.net, k1.cashOutId, k1.cashOutDate, k1.eligible, k1.collection], ['4975.00', '4791.74', 'WEDCOD05AUG26', '2026-08-05', true, 'cashed_out']);
eq('S2 (Exchange) معروضة بس المتبقي = إجماليها → مش قابلة وتتوجّه للملف العادي (v3.16.0)', [cand(c1, '8145633099').eligible, cand(c1, '8145633099').leg, /لسه مش متحصّل/.test(cand(c1, '8145633099').blockers.join())], [false, 'S2', true]);
eq('الفحص: دليل شوبيفاي + التسجيل المسبق ظاهرين', [c1.shopifySaleCaptured, c1.shopifyOutstanding, c1.preRegistered, c1.preReg.transactionId], ['4975.00', '1225.00', true, '8545299431746']);
eq('الفحص ما كتبش حاجة (لا D1 ولا شوبيفاي ولا KV)', [logs.length, rest.length, refunds.length, kvDeletes.length], w0);
yes('مفتاح بوسطة خام بلا Bearer', bostaCalls.length > 0 && bostaCalls.every(c => c.auth === 'RAWKEY'));
yes('الرد العام مفيهوش حقول داخلية', !JSON.stringify(c1).includes('"_p"') && !JSON.stringify(c1).includes('_sales'));

const logsBefore = logs.length, kvDelBefore = kvDeletes.length;
// رقم متغيّر من وقت الفحص → رفض بلا كتابة
let ps = await payS1('#49500', '6579132699', { gross: '4975.00', net: '4000.00', cashOutId: 'WEDCOD05AUG26' });
eq('أرقام اتغيّرت → رفض stale بلا أي كتابة', [ps.success, ps.stale, logs.length, kvDeletes.length], [false, true, logsBefore, kvDelBefore]);
ps = await payS1('#49500', '8145633099', { gross: '1225.00', net: '1052.86', cashOutId: 'WEDCOD12AUG26' });
eq('تسجيل شحنة S2 اللي المتبقي = إجماليها ممنوع (المسار العادي بالملف)', [ps.success, /لسه مش متحصّل/.test(ps.error || '')], [false, true]);
ps = await payS1('#49500', '1111111111', { gross: '1', net: '1', cashOutId: 'x' });
eq('شحنة مش من الأوردر → رفض', [ps.success, /مش من شحنات الأوردر/.test(ps.error || '')], [false, true]);
failLog = true; ps = await payS1('#49500', '6579132699', { gross: '4975.00', net: '4791.74', cashOutId: 'WEDCOD05AUG26' }); failLog = false;
eq('D1 واقعة → فشل نضيف (KV لسه موجود · صفر شوبيفاي)', [ps.success, '301' in PREREG, rest.length, kvDeletes.length], [false, true, restBefore7, kvDelBefore]);

ps = await payS1('#49500', '6579132699', { gross: '4975.00', net: '4791.74', cashOutId: 'WEDCOD05AUG26' }, { s2Tracking: '8145633099' });
let L7 = logs[logs.length - 1], E7 = JSON.parse(L7.extra);
eq('تسجيل S1: نجاح + مسح KV + صفر معاملة على شوبيفاي', [ps.success, ps.status, ps.preRegCleared, ps.net, rest.length, refunds.length], [true, 'success', true, '4791.74', restBefore7, refBefore7]);
eq('الصف: payment · 4975 · أوردر 301', [L7.type, L7.value_after, L7.order_id, L7.order_name], ['payment', 4975, '301', '#49500']);
eq('🔴 عقد الخزنة: batchId مستقل + batchExpected كامل (جلسة من صف واحد)', [E7.batchId, E7.batchExpected, E7.courierCollect, E7.courier, E7.result, E7.source],
  ['bosta-s1-6579132699', { orders: 1, payOrders: 1, refundOrders: 0, collect: '4791.74', extraShippingTotal: '0.00', net: '4791.74', methods: null }, 4791.74, 'Bosta', 'success', 'bosta_cash_cycle']);
eq('الصف: slot S1 · مصدر API · Cash-out الحقيقي · بلا شوبيفاي', [E7.slot, E7.s1Origin, E7.s1Catchup, E7.cashOutId, E7.paidAt, E7.shopifyCaptured, E7.noCollection, E7.s1CatchupForTracking], ['S1', 'bosta_api', true, 'WEDCOD05AUG26', '2026-08-05', '0.00', false, '8145633099']);
eq('الصف: الرسوم والتأمين والتسجيل المسبق', [E7.grossCollected, E7.bostaFees, E7.netValue, E7.preRegCaptured, E7.preRegTransactionId], ['4975.00', '183.26', '4791.74', '4975.00', '8545299431746']);
eq('KV: مفتاح 301 بس اتمسح', [kvDeletes.slice(kvDelBefore), '301' in PREREG], [['preReg:301'], false]);

// إعادة التسجيل → ممنوع (اتسجّلت) — صفر صف جديد
const nLogs7 = logs.length;
ps = await payS1('#49500', '6579132699', { gross: '4975.00', net: '4791.74', cashOutId: 'WEDCOD05AUG26' });
eq('تسجيل نفس S1 تاني → ممنوع بلا صف جديد', [ps.success, /اتسجّلت قبل كده/.test(ps.error || ''), logs.length], [false, true, nLogs7]);
c1 = await chk('#49500');
eq('الفحص بعد التسجيل: hasS1 + السبب + مين سجّلها', [c1.hasS1, cand(c1, '6579132699').registered.viaApi, cand(c1, '6579132699').eligible], [true, true, false]);

// ② بوابة S2 بعد S1: تعدّي بالمسار العادي (bostaPay صارم) وبتتحصّل 1225 على شوبيفاي
const s2ok = (await val6([R('#49500', '8145633099', 'EXCHANGE', 1225, 0, 1052.86, 172.14, { rowNo: 301 })], { ...ctx6, s1Orders: [] }))[0];
eq('S2 بعد S1 من بوسطة: ready بلا s1Orders', [s2ok.status, s2ok.code], ['ready', null]);
p6 = await pay6(R('#49500', '8145633099', 'EXCHANGE', 1225, 0, 1052.86, 172.14, { rowNo: 301 }));
eq('S2 اتسجّل: 1225 على شوبيفاي · الصف S2', [p6.success, rest[rest.length - 1].amount, JSON.parse(logs[logs.length - 1].extra).slot], [true, '1225.00', 'S2']);

// ③ ملف الـ cash-out القديم اتسجّل بعدين: الصف المسجّل من الـ API بيتعلّم catchUp عشان الواجهة تطرحه
const fileS1 = R('#49500', '6579132699', 'SEND', 4975, 0, 4791.74, 183.26, { rowNo: 5, cashOutId: 'WEDCOD05AUG26', paidAt: '2026-08-05' });
const vf = (await val6([fileS1], { cashOutId: 'WEDCOD05AUG26', paidAt: '2026-08-05', rowsTotal: 2, netTotal: '5000.00', payOrders: 2, refundOrders: 0 }))[0];
eq('ملف cash-out قديم: الصف المسجّل بالـ API → done + catchUp', [vf.status, vf.catchUp], ['done', true]);
const vnorm = (await val6([R('#61945', '7371541199', 'SEND', 2675, 0, 2538.2, 136.8, { rowNo: 6 })], ctx))[0];
eq('صف عادي: catchUp = false', vnorm.catchUp, false);

// ④ أونلاين: cod=0 وtotal=0 والمبلغ في paymentInfo — الصافي = الأونلاين − الرسوم (الملف: 1230.87)
const c2 = await chk('#49501'), k2 = cand(c2, '3214694801');
eq('أونلاين SUCCEEDED: إجمالي 1350 · صافي 1230.87 · قابل للتسجيل', [k2.gross, k2.net, k2.onlineAmount, k2.totalAmount, k2.eligible], ['1350.00', '1230.87', '1350.00', '0.00', true]);
ps = await payS1('#49501', '3214694801', { gross: '1350.00', net: '1230.87', cashOutId: 'WEDCOD12AUG26' });
L7 = logs[logs.length - 1]; E7 = JSON.parse(L7.extra);
eq('أونلاين: courierCollect 1230.87 · شوبيفاي صفر · warning لو KV ماليش (مفيش KV هنا)', [ps.success, E7.courierCollect, E7.onlineAmount, E7.codAmount, E7.shopifyCaptured, E7.preRegTransactionId], [true, 1230.87, '1350.00', '0.00', '0.00', null]);
// الدفع الأونلاين FAILED → ممنوع ومتعرّضش
const k3 = cand(await chk('#49502'), '3214694811');
eq('أونلاين FAILED → ممنوع بالحالة بالحرف', [k3.eligible, /FAILED/.test(k3.blockers.join())], [false, true]);

// ⑤ S1 راجع RTO (بدون تحصيل): type 20 + oldType SEND — بيتسجّل لرسوم بوسطة (Net سالب) من غير دليل دفع
const k4 = cand(await chk('#49503'), '5996728906');
eq('RTO كانت SEND: S1 قابلة · إجمالي 0 · صافي −167.01', [k4.isS1Type, k4.typeCode, k4.oldType, k4.gross, k4.net, k4.eligible], [true, 20, 'SEND', '0.00', '-167.01', true]);
ps = await payS1('#49503', '5996728906', { gross: '0.00', net: '-167.01', cashOutId: 'WEDCOD12AUG26' });
L7 = logs[logs.length - 1]; E7 = JSON.parse(L7.extra);
eq('RTO: صف بلا تحصيل · courierCollect سالب · valueAfter 0', [ps.success, ps.kind, L7.value_after, E7.noCollection, E7.courierCollect, E7.batchExpected.collect], [true, 'none', 0, true, -167.01, '-167.01']);

// ⑥ المنع: دليل شوبيفاي ناقص · لسه مش متحصّل · لسه ما اتحوّلتش · شحنتين (كلهم بيتعرضوا والموظف يقرر)
const k5 = cand(await chk('#49504'), '4141414141');
eq('SALE أقل من إجمالي S1 → ممنوع', [k5.eligible, /مفيش معاملة SALE ناجحة/.test(k5.blockers.join())], [false, true]);
const k6 = cand(await chk('#49505'), '4242424242');
eq('الأوردر لسه مش متحصّل على شوبيفاي → ممنوع ويوجّه للمسار العادي', [k6.eligible, /لسه مش متحصّل/.test(k6.blockers.join())], [false, true]);
const k7 = cand(await chk('#49507'), '4444444441');
eq('لسه ما اتحوّلتش في Cash-out → ممنوع', [k7.collection, k7.eligible, /ما اتحوّلتش/.test(k7.blockers.join())], ['awaiting_cashout', false, true]);
const c8 = await chk('#49506');
eq('شحنتين SEND: الاتنين معروضين · القابلة والغير قابلة', [c8.candidates.length, cand(c8, '4343434343').eligible, cand(c8, '4343434399').eligible], [2, true, false]);
eq('الملغية بتتعرض بسببها (مفيش cycle + مش مطابقة لـ S1 على شوبيفاي)', [/Cash Cycle/.test(cand(c8, '4343434399').blockers.join()), /≠ S1 على شوبيفاي/.test(cand(c8, '4343434399').blockers.join())], [true, true]);

// ⑦ أخطاء بوسطة/الإعداد
bostaMode = '401'; let e401 = await call({ action: 'bostaS1Check', orderRef: '#49500' }); bostaMode = 'ok';
eq('بوسطة 401 → خطأ صريح (مش «مفيش شحنات»)', [e401.status, /المفتاح مرفوض/.test(e401.body.error || '')], [500, true]);
const envKey = env.BOSTA_API_KEY; delete env.BOSTA_API_KEY;
const eNoKey = await call({ action: 'bostaS1Check', orderRef: '#49500' }); env.BOSTA_API_KEY = envKey;
eq('BOSTA_API_KEY ناقص → رسالة بتسمّيه', [eNoKey.status, /BOSTA_API_KEY/.test(eNoKey.body.error || '')], [500, true]);
eq('orderRef غلط → 400', (await call({ action: 'bostaS1Check', orderRef: 'abc' })).status, 400);
eq('بلا موظف → 400', (await call({ action: 'bostaPayS1', orderRef: '#49500', trackingNumber: '6579132699', expected: {} })).status, 400);
eq('أوردر مش موجود → رسالة', (await chk('#99999')).error, 'الأوردر #99999 مش موجود على شوبيفاي');
const dg = await (await w.fetch(new Request('https://x/?action=diag', { headers: { Authorization: 'Bearer s' } }), env)).json();
eq('diag: بند BOSTA_API_KEY موجود', dg.checks.find(c => c.label === 'env.BOSTA_API_KEY')?.ok, true);


console.log('══ ⑧ v3.16.0 — أي شحنة من بوسطة (S1 + Exchange + CRP) — #46008 الحقيقي ══');
const wr = () => [logs.length, rest.length, refunds.length, kvDeletes.length];
const w8 = wr();
let d8 = await chk('#46008');
eq('الفحص: 3 شحنات · S1 الأول (Send) ثم الباقي', [d8.success, d8.candidates.length, d8.candidates[0].trackingNumber, d8.hasS1], [true, 3, '9619903860', false]);
const s1c = cand(d8, '9619903860'), exc = cand(d8, '4132677759'), crp = cand(d8, '5671180009');
eq('S1 (Send): 4200 / صافي 4036.98 / قابلة', [s1c.leg, s1c.gross, s1c.net, s1c.cashOutId, s1c.eligible], ['S1', '4200.00', '4036.98', 'WEDCOD01JUL26', true]);
eq('Exchange: S2 · 500 / صافي 352.94 / قابلة بعد S1', [exc.leg, exc.gross, exc.net, exc.cashOutId, exc.eligible, exc.afterS1, exc.refundMissing], ['S2', '500.00', '352.94', 'MONCOD03AUG26', true, true, false]);
eq('CRP: S2 · −300 / صافي −433.38 / قابلة + خطة استرداد «create» (شوبيفاي مفيهاش استرداد)', [crp.leg, crp.typeLabel, crp.gross, crp.net, crp.cashOutId, crp.eligible, crp.afterS1, crp.refundMissing], ['S2', 'Customer Return Pickup', '-300.00', '-433.38', 'MONCOD10AUG26', true, true, true]);
eq('CRP: خطة الاسترداد — المستحق 2300 · بوسطة 300 · الحد 2300 · اختيارين', crp.refund, { state: 'create', owed: '2300.00', need: '300.00', max: '2300.00', options: ['300.00', '2300.00'] });
eq('الفحص بيرجّع shopifyOwed', d8.shopifyOwed, '2300.00');
eq('دليل شوبيفاي في الرد', [d8.shopifyOutstanding, d8.shopifySaleCaptured, d8.shopifyRefunded, d8.legsRegistered], ['-2300.00', '4700.00', '0.00', { positive: '0.00', negative: '0.00' }]);
eq('S2 على ميتافيلد فاضي + أوردر قديم → ولا ملاحظة ولا مانع', [exc.notes, crp.notes], [[], []]);
eq('الفحص ما كتبش حاجة', wr(), w8);

const E8 = (l = logs[logs.length - 1]) => JSON.parse(l.extra);
// ① S2 قبل S1 → ممنوع بلا كتابة
let q = await payS1('#46008', '4132677759', { gross: '500.00', net: '352.94', cashOutId: 'MONCOD03AUG26' });
eq('Exchange قبل S1 → ممنوع (needsS1) بلا كتابة', [q.success, q.needsS1, wr()], [false, true, w8]);
// ② CRP بلا تأكيد صريح → ممنوع
q = await payS1('#46008', '5671180009', { gross: '-300.00', net: '-433.38', cashOutId: 'MONCOD10AUG26' });
eq('CRP بلا ackRefundMissing → ممنوع (needsAck) — ومعاه needsS1 أسبق', [q.success, q.needsS1 || q.needsAck], [false, true]);
// ③ S1
q = await payS1('#46008', '9619903860', { gross: '4200.00', net: '4036.98', cashOutId: 'WEDCOD01JUL26' });
let L8 = logs[logs.length - 1], X = E8();
eq('S1: نجاح · payment · slot S1 · courierCollect 4036.98 · بلا شوبيفاي', [q.success, q.status, L8.type, X.slot, X.courierCollect, X.shopifyCaptured, X.batchId, rest.length, refunds.length], [true, 'success', 'payment', 'S1', 4036.98, '0.00', 'bosta-s1-9619903860', w8[1], w8[2]]);
// ④ Exchange بعد S1
d8 = await chk('#46008');
eq('بعد S1: hasS1 + Exchange قابلة بلا afterS1 + الموجب المسجّل 4200', [d8.hasS1, cand(d8, '4132677759').eligible, cand(d8, '4132677759').afterS1, d8.legsRegistered.positive], [true, true, false, '4200.00']);
q = await payS1('#46008', '4132677759', { gross: '500.00', net: '352.94', cashOutId: 'MONCOD03AUG26' });
L8 = logs[logs.length - 1]; X = E8();
eq('Exchange: نجاح · payment · 500', [q.success, q.leg, q.kind, L8.type, L8.value_after, L8.order_name], [true, 'S2', 'leg_api', 'payment', 500, '#46008']);
eq('🔴 عقد الخزنة: جلسة مستقلة كاملة · courierCollect = Net · slot S2', [X.batchId, X.batchExpected, X.courierCollect, X.slot, X.courier, X.result, X.source],
  ['bosta-leg-4132677759', { orders: 1, payOrders: 1, refundOrders: 0, collect: '352.94', extraShippingTotal: '0.00', net: '352.94', methods: null }, 352.94, 'S2', 'Bosta', 'success', 'bosta_cash_cycle']);
eq('Exchange: Cash-out الحقيقي · أصل API · بلا شوبيفاي · hasReturn', [X.cashOutId, X.paidAt, X.legOrigin, X.legCatchup, X.shopifyCaptured, X.bostaOrderType, X.hasReturn, X.grossCollected, X.bostaFees, X.netValue], ['MONCOD03AUG26', '2026-08-03', 'bosta_api', true, '0.00', 'EXCHANGE', true, '500.00', '147.06', '352.94']);
eq('Exchange: صفر حركة على شوبيفاي', [rest.length, refunds.length], [w8[1], w8[2]]);
// ⑤ CRP: استرداد على شوبيفاي بمبلغ يختاره الموظف + تأكيد صريح (v3.18.0)
const crpExp = { gross: '-300.00', net: '-433.38', cashOutId: 'MONCOD10AUG26', owed: '2300.00', refundState: 'create' };
const nBeforeCrp = logs.length, wCrp = wr();
q = await payS1('#46008', '5671180009', { gross: '-300.00', net: '-433.38', cashOutId: 'MONCOD10AUG26' });
eq('CRP بلا اختيار مبلغ → needsRefundChoice بلا أي كتابة', [q.success, q.needsRefundChoice, q.refund && q.refund.state, wr()], [false, true, 'create', wCrp]);
q = await payS1('#46008', '5671180009', { ...crpExp, owed: '2000.00' }, { refund: { amount: '300', ack: true } });
eq('المستحق اتغيّر من وقت الفحص → stale بلا كتابة', [q.success, q.stale, wr()], [false, true, wCrp]);
q = await payS1('#46008', '5671180009', crpExp, { refund: { amount: '2301', ack: true } });
eq('مبلغ أكبر من الحد (2300) → مرفوض بلا كتابة', [q.success, /أكبر من الحد المسموح/.test(q.error || ''), wr()], [false, true, wCrp]);
q = await payS1('#46008', '5671180009', crpExp, { refund: { amount: '0', ack: true } });
eq('مبلغ صفر → مرفوض', [q.success, /أكبر من صفر/.test(q.error || ''), wr()], [false, true, wCrp]);
q = await payS1('#46008', '5671180009', crpExp, { refund: { amount: '300' } });
eq('بلا تأكيد صريح (ack) → needsAck بلا كتابة', [q.success, q.needsAck, wr()], [false, true, wCrp]);
q = await payS1('#46008', '5671180009', crpExp, { refund: { amount: '250', ack: true } });
eq('رقم مش واحد من الاتنين بلا سبب → needsReason بلا كتابة', [q.success, q.needsReason, wr()], [false, true, wCrp]);
q = await payS1('#46008', '5671180009', crpExp, { refund: { amount: '250', ack: true, reason: '  ا ' } });
eq('سبب أقصر من 3 حروف → مرفوض', [q.success, q.needsReason, wr()], [false, true, wCrp]);
q = await payS1('#46008', '5671180009', crpExp, { refund: { amount: '300.00', ack: true } });
L8 = logs[logs.length - 1]; X = E8();
eq('CRP: نجاح بتحذير · refund · 300 · الاسترداد اتعمل على شوبيفاي', [q.success, q.status, q.kind, L8.type, L8.value_after, q.refund, /لسه مستحق 2000\.00/.test(q.warning || '')], [true, 'warning', 'refund_api', 'refund', 300, { created: true, id: `gid://shopify/Refund/${9000 + refunds.length}`, amount: '300.00', owedAfter: '2000.00' }, true]);
eq('🔴 createRefund: المبلغ · الملاحظة (مفتاح عدم التكرار) · الأب = SALE ناجحة · بلا refundLineItems/شحن', [refunds[refunds.length - 1].transactions, refunds[refunds.length - 1].note, refunds[refunds.length - 1].refundLineItems, refunds[refunds.length - 1].shipping.amount, refunds[refunds.length - 1].allowOverRefunding],
  [[{ orderId: 'gid://shopify/Order/401', parentId: 'gid://shopify/OrderTransaction/2', amount: '300.00', kind: 'REFUND', gateway: 'manual' }], 'Bosta Customer Return Pickup 5671180009', [], '0.0', false]);
eq('الصف: بيانات الاسترداد على شوبيفاي مخزّنة', [X.shopifyRefundCreated, X.shopifyRefundId, X.shopifyRefundAmount, X.bostaRefundGross, X.shopifyOwedBefore, X.shopifyOwedAfter, X.refundState, X.refundReason, X.shopifyRefundMissing], [true, `gid://shopify/Refund/${9000 + refunds.length}`, '300.00', '300.00', '2300.00', '2000.00', 'create', null, false]);
eq('🔴 عقد الخزنة: courierCollect −433.38 · refundOrders 1 · collect سالب · isRefund', [X.courierCollect, X.batchExpected, X.isRefund, X.refundAmount, X.slot, X.batchId], [-433.38, { orders: 1, payOrders: 0, refundOrders: 1, collect: '-433.38', extraShippingTotal: '0.00', net: '-433.38', methods: null }, true, 300, 'S2', 'bosta-leg-5671180009']);
eq('CRP: courierCollect لسه Net بوسطة (مش مبلغ شوبيفاي) · استرداد واحد بس على شوبيفاي · صفر معاملة', [X.shopifyCaptured, X.bostaOrderType, refunds.length, rest.length], ['0.00', 'CUSTOMER_RETURN_PICKUP', w8[2] + 1, w8[1]]);
eq('3 صفوف بس اتكتبوا للأوردر (صف لكل شحنة) · مجموع Net = 3956.54',
  [logs.length - w8[0], logs.slice(w8[0]).reduce((a, l) => a + Math.round(JSON.parse(l.extra).courierCollect * 100), 0)], [3, 395654]);
// ⑥ إعادة التسجيل → ممنوع
const nAll = logs.length;
q = await payS1('#46008', '4132677759', { gross: '500.00', net: '352.94', cashOutId: 'MONCOD03AUG26' });
eq('تسجيل الشحنة تاني → ممنوع بلا صف', [q.success, /اتسجّلت قبل كده/.test(q.error || ''), logs.length], [false, true, nAll]);
// ⑦ ملفات الـ cash-out بتاعتهم بعد كده: الصفوف بتبان «اتسجّل قبل كده» + catchUp (الواجهة بتطرحها من ctx)
const fExc = (await val6([R('#46008', '4132677759', 'EXCHANGE', 500, 0, 352.94, 147.06, { rowNo: 1, cashOutId: 'MONCOD03AUG26', paidAt: '2026-08-03' })], { cashOutId: 'MONCOD03AUG26', paidAt: '2026-08-03', rowsTotal: 2, netTotal: '700.00', payOrders: 2, refundOrders: 0 }))[0];
const fCrp = (await val6([R('#46008', '5671180009', 'CUSTOMER_RETURN_PICKUP', -300, 0, -433.38, 133.38, { rowNo: 2, cashOutId: 'MONCOD10AUG26', paidAt: '2026-08-10' })], { cashOutId: 'MONCOD10AUG26', paidAt: '2026-08-10', rowsTotal: 2, netTotal: '-500.00', payOrders: 0, refundOrders: 2 }))[0];
eq('ملف MONCOD03: صف Exchange → done + catchUp (رغم إن 500 ≠ −2300)', [fExc.status, fExc.catchUp], ['done', true]);
eq('ملف MONCOD10: صف CRP → done + catchUp', [fCrp.status, fCrp.catchUp], ['done', true]);

// ⑧ حارس التكرار: SALE 4200 بس → الـ Exchange (500) ما تتسجّلش (الفلوس مش على شوبيفاي)
let d9 = await chk('#46009');
q = await payS1('#46009', '9000000001', { gross: '4200.00', net: '4036.98', cashOutId: 'WEDCOD01JUL26' });
d9 = await chk('#46009');
const e9 = cand(d9, '9000000002');
eq('SALE 4200 مسجّلة كلها لـ S1 → Exchange 500 ممنوعة بسبب الدليل', [q.success, e9.eligible, /مفيش معاملة SALE ناجحة/.test(e9.blockers.join()), /شحنات بوسطة المسجّلة قبل كده \(4200\.00\)/.test(e9.blockers.join())], [true, false, true, true]);
// ⑨ Exchange بلا S1 قابلة
const d10 = await chk('#46010'), e10 = cand(d10, '9000000003');
eq('Exchange لوحدها بلا S1 → ممنوعة', [e10.eligible, /سجّل S1 الأول/.test(e10.blockers.join())], [false, true]);
// ⑩ CRP: المتبقي = الاسترداد → المسار العادي · استرداد موجود على شوبيفاي → بلا refundMissing
const d11 = await chk('#46011');
eq('CRP والمتبقي = −300 → ممنوع ويتوجّه للملف العادي', [cand(d11, '9000000005').eligible, /الاسترداد على شوبيفاي|بيعمل الاسترداد/.test(cand(d11, '9000000005').blockers.join())], [false, true]);
const d12 = await chk('#46012'), c12 = cand(d12, '9000000006');
eq('CRP واستردادها موجود على شوبيفاي → قابلة بلا refundMissing', [c12.eligible, c12.refundMissing], [true, false]);
q = await payS1('#46012', '9000000006', { gross: '-300.00', net: '-433.38', cashOutId: 'MONCOD10AUG26' });
eq('تسجيلها بلا تأكيد خاص: نجاح بلا warning · استرداد موجود (exists) فمفيش كتابة على شوبيفاي', [q.success, q.status, E8().shopifyRefundMissing, E8().refundState, E8().shopifyRefundCreated], [true, 'success', false, 'exists', false]);
// ⑪ createRefund اتنادى مرة واحدة بس في ⑧ كله (الـ CRP بتاعة #46008)
eq('شوبيفاي: استرداد واحد بس في كل ⑧', refunds.length, w8[2] + 1);

console.log('══ ⑨ v3.17.0 — RTO (كانت Exchange) «رسوم فقط» + السطر الكاذب على المسجّلة — #47530 الحقيقي ══');
const w9 = wr();
let d47 = await chk('#47530');
let s47 = cand(d47, '3356047136'), x47 = cand(d47, '7217235847'), r47 = cand(d47, '3505408529');
eq('الفحص: 3 شحنات · hasS1=false', [d47.success, d47.candidates.length, d47.hasS1], [true, 3, false]);
eq('RTO: S2 · legKind rto_fee · إجمالي 0 · FlexShip 100 · رسوم 181.26 · Net −81.26 · Cash-out WEDCOD05AUG26',
  [r47.leg, r47.legKind, r47.typeLabel, r47.oldType, r47.gross, r47.flexShipAmount, r47.fees, r47.net, r47.cashOutId], ['S2', 'rto_fee', 'Return to Origin', 'EXCHANGE', '0.00', '100.00', '181.26', '-81.26', 'WEDCOD05AUG26']);
eq('RTO قابلة (بعد S1 القابلة في نفس الدفعة)', [r47.eligible, r47.afterS1, r47.blockers], [true, true, []]);
eq('S1 قابلة · Net 5108.84', [s47.eligible, s47.net, s47.gross], [true, '5108.84', '5275.00']);
// بوابة S1 صارمة لحظة الكتابة
let q9 = await payS1('#47530', '3505408529', { gross: '0.00', net: '-81.26', cashOutId: 'WEDCOD05AUG26' });
eq('RTO قبل S1 → needsS1 بلا كتابة', [q9.success, q9.needsS1, wr()], [false, true, w9]);
q9 = await payS1('#47530', '3356047136', { gross: '5275.00', net: '5108.84', cashOutId: 'MONCOD20JUL26' });
eq('S1 اتسجّلت', [q9.success, q9.status], [true, 'success']);
// ✅ السطر الكاذب: الشحنة المسجّلة = سبب واحد بس
d47 = await chk('#47530'); s47 = cand(d47, '3356047136'); r47 = cand(d47, '3505408529');
x47 = cand(d47, '7217235847');
eq('Exchange +100 بعد S1: ممنوعة بدليل SALE (5275 مصروفة على S1) — قرار أحمد: مؤجّلة، ما اتغيّرتش', [x47.eligible, /مفيش معاملة SALE ناجحة/.test(x47.blockers.join())], [false, true]);
eq('S1 المسجّلة: سبب واحد بس (اتسجّلت قبل كده) — بلا سطر SALE الكاذب', [s47.eligible, s47.blockers.length, /اتسجّلت قبل كده/.test(s47.blockers[0]), s47.registered.cashOutId], [false, 1, true, 'MONCOD20JUL26']);
eq('RTO بعد S1: قابلة بلا afterS1', [r47.eligible, r47.afterS1], [true, false]);
// stale
q9 = await payS1('#47530', '3505408529', { gross: '0.00', net: '-181.26', cashOutId: 'WEDCOD05AUG26' });
eq('Net غلط (−181.26 الرسوم بس) → رفض stale', [q9.success, q9.stale], [false, true]);
const n9 = logs.length;
q9 = await payS1('#47530', '3505408529', { gross: '0.00', net: '-81.26', cashOutId: 'WEDCOD05AUG26' });
const L9 = logs[logs.length - 1], X9 = E8(L9);
eq('RTO اتسجّلت: نجاح · payment · value_after 0 · kind none', [q9.success, q9.status, q9.kind, q9.leg, q9.net, L9.type, L9.value_after, L9.order_name], [true, 'success', 'none', 'S2', '-81.26', 'payment', 0, '#47530']);
eq('🔴 عقد الخزنة: جلسة مستقلة · courierCollect = Net −81.26 · batchExpected كامل', [X9.batchId, X9.courierCollect, X9.batchExpected, X9.courier, X9.result, X9.source, X9.slot],
  ['bosta-leg-3505408529', -81.26, { orders: 1, payOrders: 1, refundOrders: 0, collect: '-81.26', extraShippingTotal: '0.00', net: '-81.26', methods: null }, 'Bosta', 'success', 'bosta_cash_cycle', 'S2']);
eq('الصف: الرسوم والـ FlexShip والـ Net كلهم متخزّنين', [X9.bostaFees, X9.flexShipAmount, X9.netValue, X9.grossCollected, X9.codAmount, X9.onlineAmount], ['181.26', '100.00', '-81.26', '0.00', '0.00', '0.00']);
eq('الصف: noCollection · legKind · originalType · نوع RETURN_TO_ORIGIN · hasReturn · صفر شوبيفاي', [X9.noCollection, X9.legKind, X9.originalType, X9.bostaOrderType, X9.hasReturn, X9.shopifyCaptured, X9.legOrigin, X9.legCatchup], [true, 'rto_fee', 'EXCHANGE', 'RETURN_TO_ORIGIN', true, '0.00', 'bosta_api', true]);
eq('الأكشن بيشرح الرسوم − FlexShip = Net', [/181\.26/.test(X9.actions[0]), /FlexShip 100\.00/.test(X9.actions[0]), /-81\.26/.test(X9.actions[0]), /بلا أي حركة على شوبيفاي/.test(X9.actions[0])], [true, true, true, true]);
eq('صفر معاملة/استرداد على شوبيفاي · صفّين بس اتكتبوا', [rest.length, refunds.length, logs.length - w9[0]], [w9[1], w9[2], 2]);
eq('مجموع Net الأوردر (S1 + RTO) = 5027.58 · ومعاهم Exchange المؤجّلة = 4978.24 (ما اتسجّلتش)',
  [logs.slice(w9[0]).reduce((a, l) => a + Math.round(JSON.parse(l.extra).courierCollect * 100), 0), 510884 - 4934 - 8126], [502758, 497824]);
// إعادة التسجيل
q9 = await payS1('#47530', '3505408529', { gross: '0.00', net: '-81.26', cashOutId: 'WEDCOD05AUG26' });
eq('تسجيل RTO تاني → ممنوع بلا صف', [q9.success, /اتسجّلت قبل كده/.test(q9.error || ''), logs.length - n9], [false, true, 1]);
d47 = await chk('#47530');
eq('بعد التسجيل: RTO مسجّلة بسبب واحد', [cand(d47, '3505408529').blockers.length, cand(d47, '3505408529').registered.viaApi], [1, true]);
// ملف الـ cash-out بتاعها بعد كده → done + catchUp
const fRto = (await val6([R('#47530', '3505408529', 'RETURN TO ORIGIN', 0, 0, -81.26, 181.26, { rowNo: 1, cashOutId: 'WEDCOD05AUG26', paidAt: '2026-08-05', flexShipAmount: 100 })], { cashOutId: 'WEDCOD05AUG26', paidAt: '2026-08-05', rowsTotal: 1, netTotal: '-81.26', payOrders: 1, refundOrders: 0 }))[0];
eq('ملف WEDCOD05AUG26: صف الـ RTO → done + catchUp', [fRto.status, fRto.catchUp], ['done', true]);
// حواجز
const d31 = await chk('#47531');
eq('RTO بلا S1 مسجّلة ولا قابلة → ممنوعة (سجّل S1 الأول)', [cand(d31, '9100000010').eligible, /سجّل S1 الأول/.test(cand(d31, '9100000010').blockers.join())], [false, true]);
const d32 = await chk('#47532');
eq('RTO عليها مبلغ → ممنوعة بسبب صريح', [cand(d32, '9100000001').eligible, /عليها مبلغ/.test(cand(d32, '9100000001').blockers.join())], [false, true]);
const d33 = await chk('#47533');
eq('RTO بلا oldType → لسه «نوع مش مدعوم»', [cand(d33, '9100000002').eligible, cand(d33, '9100000002').legKind, /مش مدعوم/.test(cand(d33, '9100000002').blockers.join())], [false, undefined, true]);
eq('ولا createRefund في أي مسار', refunds.length, w9[2]);

console.log('══ ⑩ v3.17.1 — legKind=rto_fee على صف RTO «بدون تحصيل» من ملف الـ Cash-out (الخزنة بتقراه) ══');
const ctx10 = { cashOutId: 'RTOFILE01', paidAt: PAID, rowsTotal: 2, netTotal: '-70.00', payOrders: 2, refundOrders: 0 };
const pay10 = async row => (await call({ action: 'bostaPay', row, ctx: ctx10, employee: 'Ahmed_Ibraheem' })).body;
const q10a = await pay10(R('#70020', '7000000020', 'SEND', 0, 0, -10, 10, { cashOutId: 'RTOFILE01' }));
const X10a = E8();
eq('S1 صفر من الملف: اتسجّلت · بلا legKind (مش RTO)', [q10a.success, X10a.noCollection, X10a.legKind], [true, true, null]);
const q10b = await pay10(R('#70020', '7000000021', 'Return to Origin', 0, 0, -60, 60, { cashOutId: 'RTOFILE01' }));
const X10b = E8();
eq('RTO من الملف بصيغة «Return to Origin»: اتسجّلت · noCollection · legKind=rto_fee · bostaOrderType', [q10b.success, X10b.noCollection, X10b.legKind, X10b.bostaOrderType, X10b.courierCollect], [true, true, 'rto_fee', 'RETURN TO ORIGIN', -60]);

console.log('══ ⑪ v3.18.0 — استرداد بوسطة بيتعمل على شوبيفاي بمبلغ يختاره الموظف — #48116 الحقيقي ══');
const w11 = wr();
const EXP = (o = {}) => ({ gross: '-1150.00', net: '-1274.26', cashOutId: 'WEDCOD05AUG26', owed: '1250.00', refundState: 'create', ...o });
let d48 = await chk('#48116');
let c48 = cand(d48, '6598619692');
eq('#48116: 3 شحنات · S1 الأول · المستحق على شوبيفاي 1250', [d48.candidates.length, d48.shopifyOutstanding, d48.shopifyOwed, d48.shopifyRefunded], [3, '-1250.00', '1250.00', '0.00']);
eq('CRP: قابلة (بعد S1) + خطة create · الاختيارين: بوسطة 1150 والمستحق 1250 · الحد 1250', [c48.eligible, c48.afterS1, c48.refund], [true, true, { state: 'create', owed: '1250.00', need: '1150.00', max: '1250.00', options: ['1150.00', '1250.00'] }]);
// S1 + RTO (D1 بس)
q = await payS1('#48116', '4371696766', { gross: '1325.00', net: '1191.05', cashOutId: 'MONCOD27JUL26' });
eq('S1 اتسجّلت (D1 بس · الـ Net 1191.05)', [q.success, q.net], [true, '1191.05']);
q = await payS1('#48116', '5632517136', { gross: '0.00', net: '-133.38', cashOutId: 'WEDCOD05AUG26' });
eq('RTO اتسجّلت (رسوم فقط · −133.38)', [q.success, q.kind, q.net], [true, 'none', '-133.38']);
eq('لحد هنا صفر كتابة على شوبيفاي', refunds.length, w11[2]);
// شوبيفاي ترفض → صفر كتابة (لا D1 ولا شوبيفاي)
const l11 = logs.length; failRefund = true;
q = await payS1('#48116', '6598619692', EXP(), { refund: { amount: '1150', ack: true } });
failRefund = false;
eq('شوبيفاي رفضت الاسترداد → فشل بلا صف في D1 وبلا استرداد', [q.success, /شوبيفاي رفضت الاسترداد/.test(q.error || ''), q.refundCreated, logs.length, refunds.length], [false, true, undefined, l11, w11[2]]);
// الاسترداد اتعمل على شوبيفاي لكن D1 وقعت → refundCreated + الإعادة مبتكرّرش الاسترداد
failLog = true;
q = await payS1('#48116', '6598619692', EXP(), { refund: { amount: '1150', ack: true } });
failLog = false;
eq('D1 وقعت بعد نجاح شوبيفاي → refundCreated + رسالة بتقول أعد المحاولة', [q.success, q.refundCreated, /الاسترداد اتعمل على شوبيفاي/.test(q.error || ''), logs.length, refunds.length], [false, true, true, l11, w11[2] + 1]);
eq('الاسترداد على شوبيفاي: 1150 بملاحظة فيها رقم التتبع', [refunds[refunds.length - 1].transactions[0].amount, refunds[refunds.length - 1].note], ['1150.00', 'Bosta Customer Return Pickup 6598619692']);
d48 = await chk('#48116'); c48 = cand(d48, '6598619692');
eq('الفحص بعدها: الاسترداد «موجود» (اتعرف بالملاحظة) — مبقاش create', [c48.eligible, c48.refund.state, c48.refund.by, c48.refund.amount, c48.refundMissing], [true, 'exists', 'note', '1150.00', false]);
eq('المستحق بعد الاسترداد: 100 (فرق الغلطة) لسه ظاهر على شوبيفاي', [d48.shopifyOwed, d48.shopifyRefunded], ['100.00', '1150.00']);
// الإعادة: سجل D1 بس — من غير أي استرداد تاني
q = await payS1('#48116', '6598619692', EXP({ owed: undefined, refundState: 'exists' }));
L8 = logs[logs.length - 1]; X = E8();
eq('إعادة المحاولة: نجاح · D1 بس · استرداد واحد بس على شوبيفاي', [q.success, q.status, logs.length, refunds.length], [true, 'success', l11 + 1, w11[2] + 1]);
eq('الصف: refund · value_after 1150 · courierCollect −1274.26 (Net بوسطة) · exists', [L8.type, L8.value_after, X.courierCollect, X.refundState, X.shopifyRefundCreated, X.shopifyRefundMissing, X.batchId, X.slot], ['refund', 1150, -1274.26, 'exists', false, false, 'bosta-leg-6598619692', 'S2']);
const tot11 = logs.slice(l11 - 2).reduce((a, l) => a + Math.round(JSON.parse(l.extra).courierCollect * 100), 0);
eq('🔴 الخزنة: مجموع Net الأوردر = −216.59 (S1 +1191.05 · RTO −133.38 · CRP −1274.26)', [logs.length - (l11 - 2), tot11], [3, -21659]);

// مبلغ حر بسبب إجباري (#48117)
const EXP2 = (o = {}) => ({ ...EXP(), ...o });
d48 = await chk('#48117');
eq('#48117: CRP قابلة · create', [cand(d48, '9200000002').eligible, cand(d48, '9200000002').refund.state, d48.hasS1], [true, 'create', true]);
const w12 = wr();
q = await payS1('#48117', '9200000002', EXP2({ refundState: 'exists' }), { refund: { amount: '1000', ack: true, reason: 'غلطة رفع' } });
eq('حالة الاسترداد اتغيّرت عن اللي الصفحة شافتها → stale بلا كتابة', [q.success, q.stale, wr()], [false, true, w12]);
q = await payS1('#48117', '9200000002', EXP2(), { refund: { amount: '1000', ack: true } });
eq('1000 (مش 1150 ولا 1250) بلا سبب → needsReason بلا كتابة', [q.success, q.needsReason, wr()], [false, true, w12]);
q = await payS1('#48117', '9200000002', EXP2(), { refund: { amount: '1000', ack: true, reason: 'غلطة رفع الشحنة — العميل خد 1150 مش 1250' } });
L8 = logs[logs.length - 1]; X = E8();
eq('1000 بسبب: نجاح بتحذيرين (مختلف عن بوسطة + لسه مستحق 250)', [q.success, q.status, /غير اللي بوسطة دفعته \(1150\.00\)/.test(q.warning || ''), /لسه مستحق 250\.00/.test(q.warning || ''), q.refund], [true, 'warning', true, true, { created: true, id: `gid://shopify/Refund/${9000 + refunds.length}`, amount: '1000.00', owedAfter: '250.00' }]);
eq('الصف: المبلغ المختار والسبب والمستحق قبل/بعد · courierCollect Net بوسطة', [X.shopifyRefundAmount, X.bostaRefundGross, X.shopifyOwedBefore, X.shopifyOwedAfter, X.refundReason, X.courierCollect, L8.value_after], ['1000.00', '1150.00', '1250.00', '250.00', 'غلطة رفع الشحنة — العميل خد 1150 مش 1250', -1274.26, 1150]);

// المستحق بالظبط 1250 بلا سبب (#48119) — وشوبيفاي ترفض أول مرة
q = await payS1('#48119', '9200000004', EXP2(), { refund: { amount: '1250', ack: true } });
L8 = logs[logs.length - 1]; X = E8();
eq('1250 (المستحق) بلا سبب: نجاح · المستحق بعد = 0 · بلا تحذير «لسه مستحق»', [q.success, q.refund.owedAfter, /لسه مستحق/.test(q.warning || ''), /غير اللي بوسطة دفعته/.test(q.warning || ''), X.shopifyRefundAmount, X.shopifyOwedAfter], [true, '0.00', false, true, '1250.00', '0.00']);

// الحد الأقصى = المتاح للاسترداد (#48121: 325 بس)
d48 = await chk('#48121'); const c21 = cand(d48, '9200000006');
eq('#48121: الحد = المتاح للاسترداد 325 · مفيش اختيارات جاهزة (1150 و1250 أكبر منه)', [c21.refund.state, c21.refund.max, c21.refund.options], ['create', '325.00', []]);
const w13 = wr();
q = await payS1('#48121', '9200000006', EXP2(), { refund: { amount: '400', ack: true, reason: 'اختبار' } });
eq('400 > الحد (325) → مرفوض بلا كتابة', [q.success, /أكبر من الحد المسموح \(325\.00\)/.test(q.error || ''), wr()], [false, true, w13]);
q = await payS1('#48121', '9200000006', EXP2(), { refund: { amount: '325', ack: true, reason: 'اختبار' } });
eq('325 + سبب: نجاح', [q.success, q.refund.amount], [true, '325.00']);

// شوبيفاي مفيهاش مستحق (#48118) — سجل D1 بس بتأكيد صريح
d48 = await chk('#48118'); const c18 = cand(d48, '9200000003');
eq('#48118: nothing_owed (المستحق 0 ولا استرداد) · قابلة', [c18.eligible, c18.refund, c18.refundMissing], [true, { state: 'nothing_owed' }, true]);
const w14 = wr();
q = await payS1('#48118', '9200000003', EXP2({ owed: undefined, refundState: 'nothing_owed' }));
eq('بلا تأكيد → needsAck بلا كتابة', [q.success, q.needsAck, wr()], [false, true, w14]);
q = await payS1('#48118', '9200000003', EXP2({ owed: undefined, refundState: 'nothing_owed' }), { refund: { ack: true } });
X = E8();
eq('بتأكيد: D1 بس · صفر استرداد · shopifyRefundMissing=true · تحذير', [q.success, q.status, refunds.length, X.shopifyRefundMissing, X.refundState, X.shopifyRefundCreated, /مفيهاش مستحق استرداد/.test(q.warning || '')], [true, 'warning', w14[2], true, 'nothing_owed', false, true]);
// صفحة قديمة (بتبعت ackRefundMissing بس من غير refund) على حالة create → مابتكتبش على شوبيفاي بالغلط ولا D1
const w15 = wr();
q = await payS1('#48122', '9200000007', EXP2(), { ackRefundMissing: true });
eq('صفحة قديمة على حالة create → needsRefundChoice بلا أي كتابة (لا شوبيفاي ولا D1)', [q.success, q.needsRefundChoice, wr()], [false, true, w15]);

console.log('══ ⑫ v3.20.0 — فرق تغطية شوبيفاي على Exchange (#47530 النهارده: 100 مقابل 75) — إقرار صريح بلا سقف ══');
const w20 = wr();
let d34 = await chk('#47534'), x34 = cand(d34, '9300000002');
eq('#47534: شوبيفاي SALE 5350 · المتبقي 0', [d34.shopifySaleCaptured, d34.shopifyOutstanding], ['5350.00', '0.00']);
const s34pay = await payS1('#47534', '9300000001', { gross: '5275.00', net: '5108.84', cashOutId: 'MONCOD20JUL26' });
eq('S1 اتسجّلت', [s34pay.success, s34pay.status], [true, 'success']);
d34 = await chk('#47534'); x34 = cand(d34, '9300000002');
eq('Exchange +100: قابلة بإقرار (مش ممنوعة) · الفرق 25 · المغطّى 75', [x34.eligible, x34.needsCaptureAck, x34.captureGap, x34.blockers], [true, true, { gap: '25.00', proven: '75.00', gross: '100.00' }, []]);
eq('الملاحظة بتقول الفرق', /الفرق 25\.00/.test(x34.notes.join()), true);
const EXP12 = (o = {}) => ({ gross: '100.00', net: '-49.34', cashOutId: 'MONCOD10AUG26', captureGap: '25.00', ...o });
const w20b = wr();
let q12 = await payS1('#47534', '9300000002', EXP12());
eq('بلا إقرار → needsCaptureAck بلا أي كتابة', [q12.success, q12.needsCaptureAck, q12.captureGap.gap, wr()], [false, true, '25.00', w20b]);
q12 = await payS1('#47534', '9300000002', EXP12(), { captureGap: { ack: true } });
eq('إقرار بلا سبب → needsReason بلا كتابة', [q12.success, q12.needsReason, wr()], [false, true, w20b]);
q12 = await payS1('#47534', '9300000002', EXP12(), { captureGap: { ack: true, reason: 'ab' } });
eq('سبب أقصر من 3 حروف → needsReason', [q12.success, q12.needsReason, wr()], [false, true, w20b]);
q12 = await payS1('#47534', '9300000002', EXP12({ captureGap: '30.00' }), { captureGap: { ack: true, reason: 'شحنة اترفعت بـ100 مقابل 75' } });
eq('expected.captureGap غلط → stale بلا كتابة', [q12.success, q12.stale, wr()], [false, true, w20b]);
q12 = await payS1('#47534', '9300000002', EXP12(), { captureGap: { ack: true, reason: 'شحنة اترفعت بـ100 مقابل 75' } });
const L12 = logs[logs.length - 1], X12 = E8(L12);
eq('بإقرار وسبب: نجاح · warning · payment · value_after 100', [q12.success, q12.status, q12.kind, q12.leg, L12.type, L12.value_after], [true, 'warning', 'leg_api', 'S2', 'payment', 100]);
eq('🔴 الخزنة: courierCollect = Net −49.34 · جلسة مستقلة · batchExpected كامل', [X12.courierCollect, X12.batchId, X12.batchExpected.collect, X12.courier, X12.source], [-49.34, 'bosta-leg-9300000002', '-49.34', 'Bosta', 'bosta_cash_cycle']);
eq('extra: shopifyCaptureShort · الفرق · المغطّى · السبب', [X12.shopifyCaptureShort, X12.shopifyCaptureGap, X12.shopifyCaptureProven, X12.captureGapReason], [true, '25.00', '75.00', 'شحنة اترفعت بـ100 مقابل 75']);
eq('التحذير بيسمّي الفرق + الأكشن بيسجّله', [/الفرق 25\.00/.test(q12.warning || ''), X12.actions.some(a => /الفرق 25\.00/.test(a))], [true, true]);
eq('صفر كتابة على شوبيفاي · صفّين D1 بس (S1 + Exchange)', [rest.length, refunds.length, logs.length - w20[0]], [w20[1], w20[2], 2]);
q12 = await payS1('#47534', '9300000002', EXP12(), { captureGap: { ack: true, reason: 'تاني' } });
eq('إعادة التسجيل → ممنوع بلا صف', [q12.success, /اتسجّلت قبل كده/.test(q12.error || '')], [false, true]);
// بلا أي دليل زيادة على المسجّل قبل كده → منع زي ما هو (مفيش تساهل)
await payS1('#47535', '9300000011', { gross: '5275.00', net: '5108.84', cashOutId: 'MONCOD20JUL26' });
const d35 = await chk('#47535'), x35 = cand(d35, '9300000012');
eq('#47535 (SALE 5275 بس = S1): Exchange ممنوعة · بلا captureGap', [x35.eligible, x35.captureGap, /مفيش معاملة SALE ناجحة/.test(x35.blockers.join())], [false, undefined, true]);
q12 = await payS1('#47535', '9300000012', EXP12(), { captureGap: { ack: true, reason: 'محاولة' } });
eq('الإقرار مابيفتحش الممنوعة', [q12.success, /مفيش معاملة SALE ناجحة/.test(q12.error || '')], [false, true]);

console.log(`\n${bad ? '❌' : '✅'} ${ok} عدّى · ${bad} فشل`);
process.exit(bad ? 1 : 0);
