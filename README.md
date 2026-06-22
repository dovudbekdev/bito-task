# BITO-TASK

NestJS asosidagi multi-tenant POS SaaS REST API.

Arxitektura va biznes qarorlari: [DECISIONS.md](DECISIONS.md)

## Docker bilan boshqarish

Loyiha ikkita konteynerda ishlaydi:

| Servis | Vazifasi | Port |
|--------|----------|------|
| `postgres` | PostgreSQL 16 ma'lumotlar bazasi | ichki tarmoq (`5432`) |
| `app` | NestJS API (production build) | `3000` (host) |

Ma'lumotlar `postgres_data` nomli Docker volume'da saqlanadi.

### Talablar

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

Tekshirish:

```bash
docker --version
docker compose version
```

### Birinchi marta sozlash

```bash
cp .env.example .env
```

`.env` faylida Docker uchun quyidagilarni to'ldiring:

```env
# DB host "postgres" — docker-compose servis nomi (localhost emas!)
DB_URL=postgresql://bito:bito_secret@postgres:5432/bito_task

JWT_ACCESS_SECRET=<kamida 20 belgi>
JWT_REFRESH_SECRET=<kamida 20 belgi>
SUPER_ADMIN_LOGIN=admin
SUPER_ADMIN_PASSWORD=<kuchli parol>
PAYMENT_WEBHOOK_SECRET=<kamida 20 belgi>
```

`bito` / `bito_secret` / `bito_task` qiymatlari `docker-compose.yml` dagi `postgres` servisi bilan mos kelishi kerak.

### Ishga tushirish

```bash
docker compose up -d --build
```

| Flag | Ma'nosi |
|------|---------|
| `up` | Konteynerlarni ko'tarish |
| `-d` | Fon rejimida (detached) |
| `--build` | Image'ni qayta qurish |

App ishga tushganda `docker-entrypoint.sh` avtomatik:

1. `migration:run:prod` — DB schema yaratadi/yangilaydi
2. `node dist/main` — API serverni ishga tushiradi

Birinchi marta super-admin `.env` dagi login/parol bilan yaratiladi.

### Tekshirish

| Resurs | URL |
|--------|-----|
| Swagger | http://localhost:3000/api/docs |
| API | http://localhost:3000/api/ |

```bash
docker compose ps              # konteynerlar holati
docker compose logs -f app     # app loglari (chiqish: Ctrl+C)
docker compose logs postgres   # DB loglari
```

### Kundalik buyruqlar

```bash
# To'xtatish (DB ma'lumotlari saqlanadi)
docker compose stop

# Qayta ishga tushirish
docker compose start

# Bitta servisni qayta ishga tushirish
docker compose restart app

# Kod o'zgarganda qayta build + ishga tushirish
docker compose up -d --build

# Faqat app servisini qayta build
docker compose up -d --build app
```

**Muhim:** Kod o'zgarganda (`src/` ichidagi `.ts` fayllar) konteyner avtomatik yangilanmaydi — `docker compose up -d --build` kerak. Docker image ichida `dist/` compiled kod saqlanadi.

`.env` o'zgarganda ham app konteynerini qayta ishga tushiring:

```bash
docker compose up -d --build app
```

### Konteyner ichida buyruqlar

```bash
# Demo ma'lumotlar (tenant, kassir, mahsulotlar)
docker compose exec app npm run db:seed:prod

# Migration holati
docker compose exec app npm run migration:show

# Muhit o'zgaruvchisini tekshirish
docker compose exec app printenv PAYMENT_WEBHOOK_SECRET

# App konteyneriga shell
docker compose exec app sh
```

### To'xtatish va tozalash

```bash
# Konteynerlarni o'chirish (volume saqlanadi)
docker compose down

# Konteynerlar + DB volume (barcha ma'lumotlar yo'qoladi)
docker compose down -v
```

`down -v` dan keyin qayta ishga tushirsangiz, migration va super-admin qayta yaratiladi.

Volume nomini ko'rish:

```bash
docker compose config --volumes
docker volume ls | grep postgres
```

### Payment webhook (Docker ichida)

Webhook imzosi `.env` dagi `PAYMENT_WEBHOOK_SECRET` bilan hisoblanadi. Script ham shu fayldan o'qiydi:

```bash
node scripts/local/generate-webhook-signature.js --eventId=evt_001 --orderId=1
```

Chiqgan **curl** buyrug'ini to'liq nusxalab ishlating (imzoni qo'lda yozmang — 64 belgili hex bo'lishi kerak).

Swagger orqali test qilsangiz, request body **bitta qatorli** JSON bo'lishi kerak (script chiqarganidek):

```json
{"eventId":"evt_001","orderId":1,"status":"paid"}
```

### Tez-tez uchraydigan muammolar

| Muammo | Sabab | Yechim |
|--------|-------|--------|
| `Invalid webhook signature` | Imzo noto'g'ri yoki body formati farq qiladi | Script chiqargan curl ni copy-paste qiling |
| Port 3000 band | Boshqa jarayon portni egallagan | `.env` da `APP_PORT` o'zgartiring, `docker-compose.yml` da `ports: '3001:3000'` |
| Kod o'zgarishlari ko'rinmaydi | Eski image ishlayapti | `docker compose up -d --build` |
| DB ulanish xatosi | `DB_URL` da `localhost` yozilgan | Hostni `postgres` qiling |
| Eski/corrupt DB | Volume eski holatda | `docker compose down -v` keyin qayta `up` |

### Docker arxitekturasi

```
Host (sizning kompyuteringiz)
├── postgres (postgres:16-alpine)
│   └── volume: postgres_data → /var/lib/postgresql/data
└── app (NestJS, port 3000:3000)
    ├── .env dan muhit o'zgaruvchilari
    └── postgres:5432 ga ulanadi
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
