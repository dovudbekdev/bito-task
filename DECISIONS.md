# DECISIONS.md

BITO POS test task bo'yicha qilgan asosiy texnik va biznes qarorlarim. TZ ba'zi joylarni ataylab ochiq qoldirgan — shu yerda ularni qanday yechganimni qisqacha yozib qo'ydim.

---

## 1. Stack tanlovi

TZ da Node.js + Express, MongoDB va React tavsiya qilingan. Men backend uchun **NestJS 11 + PostgreSQL + TypeORM** ishlatdim.

Nega shunday qildim:

- Buyurtma yaratish, ombor kamayishi va to'lov webhooklari bitta transaction ichida bo'lishi kerak edi. PostgreSQL buni yaxshi ushlab turadi.
- Bir xil `eventId` ikki marta kelmasligi, foreign key va qator lock kabi narsalar bu loyihada muhim. MongoDB da buni qilish mumkin, lekin murakkabroq bo'lardi.
- NestJS modulli tuzilmasi (auth, tenant, products, orders, payments, reports) keyin kengaytirish oson.

Frontend alohida repo da — `bito-task-web`. Bu yerda faqat API va Docker qoldi.

---

## 2. Auth va rollar (Stage 1–2)

**Rollar:** `super_admin`, `admin`, `cashier`.

- **Super admin** — adminlarni yaratadi/o'chiradi, hamma tenant ko'radi.
- **Admin** — o'z tenant(lar)ini yaratadi, kassir va mahsulot boshqaradi, hisobot ko'radi. Bir nechta tenant bo'lishi mumkin.
- **Kassir** — faqat o'z tenantidagi mahsulotlarni sotadi, buyurtma yaratadi.

Login + parol, JWT (access + refresh). Kassir login qilganda JWT da tenant bor. Admin bir nechta tenant egasi bo'lsa, avval `POST /auth/switch-tenant` orqali faol tenant tanlanadi — keyin mahsulot, kassir, hisobot shu tenant bo'yicha ishlaydi.

Tenant tanlanmagan admin uchun scoped operatsiyalar `400` qaytaradi (`Select an active tenant...`).

---

## 3. Multi-tenant model

Tenant — alohida do'kon/biznes.

- Kassir bitta tenantga bog'langan.
- Admin ko'p tenant ochishi mumkin, lekin bir vaqtda bittasi faol.
- Super admin cheklovsiz.

Mahsulot, buyurtma va hisobot so'rovlari JWT dagi tenant bo'yicha filtrlanadi. Boshqa tenant ma'lumotiga ruxsatsiz kirish `403` yoki `404` — qisman leak qilmaymiz.

---

## 4. Savat va narxlar (Stage 3)

**Client narx yuborsa ham ishonmaymiz.**

`POST /orders` faqat `{ productId, quantity }[]` qabul qiladi. Server:

1. Mahsulot shu kassir tenantiga tegishli ekanini tekshiradi.
2. DB dan hozirgi `unitPrice`, `costPrice` va omborni o'qiydi.
3. Narxni `order_items` ga snapshot qilib saqlaydi.
4. Omborni shu transaction ichida kamaytiradi.

Frontend savatda narx ko'rsatsa ham, bu faqat UI uchun. Haqiqiy summa doim server hisoblaydi.

---

## 5. Oversell oldini olish (Stage 4)

Ombor buyurtma yaratilishi bilan bir transaction da kamayadi. Mahsulot qatorlari `pessimistic_write` lock bilan yuklanadi — ikki kassir oxirgi bir donani bir vaqtda sotib yubora olmaydi.

Ombor yetmasa transaction bekor bo'ladi: `Insufficient stock for product: {name}`.

---

## 6. To'lov oqimi (Stage 5)

Buyurtma yaratilganda status — `pending_payment`. **Paid faqat webhook orqali** bo'ladi.

- `POST /webhooks/payment` — body ustida HMAC-SHA256 (`x-signature`) tekshiriladi.
- `eventId` unique saqlanadi — bir xil webhook ikki marta kelsa ikkinchisi idempotent (`Event already processed`, 200).
- `PATCH /orders/:id` bilan `status: paid` yuborish **rad etiladi**. To'lov provayder emas, hech kim qo'lda paid qila olmaydi.

Webhook body dan tenant olinmaydi — faqat order record orqali aniqlanadi.

---

## 7. Buyurtma statuslari

| Status | Qachon |
|--------|--------|
| `pending_payment` | Buyurtma yaratilganda |
| `paid` | To'lov webhook kelganda |
| `cancelled` | Bekor qilinganda |

`pending_payment` dan faqat `paid` yoki `cancelled` ga o'tish mumkin. `paid` va `cancelled` — final, keyin o'zgartirilmaydi.

Frontend (POS) buyurtma yaratadi va to'lov kutilish holatini ko'rsatadi. Paid bo'lishini faqat webhook belgilaydi.

---

## 8. Foyda va maxfiy ma'lumotlar (Stage 6)

`costPrice` va foyda — **faqat admin va super admin** ko'radi.

- Kassir mahsulotlarda va chekda faqat sotuv narxini ko'radi.
- Admin mahsulot, buyurtma, chek va hisobotda to'liq tannarx + foydani ko'radi.

`GET /orders/:id/receipt` — paid buyurtma uchun. Admin javobida qo'shimcha `totalCost` va `totalProfit` bor.

---

## 9. Sotuv hisoboti (Stage 7)

`GET /reports/sales` — faqat **paid** buyurtmalar. Admin uchun faol tenant, super admin uchun hammasi.

Sana filtri `from` / `to` — `paidAt` bo'yicha (UTC).

Qaytariladigan maydonlar:

| Maydon | Ma'nosi |
|--------|---------|
| `orderCount` | To'langan buyurtmalar soni |
| `totalRevenue` | Mijozlar to'lagan jami summa |
| `totalCost` | Sotilgan mahsulotlarning jami **tan narxi** (har item: `costPrice × quantity`). Bu do'kon xarajati emas. |
| `totalProfit` | `totalRevenue − totalCost` — asosiy ko'rsatkich |
| `averageOrderValue` | `totalRevenue / orderCount` — bitta buyurtmaning o'rtacha summasi |

Hisobotda eng muhim raqam — **foyda** (`totalProfit`).

---

## 10. TZ dagi noaniq joylar — qanday yechdim

| Savol | Qaror |
|-------|--------|
| Server savat narxiga ishonadimi? | Yo'q. Faqat server snapshot. |
| Buyurtmani kim paid qiladi? | Faqat payment webhook. |
| Foydani kim ko'radi? | Admin va super admin. |
| Admin bir nechta tenant | `switch-tenant` dan keyin JWT dagi `tenantId` — barcha scoped operatsiya shu bo'yicha. |
| Webhook ikki marta kelsa | `eventId` saqlanadi, ikkinchisi 200 + "already processed". |
| Webhook tenant qayerdan? | Payload emas, order dan. |
| Narxlar API formati | `@IsDecimal()` — string (`"7000.00"`), number emas. |
| Avtomatik testlar | Yo'q. Swagger, curl va `scripts/local/generate-webhook-signature.js` bilan manual tekshirildi. |

---

## 11. Frontend va yetkazish doirasi

- **`bito-task`** — backend API, Docker, migratsiya, seed.
- **`bito-task-web`** — React + TypeScript admin panel va kassir POS. Backend API ga ulanadi.

To'liq oqim: kassir POS da buyurtma yaratadi → `pending_payment` → to'lov webhook keladi → `paid` → chek ochiladi. Admin paneldan tenant, kassir, mahsulot va hisobot boshqariladi.
