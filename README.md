<div dir="rtl" style="text-align: right;">

# COD Payment Center

![version](https://img.shields.io/badge/worker-v3.16.0-blue)

**Worker** أداة EcomModa الداخلية لتحصيل واسترداد فلوس أوردرات **الدفع عند الاستلام (COD)** لكل مندوب، مع سجل حركة كامل.

> 🔴 **الريبو ده Worker وبس** (قرار أحمد 14-11-2026). الواجهة اتحذفت منه وبقت صفحة جوّه مركز الشحن والتحصيل،
> زي باقي الأدوات. الرابط القديم (`.../COD-Payment-Center/`) بقى 404.

| | |
|---|---|
| **الواجهة** | https://ecommoda-dev.github.io/Delivery-COD-Operations-Center/COD-Payment-Center.html (ريبو `Delivery-COD-Operations-Center`) |
| **الـ Worker** | https://cod-payment-center-worker.ecommoda-dev.workers.dev |
| **الإصدار** | Worker `v3.16.0` |

## البنية

```
index.js       ← كود الـ Worker (Cloudflare Workers)
wrangler.toml  ← الاسم + الـ bindings + الـ vars
*.mjs          ← فحوصات الـ Worker (شوبيفاي وD1 وهميين)
CLAUDE.md      ← قواعد الأداة · عقد الخزنة · الفخاخ · المسائل المفتوحة
```

## الدخول والسر

الدخول من مركز الشحن والتحصيل (مرة واحدة)، والـ Worker بيستقبل سر مجموعة `delivery_cod_ops` من المركز.
**مفيش واجهة هنا ولا إعدادات للسر في الريبو ده.** التفاصيل في [`CLAUDE.md`](./CLAUDE.md).

## الفحوصات

```bash
node free-shipping-check.mjs && node order-kind-check.mjs && node bosta-cash-cycle-check.mjs \
  && node log-filters-check.mjs && node check-log-values.mjs
```

## النشر

آلي عبر Cloudflare Workers Builds — أي `push` على `main` بينشر الـ Worker.

> ⚠️ **ممنوع لصق كود في داشبورد Cloudflare بعد الربط** — أول `push` بيمسحه.
> الريبو ده هو المصدر الوحيد لكود الـ Worker.
> 🔴 **انشر الـ Worker قبل صفحة المركز** لو التعديل بيرفع `ECO_WORKERS.codPayment.min` هناك.

آخر تحديث: 14-11-2026

</div>
