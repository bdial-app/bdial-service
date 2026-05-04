# Tijarah Connect — Backend (`bdial-service`)

NestJS REST API powering the Tijarah Connect platform.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in credentials
npm run start:dev      # http://localhost:3001/api
```

Swagger docs: `http://localhost:3001/api/docs` (non-production only)

---

## Architecture Overview

```
src/
├── main.ts                → Bootstrap (CORS, Helmet, Swagger, validation pipes)
├── app.module.ts          → Root module (imports all feature modules)
├── config/
│   └── data-source.ts     → TypeORM config + entity registry
├── common/                → Shared guards, filters, decorators, pipes
├── entities/              → 42 TypeORM entities (database schema)
├── migrations/            → TypeORM migration files (auto-run on boot)
└── [module]/              → Feature modules (controller + service + module)
```

### Module List (29 modules)

| Group | Modules |
|-------|---------|
| **Auth** | `auth`, `admin-auth`, `otp`, `supabase` |
| **Core** | `users`, `providers`, `categories`, `products`, `photos`, `storage` |
| **Discovery** | `home`, `search`, `explore`, `geocode`, `saved-items`, `saved-locations` |
| **Social** | `reviews`, `chat`, `invite` |
| **Admin** | `admin`, `verifications`, `reports`, `notifications`, `bug-reports` |
| **Monetization** | `payment`, `voucher`, `analytics` |
| **Infra** | `health`, `config` |
| **Shared** | `msg91` (SMS), `common` (filters, guards, sanitizer) |

### Entity Count: 42

Key entities: `User`, `Provider`, `Category`, `Product`, `Photo`, `Review`, `Verification`, `Conversation`, `Message`, `Notification`, `Payment`, `Subscription`, `SubscriptionPlan`, `Voucher`, `SponsoredListing`, `ProviderLead`, `ProviderAnalyticsEvent`, `AuditLog`, `SystemSetting`

Full list in `src/config/data-source.ts`.

---

## Key Patterns

### Authentication

- **Global JWT guard** — every endpoint requires auth unless decorated with `@Public()`
- **Customer auth**: Supabase OAuth (Google) or phone OTP via MSG91 → backend issues JWT
- **Admin auth**: Separate module (`admin-auth`) with its own OTP flow → separate JWT
- Tokens stored client-side in `localStorage`, sent as `Bearer` header

### Request Validation

```typescript
// DTOs use class-validator decorators
export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

Global `ValidationPipe` with `whitelist: true` strips unknown fields and rejects invalid ones.

### API Prefix

All routes are under `/api` prefix. Example: `GET /api/providers`

### Rate Limiting

Global ThrottlerGuard: 100 requests per 60 seconds per IP.

### Error Handling

`AllExceptionsFilter` catches all unhandled errors and returns sanitized responses (no stack traces in production).

### Caching

In-memory cache (`CacheModule`) with 5-minute default TTL. Used for frequently-read data like categories and home feed.

---

## Database & Migrations

- **ORM**: TypeORM 0.3.x
- **Database**: PostgreSQL via Supabase
- **Schema management**: Migrations only (`synchronize: false`)
- **Auto-run**: Pending migrations execute on app startup (`migrationsRun: true`)

### Migration Commands

```bash
# Generate migration from entity changes
npm run migration:generate -- src/migrations/AddNewColumn

# Create empty migration
npm run migration:create -- src/migrations/CustomMigration

# Run pending migrations manually
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Adding a New Entity

1. Create file in `src/entities/new-thing.entity.ts`
2. Add to the `ALL_ENTITIES` array in `src/config/data-source.ts`
3. Generate migration: `npm run migration:generate -- src/migrations/AddNewThing`
4. Verify the generated SQL, then restart dev server (migration runs automatically)

---

## Adding a New Feature Module

```bash
# NestJS CLI generates boilerplate
npx nest generate module feature-name
npx nest generate controller feature-name
npx nest generate service feature-name
```

Then:
1. Import your entity in the module: `TypeOrmModule.forFeature([YourEntity])`
2. Inject repository in service: `@InjectRepository(YourEntity)`
3. Add Swagger decorators to controller (`@ApiTags`, `@ApiOperation`)
4. If public endpoint, add `@Public()` decorator
5. Import module in `app.module.ts`

---

## Testing

```bash
npm run test           # Unit tests
npm run test:cov       # Coverage report
npm run test:e2e       # End-to-end tests
npm run test:watch     # Watch mode
```

E2E tests live in `test/`. Unit tests colocated with source files (`*.spec.ts`).

---

## Deployment

Deployed on **Railway** via Docker.

- `Dockerfile` — multi-stage build (install → build → production image)
- `railway.toml` — start command: `node dist/main.js`
- Migrations run automatically on startup (no separate migration step needed)

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for full details.

---

## Useful Links

- [ENV_REFERENCE.md](../ENV_REFERENCE.md) — all environment variables
- [API_REFERENCE.md](../API_REFERENCE.md) — endpoint quick reference
- [documentation/App-info.md](../documentation/App-info.md) — deep-dive on all entities and APIs
- [FLOW_REFERENCE.md](../FLOW_REFERENCE.md) — visual auth/registration/review flows
