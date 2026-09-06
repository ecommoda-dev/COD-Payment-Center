# مركز تحصيل الأوردرات COD (`COD-Payment-Center`)

**بتعمل إيه:** الموظف بيسجّل تحصيل/استرداد فلوس أوردرات الدفع عند الاستلام لكل مندوب، ويشوف سجل الحركة كامل.
**مين بيستخدمها:** حسابات · مخزن
**الإصدار:** Worker `v3.4.0` · الواجهة `v3.3.0`   ← الاتنين مستقلين، طبيعي يختلفوا

## الروابط

```
الواجهة    : https://ecommoda-dev.github.io/COD-Payment-Center/
الـ Worker : https://cod-payment-center-worker.ecommoda-dev.workers.dev
اسم الـ Worker في الداشبورد: cod-payment-center-worker     ← مطابق لـ name في wrangler.toml
```

## الـ Endpoints

الراوتينج مختلط عن قصد (موثّق في بلوك الرأس بتاع `index.js`):
**GET + `?action=`** للأوث والسجل · **POST + `action` في الـ body** للأكشنات الأقدم، عشان الواجهة الحالية تفضل شغّالة من غير تعديل.

| `action` | الطريقة | بيعمل إيه |
|---|---|---|
| `check_employee` · `register_pin` · `verify_employee` · `get_employees` · `log_logout` | GET | Login / الموظفين |
| `get_logs` · `get_logs_count` · `get_logs_export` | GET | السجل (فلاتر courier · type · dateFrom/dateTo) |
| `diag` · `get_config` | GET | تشخيص الـ bindings والمتغيرات الملغاة والـ access scopes |
| `audit_pending` | GET | ⚠️ **مؤقت** — جرد `PRE_REG_KV`. مايتشالش قبل ما بند 14 يتقفل (تحت) |
| `preview` · `resolveByName` | POST | بحث/عرض الأوردر قبل التحصيل |
| `pay` · `refund` | POST | التحصيل والاسترداد الفعلي. بياخدوا `orderMeta.paymentSplit` (حصة الأوردر من طرق الدفع) و`sessionMeta.batchExpected` — الاتنين بيتكتبوا في `extra` |
| `getCourierValues` · `getCourierOrders` · `getCourierOrdersToday` | POST | أوردرات المندوب + استيراد تسليمات اليوم |

## D1

```
tool  : cod_payment
type  : payment · refund · login · logout
```

الجداول المشتركة المستخدَمة: `logs` · `employees` (مفيش جداول خاصة بالأداة دي).

⚠️ **`extra_shipping` مسجّل في `ecommoda-constants` §7 تحت `cod_payment`، لكن كود v3.3.0 مابيكتبوش خالص.**
في D1 **157 صف** آخرهم `2026-08-15` — يعني قيمة تاريخية من كود أقدم، مش نوع حيّ. متتوقعش صفوف جديدة بيه.

## المضبوط فعليًا في الداشبورد

> اللي **متظبط بالفعل** — مش اللي المفروض يكون.

```
Bindings : DB         → ecommoda-dev-logs                (D1)
           PRE_REG_KV → pre-register-payment-cod-KV      (KV · aaeff3d84e2c4e87bc7cce6bfd83ce6b)
Secrets  : WORKER_SECRET · CLIENT_ID · CLIENT_SECRET
Vars     : SHOP_DOMAIN                                   ← من [vars] في wrangler.toml
Build watch paths : * (الافتراضي) — التضييق لسه ما اتعملش (راجع «مسائل مفتوحة»)
```

⚠️ **متغيرات وbindings ملغاة** لسه ممكن تكون في الداشبورد:
`PREREG_WORKER_URL` · `PREREG_WORKER_SECRET` · `OSU_WORKER_URL` · `OSU_WORKER_SECRET` · `OSU_SERVICE` (Service Binding).
`?action=diag` بيفكّرك بيها. الـ vars منهم أول deploy من git بيشيلها (مش مكتوبة في `wrangler.toml`)، **والأسرار بتعيش** ولازم تتشال بالإيد.

## CORS

`ALLOWED_ORIGINS` **صارمة** — `https://ecommoda-dev.github.io` بس، وهي كمان قيمة الـ fallback في `getCORS()` و`json()`. لأن الأداة **مالية/كتابة**، مفيش wildcard.

## خط الأساس

> اتسجّل من D1 قبل النقل (مش من الواجهة — راجع §0-ب في `ecommoda-tool-migration-playbook`).

```
SELECT type, COUNT(*) FROM logs WHERE tool = 'cod_payment' GROUP BY type;   ← 31-08-2026

payment        3,438   آخر صف 2026-08-31T12:36:56Z
extra_shipping   157   آخر صف 2026-08-15T18:05:52Z   (تاريخي — الكود مابيكتبوش)
refund            72   آخر صف 2026-08-29T12:47:49Z
login             57   آخر صف 2026-08-31T11:33:18Z
logout             0   الكود بيكتبه، لسه محدش عمل logout صريح
```

**بعد النقل:** نفس الاستعلام لازم يرجّع أعداد **أكبر أو تساوي** دي، والفروق كلها بعد `2026-08-31`.

## فخاخ الأداة دي

- **بند 13 حصل هنا:** `import_logs` من غير idempotency اتشغّل مرتين (15-08-2026) وكتب **925 صف مكرر** بقيمة **2,351,344 ج** — 17.5% من قيمة السجل، لمدة 16 يوم. الصفوف اتشالت والـ endpoint اتشال في v3.3.0. النسخة الاحتياطية في جدول D1 `logs_dupes_backup_20260831` (يتمسح من ~07-09-2026). **الدرس: أي endpoint ترحيل مؤقت منشور بلا idempotency = قنبلة موقوتة.**
- **عطل §PREREG الصامت (16 يوم):** الأداة كانت بتنده `cod-pre-register-payment-worker` عبر HTTP، والأداة دي اتنقلت واتغيّر اسمها 16-08-2026 من غير ما `PREREG_WORKER_URL` يتحدّث — والـ try/catch حوّل كل فشل لـ `null` = «الأوردر مش مسجّل مسبقًا». اتصلح في v3.2.0 بالقراءة المباشرة من `PRE_REG_KV`، و`checkPendingPreReg`/`listPendingPreReg` بقوا **يرموا** بدل ما يرجّعوا فاضي.
- **🔴 عطل «طرق الدفع على مستوى الجلسة» (05-09-2026، اتصلح في Worker v3.4.0 + واجهة v3.3.0):**
  جلسة `e1600f6c` للمندوب Shady Mostafa كانت **أوردرين** (`#53222` و`#53322`) كل
  واحد تحصيله 2,800، والموظف دخّل 2,675 نقدي + 2,925 محفظة = 5,600. `#53322`
  فشل فماكتبش صف في D1، و`#53222` اتختم عليه **إجمالي الجلسة كامل**. النتيجة:
  السجل والإكسيل بيقولوا تحصيل 2,800 مقابل طرق دفع 5,600، و`#53322` فضل
  `PENDING` على شوبيفاي بينما فلوسه اتقبضت. اتكشف بعد يومين من ملف الإكسيل.
  **السبب البنيوي:** `paymentMethods` كانت قيمة على مستوى الجلسة بتتختم على كل
  صف، والصف بيتكتب **على النجاح بس** — فمفيش أي رابط تحقق بين الاتنين وقت
  الكتابة، ومفيش أي أثر في D1 إن الجلسة كان فيها فشل. وكمان الفشل الجزئي كان
  بيتعرض في **صندوق أخضر** (`showResult(true, …)`) فمحدش خد باله.
  **الدرس: أي قيمة على مستوى الدفعة بتتختم على صفوف بتتكتب واحد واحد لازم
  تتوزّع على الصفوف، ولازم الدفعة تسجّل اللي اتحققت عليه عشان النقص يتكشف.**
  ⚠️ الجرد اتعمل على **كل** جلسات السجل من 16-08-2026 — دي الحالة **الوحيدة**
  غير المتوازنة. (الفروق التانية جلسات استرداد الموظف كتب فيها رقم بالسالب،
  و`Math.abs()` في `isPayValid` بيقبلها — فرق إشارة مش فرق فلوس.)
- **أداء `listPending`:** بيعمل `KV.list()` + `get()` لكل مفتاح في **كل** نداء `getCourierOrders`. كل ما backlog بوسطة يكبر، البحث عن أوردرات المندوب يبطأ.

## استرجاع النسخ القديمة

> ده بديل الـ tags — دفع الـ tags ممنوع من جلسات Claude Code السحابية.

```
النسخ المرقّمة القديمة (1.3.html · 2.0.html · 3.0.html) محفوظة في commit: 505f84b
git show 505f84b:3.0.html
```

## بصمة المهارات

| المهارة | الإصدار وقت آخر تعديل |
|---|---|
| ecommoda-worker-builder | v2.1.0 |
| ecommoda-html-builder | v6.6.0 |
| ecommoda-constants | v1.2.0 |

آخر مطابقة: 06-09-2026 · `index.js` v3.4.0 · `index.html` v3.3.0
🔴 معلّقة: — لا شيء

> `ecommoda-constants` بقت **v1.4.0** — الفرق كله بنود 🟡/⚪ (راجع «مسائل مفتوحة»)، مفيش 🔴 يخص الأداة دي.

**دَين معياري معروف (الواجهة اتبنت قبل المعيار الحالي، والإصلاح ده ما وسّعش نطاقه):**
`LS_URL` لسه حقل إعدادات (Standards #28 بيقول يبقى ثابت في `§CONFIG`) · خط
`IBM Plex Mono` لسه بيتحمّل في `<head>` (اتلغى 19-08-2026) · `--container-max`
= `980px` وهي مش من الـ 3 Tiers ومع إن الأداة فيها Log Tab (المفروض M=1200px) ·
`.cl-tag` فيها `#hex` حرفي (Standards #35). البنود دي **مالهاش علاقة بعطل
05-09** ومحتاجة تسليم مستقل.

## مسائل مفتوحة

- **🟡 بند 14 (`ecommoda-constants` §11) — backlog بوسطة في `PRE_REG_KV`:** 293 مفتاح · 864,642 ج، منهم 265 بوسطة (790,269 ج). **قرار Ahmed: مش بقايا للحذف — ❌ ممنوع حذف مفاتيح بوسطة.** تحصيلات بوسطة هتتضاف للأداة قريبًا. `?action=audit_pending` هو أداة القياس الوحيدة للبند ده — **مايتشالش قبل ما يتقفل**.
- **متغيرات وأسرار ملغاة لسه في الداشبورد** — شوف قسم «المضبوط فعليًا». `?action=diag` بيعدّها.
- **`Build watch paths` لسه `*`** — التضييق على `index.js` + `wrangler.toml` (§13-ب في `ecommoda-tool-migration-playbook`) ما اتعملش. لو اتعمل، **يتوثّق هنا** عشان أي ملف جديد يعتمد عليه الـ Worker يتضاف للقايمة.
- **`extra_shipping`** — قيمة مسجّلة في `ecommoda-constants` §7 والكود مابيكتبهاش. محتاجة قرار: تتشال من الجدول ولا تتعلّم «تاريخية» زي `bosta_tracker`؟
