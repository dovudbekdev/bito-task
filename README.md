# BITO-TASK

NestJS asosidagi multi-tenant POS SaaS REST API.

Arxitektura va biznes qarorlari: [DECISIONS.md](DECISIONS.md)

## Docker bilan ishga tushirish

### Talablar

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

### 1. Muhit o'zgaruvchilarini sozlash

```bash
cp .env.docker.example .env
```

`.env` faylida quyidagilarni o'zgartiring:

- `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET` — kamida 20 belgili kuchli qiymatlar
- `SUPER_ADMIN_LOGIN` va `SUPER_ADMIN_PASSWORD` — birinchi super-admin uchun
- `PAYMENT_WEBHOOK_SECRET` — webhook imzosi uchun (min 20 belgi)

### 2. Ishga tushirish

```bash
docker compose up -d --build
```

### 3. Tekshirish

| Resurs | URL |
|--------|-----|
| Swagger | http://localhost:3000/api/docs |
| API | http://localhost:3000/api/ |

```bash
docker compose logs -f app
docker compose ps
```

Birinchi marta ishga tushganda migrationlar avtomatik ishga tushadi va super-admin seed qilinadi.

### Mock ma'lumotlar (ixtiyoriy)

Demo tenant, kassir va mahsulotlar uchun:

```bash
docker compose exec app npm run db:seed:prod
```

### 4. To'xtatish

```bash
docker compose down
docker compose down -v   # DB bilan to'liq tozalash
```

## Lokal development

```bash
npm install
cp .env.example .env.development.local   # va qiymatlarni to'ldiring
npm run migration:run
npm run start:dev
```

## Production deploy (PM2 + GitHub Actions)

`main` branchga push qilganda GitHub Actions serverga SSH orqali ulanadi va [`scripts/deploy.sh`](scripts/deploy.sh) ni ishga tushiradi: kod yangilanadi, build, migration va PM2 reload.

### Bir martalik server sozlash

```bash
git clone https://github.com/dovudbekdev/bito-task.git
cd bito-task
cp .env.example .env   # production qiymatlarni to'ldiring (DB_URL, JWT, va h.k.)
npm ci
npm run build
npm run migration:run:prod
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # chiqadigan buyruqni bajarish (rebootdan keyin avtomatik start)
chmod +x scripts/deploy.sh
```

**Talablar:** Node 20+ (afzal 22), PM2, Git, PostgreSQL.

### GitHub Secrets

Repository → Settings → Secrets and variables → Actions:

| Secret | Tavsif |
|--------|--------|
| `SSH_HOST` | Server IP yoki domen |
| `SSH_USER` | SSH foydalanuvchi |
| `SSH_PRIVATE_KEY` | Deploy SSH private key (to'liq PEM) |
| `SSH_PORT` | SSH port (odatda `22`) |
| `DEPLOY_PATH` | Loyiha papkasi serverda (masalan `/var/www/bito-task`) |

SSH kalit: `ssh-keygen -t ed25519 -C "github-deploy" -f deploy_key` — public keyni server `authorized_keys` ga, private keyni GitHub secretga qo'ying.

### Qo'lda deploy yoki rollback

```bash
cd /path/to/bito-task
bash scripts/deploy.sh
```

Rollback: `git reset --hard <commit-hash>` va keyin `./scripts/deploy.sh`.

Deploy xatoligida: `pm2 logs bito-task`

## Migration

Schema o'zgarishlari TypeORM migrationlar orqali boshqariladi (`synchronize: false`).

```bash
npm run migration:run        # pending migrationlarni ishga tushirish
npm run migration:revert     # oxirgi migrationni qaytarish
npm run migration:show       # migration holati
npm run migration:generate -- src/database/migrations/MigrationName  # yangi migration generatsiya
```

Production (Docker) ichida migrationlar app startida avtomatik ishlaydi. PM2 deployda [`scripts/deploy.sh`](scripts/deploy.sh) `migration:run:prod` ni ishga tushiradi.

## Mock seed (development)

Demo ma'lumotlar faqat CLI orqali qo'shiladi — productionda avtomatik emas.

```bash
npm run migration:run
npm run db:seed
```

Docker ichida:

```bash
docker compose exec app npm run db:seed:prod
```

| Rol | Ism | Login | Parol |
|-----|-----|-------|-------|
| Admin | Namuna admin | `demo-admin` | `admin123` |
| Kassir 1 | Birinchi kassir | `cashier1` | `cashier123` |
| Kassir 2 | Ikkinchi kassir | `cashier2` | `cashier123` |

Demo tenant: **Demo Kafe**. Mahsulotlar: Kola, Suv, Gazak.

Seed qayta ishga tushirilsa, mavjud demo ma'lumot topilsa o'tkazib yuboriladi.

## Role matrix

| Resurs | super_admin | admin | cashier |
|--------|-------------|-------|---------|
| User/tenant boshqaruvi | Ha | Cheklangan | Yo'q |
| Product yaratish/tahrirlash | Ha | Ha | Yo'q |
| Product ko'rish/qidirish | Ha | Ha | Ha (costPrice yo'q) |
| Order yaratish | Yo'q | Yo'q | Ha |
| Order receipt | Ha (+ profit) | Ha (+ profit) | Ha (profitsiz) |
| Sales report | Ha | Ha (tenant scope) | Yo'q |
| Payment webhook | Public (HMAC) | — | — |

## POS checkout workflow (API)

7 bosqichli oqim — Swagger yoki curl orqali:

### Stage 1 — Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

Cashier uchun login qaytgan `accessToken` ni keyingi so'rovlarda ishlating.

### Stage 2 — Catalog search

```bash
curl "http://localhost:3000/api/products?search=kola" \
  -H "Authorization: Bearer <TOKEN>"
```

### Stage 3–4 — Cart + Place order

Client faqat `productId` va `quantity` yuboradi (narx serverda snapshot qilinadi):

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer <CASHIER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":2}]}'
```

### Stage 5 — Payment webhook

Imzo generatsiya (local script, gitga yuklanmaydi):

```bash
node scripts/local/generate-webhook-signature.js --eventId=evt_001 --orderId=1
```

Natijadagi `x-signature` va body bilan:

```bash
curl -X POST http://localhost:3000/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "x-signature: <SIGNATURE>" \
  -d '{"eventId":"evt_001","orderId":1,"status":"paid"}'
```

Order faqat webhook orqali `paid` bo'ladi. `PATCH status=paid` rad etiladi.

### Stage 6 — Receipt

```bash
curl http://localhost:3000/api/orders/1/receipt \
  -H "Authorization: Bearer <TOKEN>"
```

Cashier `costPrice` / `totalProfit` ko'rmaydi. Admin ko'radi.

### Stage 7 — Sales report

```bash
curl "http://localhost:3000/api/reports/sales?from=2026-06-01&to=2026-06-21" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Javob: `orderCount`, `totalRevenue`, `totalCost`, `totalProfit`, `averageOrderValue`.

## Xavfsizlik

- `.env` faylini gitga commit qilmang
- Production muhitida default parol va JWT secretlardan foydalanmang
- Webhook secret va JWT secretlarni almashtiring

## Testlar

Avtomatik testlar hozircha yo'q. Tekshiruv manual (Swagger + curl) orqali amalga oshiriladi.
