# WhatsApp Marketing module

Admin-driven WhatsApp messaging to listed business owners (providers) through
Meta's WhatsApp Cloud API, called directly (no BSP). Phase 1 is manual: an admin
builds an audience, picks an approved template, sends or schedules, and handles
replies from an inbox. Event-driven automations are phase 2 and are not built
here, but the schema leaves room for them.

This file is the contract between `bdial-service` (this module) and the
`admin-app` "WhatsApp" section. Both sides are built from it; change it first.

---

## 1. Decisions and constraints

- **Direct Meta Cloud API** (`https://graph.facebook.com/{version}`), token and
  ids from env only. The dashboard never edits credentials.
- **Audience = providers** (business owners). Customers are out of scope.
- **Start on Meta's test number.** The test number can only reach up to 5
  recipient numbers that were verified in the Meta dashboard, and starts with
  only the `hello_world` template approved. Settings must surface this.
- **Every business-initiated message is an approved template.** Free text is
  allowed only while a 24-hour customer-service window is open (the contact
  messaged us within the last 24h). Those replies are free.
- **Template category drives cost** (INR, per delivered message, before 18% GST):
  marketing ₹0.8631, utility ₹0.115, authentication ₹0.115, service ₹0. Stored
  in `whatsapp_settings.rates` so they can be edited when Meta changes them.
- **Meta's per-user marketing cap**: a recipient can get only ~2 marketing
  templates per 24h across *all* businesses; over the cap Meta returns error
  `131049` and the message is not delivered or billed. Never queue two marketing
  sends to the same phone inside 24h.
- **Opt-out**: inbound `STOP`/`UNSUBSCRIBE` (configurable keywords, case
  insensitive) → contact `consent = opted_out`; `START` → `opted_in`. Opted-out
  contacts are always excluded from marketing-category sends. Utility sends
  about the owner's own listing are still allowed unless `block_all` is set.
- **Messaging tier**: Meta caps unique recipients per rolling 24h (250 unverified
  → 1k → 10k → 100k). We also keep our own `daily_cap` in settings and show
  remaining headroom.
- **No Redis/queue exists.** `whatsapp_messages` is the queue; a worker claims
  rows with `FOR UPDATE SKIP LOCKED`.
- **Phone normalisation** to E.164 digits without `+` for the API
  (`919876543210`), stored with `+` (`+919876543210`). Provider phones are
  mixed (`+91…`, `91…`, bare 10-digit); normalise every time. Recipient phone
  priority: `providers.whatsapp_number` → `providers.contact_number` →
  `users.mobile_number`.

### Env (add to `.env.example`)

```
# WhatsApp Cloud API (Meta). Leave empty to disable the module (endpoints answer configured=false).
WHATSAPP_ACCESS_TOKEN=            # permanent System User token (test: temporary token from app dashboard)
WHATSAPP_PHONE_NUMBER_ID=         # the sender phone number id
WHATSAPP_BUSINESS_ACCOUNT_ID=     # WABA id (templates live here)
WHATSAPP_APP_SECRET=              # Meta app secret, verifies X-Hub-Signature-256 on webhooks
WHATSAPP_VERIFY_TOKEN=            # any random string, pasted into the Meta webhook config
WHATSAPP_API_VERSION=v21.0
```

Webhook URL to paste into Meta: `{APP_URL}/api/whatsapp/webhook`, subscribe to
`messages`, `message_template_status_update`, `phone_number_quality_update`.

---

## 2. Database (one migration: `1780600000000-WhatsAppMarketing.ts`)

Follow the existing style: raw idempotent SQL, `CREATE TABLE IF NOT EXISTS`,
enums via `DO $$ … EXCEPTION WHEN duplicate_object`. Register every entity in
`src/entities/index.ts` and `ALL_ENTITIES` in `src/config/data-source.ts`.
Migrations auto-run on app start against the shared Supabase DB, so everything
must be additive and safe.

### `whatsapp_settings` (single row, id = 1)
| column | type | notes |
|---|---|---|
| id | smallint PK | always 1 |
| daily_cap | int default 1000 | our own unique-recipients/24h ceiling |
| rate_per_minute | int default 60 | default campaign throttle |
| send_window_start | smallint default 9 | hour, IST (Asia/Kolkata) |
| send_window_end | smallint default 21 | hour; messages outside wait |
| opt_out_keywords | text[] default `{STOP,UNSUBSCRIBE,CANCEL}` | |
| opt_in_keywords | text[] default `{START,SUBSCRIBE}` | |
| rates | jsonb default `{"marketing":0.8631,"utility":0.115,"authentication":0.115,"service":0}` | INR |
| require_opt_in_for_marketing | bool default false | when true marketing sends need `consent='opted_in'` |
| phone_meta | jsonb null | cached `GET /{phone_number_id}` (display_phone_number, verified_name, quality_rating, messaging_limit_tier, name_status, fetched_at) |
| webhook_last_event_at | timestamptz null | |
| updated_at | timestamptz | |

### `whatsapp_contacts`
One row per phone we have talked to or targeted.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| phone | varchar(20) unique | `+919876543210` |
| provider_id | uuid null, index | FK providers ON DELETE SET NULL |
| user_id | uuid null | FK users ON DELETE SET NULL |
| display_name | varchar(200) null | from inbound profile.name |
| consent | enum `whatsapp_consent_enum` (`unknown`,`opted_in`,`opted_out`) default unknown | |
| consent_changed_at | timestamptz null | |
| consent_source | varchar(40) null | `keyword`, `admin`, `onboarding` |
| reachable | bool default true | false after Meta 131026 (not a WhatsApp user) |
| last_inbound_at | timestamptz null | 24h window = this + 24h |
| last_outbound_at | timestamptz null | |
| last_marketing_at | timestamptz null | for the per-user cap |
| last_cap_hit_at | timestamptz null | last 131049 |
| unread_count | int default 0 | |
| tags | text[] default `{}` | free-form admin tags |
| notes | text null | |
| created_at / updated_at | timestamptz | |

### `whatsapp_templates`
Local mirror of Meta templates plus our variable metadata.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | varchar(512) | Meta template name: lowercase, digits, underscores |
| language | varchar(10) default `en` | Meta language code |
| category | enum `whatsapp_template_category_enum` (`marketing`,`utility`,`authentication`) | |
| status | enum `whatsapp_template_status_enum` (`draft`,`pending`,`approved`,`rejected`,`paused`,`disabled`) default draft | draft = not yet submitted |
| meta_template_id | varchar(64) null | |
| components | jsonb | Meta format: `[{type:'HEADER',format:'TEXT'|'IMAGE',text?,example?},{type:'BODY',text,example?},{type:'FOOTER',text},{type:'BUTTONS',buttons:[{type:'URL',text,url,example?}|{type:'QUICK_REPLY',text}|{type:'PHONE_NUMBER',text,phone_number}]}]` |
| variables | jsonb default `[]` | `[{ index: 1, location: 'body'|'header'|'button', label: 'Business name', source: VariableSource, sample: 'Pronttera' }]` |
| description | text null | admin-facing "when to use" |
| rejected_reason | text null | from Meta |
| quality_score | varchar(20) null | from Meta (GREEN/YELLOW/RED/UNKNOWN) |
| is_seed | bool default false | shipped starter |
| last_synced_at | timestamptz null | |
| created_by | uuid null | |
| created_at / updated_at | timestamptz | |
| unique (name, language) | | |

`VariableSource` (string union, resolved per recipient by the backend):
`brand_name | owner_name | city | category | profile_url | products_count |
visits_7d | enquiries_7d | app_download_url | custom`. `custom` carries a
literal `value` in the campaign's `variable_mapping`.

### `whatsapp_segments`
Saved audience filters. `id uuid, name varchar(120), description text null,
filters jsonb (AudienceFilters), created_by uuid null, created_at, updated_at`.

### `whatsapp_campaigns`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | varchar(200) | |
| template_id | uuid FK whatsapp_templates ON DELETE RESTRICT | |
| audience | jsonb | AudienceFilters snapshot |
| variable_mapping | jsonb | `{ "1": { source: 'brand_name' }, "2": { source: 'custom', value: '20% off' } }` keyed by variable index |
| header_media_url | varchar(600) null | for IMAGE headers |
| button_url_params | jsonb null | `{ "0": { source: 'profile_url' } }` per URL button index |
| status | enum `whatsapp_campaign_status_enum` (`draft`,`scheduled`,`sending`,`paused`,`completed`,`cancelled`,`failed`) default draft | |
| scheduled_at | timestamptz null | |
| started_at / completed_at | timestamptz null | |
| rate_per_minute | int null | null → settings default |
| total_recipients | int default 0 | rows inserted (incl. skipped) |
| queued_count, sent_count, delivered_count, read_count, failed_count, skipped_count, replied_count | int default 0 | maintained atomically |
| estimated_cost_inr | numeric(10,2) default 0 | reachable × rate at send time |
| actual_cost_inr | numeric(10,2) default 0 | sum of billable messages |
| failure_reason | text null | why status=failed (e.g. auth error, template paused) |
| created_by | uuid null | |
| created_at / updated_at | timestamptz | |

### `whatsapp_messages`
Both directions. Outbound campaign rows are the send queue.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| contact_id | uuid FK whatsapp_contacts, index | |
| campaign_id | uuid null FK whatsapp_campaigns ON DELETE CASCADE, index | null for inbox replies and one-offs |
| provider_id | uuid null, index | denormalised for provider-page history |
| direction | enum `whatsapp_direction_enum` (`outbound`,`inbound`) | |
| kind | enum `whatsapp_message_kind_enum` (`template`,`text`,`image`,`document`,`audio`,`video`,`sticker`,`location`,`reaction`,`unknown`) | |
| status | enum `whatsapp_message_status_enum` (`queued`,`sending`,`sent`,`delivered`,`read`,`failed`,`skipped`,`received`) | inbound rows are `received` |
| template_id | uuid null | |
| template_name | varchar(512) null | |
| rendered_body | text null | body text with variables filled, for display |
| payload | jsonb null | exact API request (outbound) or webhook message (inbound) |
| variables | jsonb null | resolved `{ "1": "Pronttera" }` |
| wa_message_id | varchar(128) null, unique where not null | `wamid.…` |
| error_code | int null | Meta code |
| error_message | text null | human text (see map below) |
| skip_reason | varchar(40) null | `opted_out`, `no_phone`, `invalid_phone`, `duplicate`, `unreachable`, `marketing_cap`, `daily_cap` |
| attempts | smallint default 0 | |
| send_after | timestamptz null | backoff / send-window deferral |
| locked_at | timestamptz null | claimed by worker |
| billable | bool null | from status webhook `pricing.billable` |
| pricing_category | varchar(20) null | from webhook |
| cost_inr | numeric(8,4) default 0 | |
| sent_at / delivered_at / read_at / failed_at | timestamptz null | |
| created_at | timestamptz | |

Indexes: `(status, send_after)` for the worker, `(campaign_id, status)`,
`(contact_id, created_at)`, `(provider_id, created_at)`.

---

## 3. Backend design (`src/whatsapp/`)

```
whatsapp.module.ts
whatsapp.constants.ts             error-code → message map, defaults
meta-cloud-api.service.ts         thin HTTP client (axios via @nestjs/axios or fetch)
whatsapp-phone.util.ts            toE164(raw): string|null, toApiDigits()
whatsapp-settings.service.ts      get/update single row; refreshPhoneMeta()
whatsapp-template.service.ts      CRUD, submit to Meta, sync from Meta, seed, render(template, variables)
whatsapp-audience.service.ts      resolve(filters) → recipients[], preview(filters), contact listing, segments
whatsapp-variable.service.ts      resolve VariableSource per provider (batch loads: visits_7d from provider_analytics_events profile_view, enquiries_7d from messages/enquiry via conversations, products_count)
whatsapp-campaign.service.ts      create/update/send/schedule/pause/resume/cancel/retry, stats, export
whatsapp-send-worker.service.ts   @Interval(10_000) claim & send; @Cron every minute: scheduled→sending, completion check, phone meta refresh hourly
whatsapp-inbox.service.ts         conversations, messages, reply (text within window / template), mark read
whatsapp-webhook.service.ts       verify signature, route statuses / inbound / template status / quality
whatsapp-overview.service.ts      KPIs, 30-day series, attention items
whatsapp-webhook.controller.ts    GET/POST /whatsapp/webhook  (@Public, @SkipThrottle)
admin-whatsapp.controller.ts      /admin/whatsapp/*  (@Roles('associate') class, 'admin' on mutations)
dto/*.dto.ts                      class-validator DTOs
seeds/starter-templates.ts        the templates in §6
```

### Meta client
- `sendTemplate(toDigits, name, language, components)` → `POST /{phoneId}/messages`
  `{ messaging_product:'whatsapp', to, type:'template', template:{ name, language:{code}, components } }`
- `sendText(toDigits, body)` → `type:'text', text:{ body, preview_url:true }`
- `markRead(waMessageId)` → `{ messaging_product:'whatsapp', status:'read', message_id }`
- `listTemplates()` → `GET /{wabaId}/message_templates?fields=name,language,category,status,components,id,quality_score,rejected_reason&limit=200` (follow paging)
- `createTemplate(body)` → `POST /{wabaId}/message_templates`
- `deleteTemplate(name)` → `DELETE /{wabaId}/message_templates?name=`
- `getPhoneMeta()` → `GET /{phoneId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status,code_verification_status`
- Every error surfaces `{ code, subcode?, message, fbtraceId }` from Meta's `error` object. Throw a `WhatsAppApiError` with those fields.
- When env is not configured, `isConfigured()` is false and mutating endpoints throw `503 { message: 'WhatsApp is not configured. Set WHATSAPP_* env vars.' }`.

### Error-code map (message + whether retryable)
`130429` rate limit → retry · `131056` pair rate limit → retry · `131000`/`131016`/`5xx` → retry ·
`131049` marketing frequency cap → failed, `skip_reason` stays null, set `contact.last_cap_hit_at` ·
`131026` not a WhatsApp user / undeliverable → failed, `contact.reachable=false` ·
`131047` outside 24h window (free text) → failed ·
`132000` template param count mismatch, `132001` template missing, `132012` param format → failed and **pause the campaign** with `failure_reason` ·
`131031` account locked, `131042` payment issue, `190` bad token → failed and **pause the campaign** ·
`131051` unsupported message type → failed. Default → failed, not retried. Max 3 attempts, backoff 30s·2^attempt.

### Send worker
Every 10s (skip if previous tick still running):
1. If a campaign is `sending` and the current IST hour is outside the send window, set `send_after` = next window start on its queued rows and continue.
2. Claim: `UPDATE whatsapp_messages SET status='sending', locked_at=now(), attempts=attempts+1 WHERE id IN (SELECT m.id FROM whatsapp_messages m JOIN whatsapp_campaigns c ON c.id=m.campaign_id WHERE m.status='queued' AND c.status='sending' AND (m.send_after IS NULL OR m.send_after<=now()) ORDER BY m.created_at LIMIT :n FOR UPDATE SKIP LOCKED) RETURNING *` where `n` = sum over sending campaigns of `rate_per_minute/6`, capped at 50 per tick.
3. Daily cap: count distinct `contact_id` with `sent_at > now()-24h`; if adding this batch exceeds `daily_cap`, requeue the overflow with `send_after = +1h` and `skip_reason` untouched (shown in UI as "waiting for cap").
4. Send each with concurrency 5. On success: `status='sent'`, `wa_message_id`, `sent_at`, `contact.last_outbound_at`, and `last_marketing_at` if the template is marketing; bump `campaign.sent_count`, decrement `queued_count`. On failure: per map above.
5. Also release stale locks: `status='sending' AND locked_at < now()-5min` → back to queued (crash recovery).
6. Completion: campaigns `sending` with zero `queued|sending` rows → `completed`, `completed_at`.

Every minute: `scheduled` campaigns with `scheduled_at<=now()` → `sending`, `started_at`. Hourly: `refreshPhoneMeta()`.

### Campaign send (`POST /campaigns/:id/send`)
1. Template must be `approved`. Resolve audience → recipients `{ providerId, userId, phone, provider }`.
2. For each recipient decide skip: no phone → `no_phone`; invalid → `invalid_phone`; duplicate phone in this campaign → `duplicate`; `reachable=false` → `unreachable`; marketing template and (`consent='opted_out'` or (`require_opt_in_for_marketing` and consent≠opted_in)) → `opted_out`; marketing and `last_marketing_at > now()-24h` → `marketing_cap`.
3. Upsert contacts, resolve variables (batch), render body, insert all rows in chunks of 500 (`queued` or `skipped`). Set counters, `estimated_cost_inr = queued × rate[category]`.
4. `scheduled_at` in future → `status='scheduled'`; else `sending` + `started_at`.
Also `POST /campaigns/:id/test-send { phone }` sends the template with the mapping resolved against the first matching provider (or sample values) to one number, outside the campaign (campaign_id null).

### Webhook (`/api/whatsapp/webhook`)
- `GET`: if `hub.mode=subscribe` and `hub.verify_token` matches env → return `hub.challenge` as plain text 200; else 403.
- `POST`: compute HMAC-SHA256 of `req.rawBody` with `WHATSAPP_APP_SECRET`, compare timing-safe with `X-Hub-Signature-256` (`sha256=` prefix); 401 on mismatch. Always answer 200 quickly; process synchronously but catch everything. Update `settings.webhook_last_event_at`.
- `entry[].changes[].value`:
  - `statuses[]`: find message by `wa_message_id`. Rank `sent<delivered<read`; never downgrade. Set timestamps, `billable`/`pricing_category` from `pricing`, `cost_inr = rates[category]` when billable. `failed` → `errors[0].code/title`. Bump campaign counters atomically (`delivered_count` on first delivered, `read_count` on first read, `failed_count`, `actual_cost_inr`).
  - `messages[]` (inbound): upsert contact by phone (`from`), link to provider by matching normalised phones across `providers.whatsapp_number`, `providers.contact_number`, `users.mobile_number`; `display_name` from `contacts[0].profile.name`. Insert `inbound/received` row with `kind` from `type`, `rendered_body` = text body or caption or `[image]` etc. Set `last_inbound_at`, `unread_count+1`. If the contact has a campaign message in the last 7 days, bump that campaign's `replied_count` once per contact. Keyword handling: opt-out → `consent=opted_out`, auto-reply text (free, inside window) `"You won't receive further marketing messages from Tijarah Connect. Reply START to resume."`; opt-in → `consent=opted_in`, reply `"You're subscribed to Tijarah Connect updates."` Deduplicate by `wa_message_id` (unique index).
  - `message_template_status_update`: set template `status` (APPROVED→approved, REJECTED→rejected + `rejected_reason`, PAUSED→paused, DISABLED→disabled, PENDING→pending) by `message_template_id` or (`message_template_name`, `message_template_language`).
  - `phone_number_quality_update`: patch `settings.phone_meta.quality_rating`/`messaging_limit_tier`.

### Audience filters (`AudienceFilters`)
```ts
{
  cities?: string[];               // providers.city ILIKE any
  categoryIds?: string[];          // via provider_categories
  statuses?: ('unverified'|'active'|'suspended'|'disabled')[];  // default ['active','unverified']
  trustLevels?: ('unverified'|'basic'|'verified'|'trusted')[];
  verification?: 'none'|'pending'|'in_review'|'approved'|'rejected';  // verifications table; 'none' = no row
  womenLed?: boolean; isFeatured?: boolean;
  createdWithinDays?: number; createdBeforeDays?: number;
  inactiveDays?: number;           // users.last_seen_at IS NULL OR < now()-N days
  missingLogo?: boolean;           // providers.logo_url IS NULL (use the real column name)
  missingProducts?: boolean;       // no rows in products for provider
  notContactedDays?: number;       // no outbound whatsapp_messages in N days (incl. never)
  consent?: 'any'|'opted_in'|'not_opted_out';   // default 'not_opted_out'
  reachableOnly?: boolean;         // default true
  providerIds?: string[];          // manual picks (OR-ed with filters when `mode:'manual'`)
  phones?: string[];               // pasted numbers, created as contacts without provider
  mode?: 'filters'|'manual';       // default filters
}
```
Always exclude `deleted_at IS NOT NULL`. Preview returns counts + 10 sample rows + estimated cost for both utility and marketing rates so the UI can show the difference.

### Variable resolution
Batch per campaign: `visits_7d` = count of `provider_analytics_events` where `event_type='profile_view'` in last 7 days grouped by provider; `enquiries_7d` = count of `messages` with `message_type='enquiry'` in conversations the provider participates in, last 7 days (use existing chat tables; if too costly, 0); `products_count` from `products`; `profile_url` = `${APP_URL}/provider-details?id=${providerId}`; `app_download_url` = `PLAY_STORE_URL` env; `owner_name` = users.name; `category` = first category name. Render `{{n}}` placeholders in body/header text for `rendered_body`.

---

## 4. API contract

Base: `/api/admin/whatsapp` (JWT, class `@Roles('associate')`; every `POST/PUT/PATCH/DELETE` is `@Roles('admin')`). Paginated lists return `{ items, meta: { total, page, limit, totalPages } }`. Dates ISO strings. Errors use Nest's standard `{ statusCode, message }`.

### Settings
- `GET /settings` →
  ```json
  { "configured": true, "isTestNumber": false, "apiVersion": "v21.0",
    "phone": { "displayPhoneNumber": "+91 98…", "verifiedName": "Tijarah Connect", "qualityRating": "GREEN", "messagingLimitTier": "TIER_1K", "nameStatus": "APPROVED", "fetchedAt": "…" },
    "dailyCap": 1000, "sentLast24h": 120, "uniqueRecipientsLast24h": 118,
    "ratePerMinute": 60, "sendWindowStart": 9, "sendWindowEnd": 21,
    "optOutKeywords": ["STOP"], "optInKeywords": ["START"], "requireOptInForMarketing": false,
    "rates": { "marketing": 0.8631, "utility": 0.115, "authentication": 0.115, "service": 0 },
    "webhook": { "url": "https://…/api/whatsapp/webhook", "lastEventAt": "…", "verifyTokenSet": true, "appSecretSet": true } }
  ```
  `isTestNumber` = `phone.verifiedName` is empty/"Test Number" or `display_phone_number` starts with `+1 555`.
- `PUT /settings` body: any of `dailyCap, ratePerMinute, sendWindowStart, sendWindowEnd, optOutKeywords, optInKeywords, requireOptInForMarketing, rates` → same shape as GET.
- `POST /settings/refresh` → re-fetch phone meta → GET shape.
- `POST /settings/test-send` `{ phone, templateId?, text? }` → `{ waMessageId, messageId }`. Template default `hello_world` if none given and it exists.

### Overview
- `GET /overview?days=30` →
  ```json
  { "kpis": { "sent": 0, "delivered": 0, "read": 0, "failed": 0, "replied": 0, "deliveryRate": 0.97, "readRate": 0.61, "costInr": 123.4, "activeCampaigns": 1, "unreadConversations": 3, "contacts": 1200, "optedOut": 12 },
    "series": [ { "date": "2026-09-01", "sent": 10, "delivered": 9, "read": 5, "failed": 1, "replied": 2, "costInr": 1.15 } ],
    "attention": [ { "type": "template_rejected"|"campaign_failed"|"campaign_paused"|"high_failure_rate"|"unanswered_replies"|"quality_drop"|"not_configured"|"webhook_silent", "title": "…", "detail": "…", "href": "/whatsapp/templates" } ],
    "recentCampaigns": [ CampaignSummary ×5 ] }
  ```

### Templates
- `GET /templates?status=&category=&search=` → `{ items: Template[] }` (no paging; ≤200)
- `GET /templates/:id` → `Template`
- `POST /templates` body `{ name, language, category, components, variables, description? , submit?: boolean }` → creates local row; if `submit` true also `createTemplate` at Meta (status → `pending`, store `meta_template_id`); returns `Template`. Validate: name `^[a-z0-9_]{1,512}$`, body ≤1024 chars, variables sequential `{{1}}..{{n}}`, each variable has a `sample` (Meta requires examples).
- `PUT /templates/:id` same body; allowed when `draft|rejected`. If `submit` and a Meta copy exists, delete-then-create (Meta templates are immutable once approved).
- `POST /templates/:id/submit` → submits a draft → `pending`.
- `DELETE /templates/:id` → deletes at Meta (if exists) and locally; 409 if any campaign references it and is not `draft|cancelled|completed|failed`… (simplest: 409 if referenced at all, with message).
- `POST /templates/sync` → pull from Meta, upsert by (name, language), return `{ synced, created, updated }`.
- `POST /templates/seed` → insert §6 starters as `draft` (skip existing names) → `{ created }`.
- `POST /templates/preview` `{ templateId | components, variables: { "1": "Pronttera" } }` → `{ header?, body, footer?, buttons? }` rendered.

`Template` JSON: `{ id, name, language, category, status, metaTemplateId, components, variables, description, rejectedReason, qualityScore, isSeed, lastSyncedAt, createdAt, updatedAt, usageCount }`.

### Audience
- `POST /audience/preview` `{ filters: AudienceFilters, templateCategory?: 'marketing'|'utility' }` →
  `{ total, sendable, skipped: { noPhone, invalidPhone, optedOut, unreachable, marketingCap, duplicate }, estimatedCost: { utility, marketing }, sample: [ { providerId, brandName, city, phone, consent } ×10 ] }`
- `GET /audience/contacts?page&limit&search&consent&city&hasProvider&tag` → paginated `Contact[]`:
  `{ id, phone, displayName, consent, reachable, lastInboundAt, lastOutboundAt, unreadCount, tags, provider: { id, brandName, city, status, trustLevel } | null, messagesSent, lastCampaignName }`
- `PATCH /audience/contacts/:id` `{ consent?, tags?, notes? }` → `Contact`
- `GET /audience/segments` → `{ items: Segment[] }`; `POST /audience/segments { name, description?, filters }`; `PUT /audience/segments/:id`; `DELETE /audience/segments/:id`.
- `GET /audience/options` → `{ cities: string[], categories: [{id,name}] }` for filter dropdowns (cities = distinct providers.city).

### Campaigns
- `GET /campaigns?page&limit&status&search` → paginated `CampaignSummary`:
  `{ id, name, status, template: { id, name, category, language }, scheduledAt, startedAt, completedAt, totalRecipients, queuedCount, sentCount, deliveredCount, readCount, failedCount, skippedCount, repliedCount, estimatedCostInr, actualCostInr, createdAt, createdBy: { id, name } | null }`
- `POST /campaigns` `{ name, templateId, audience: AudienceFilters, variableMapping, headerMediaUrl?, buttonUrlParams?, ratePerMinute? }` → `Campaign` (status draft)
- `GET /campaigns/:id` → `Campaign` = summary + `{ audience, variableMapping, headerMediaUrl, buttonUrlParams, ratePerMinute, failureReason, skipBreakdown: { noPhone, invalidPhone, optedOut, unreachable, marketingCap, duplicate }, failureBreakdown: [ { code, message, count } ] }`
- `PUT /campaigns/:id` (draft only) → `Campaign`
- `POST /campaigns/:id/send` `{ scheduledAt?: string }` → `Campaign` (resolves audience, inserts rows; 409 if not draft; 422 if template not approved)
- `POST /campaigns/:id/pause` | `/resume` | `/cancel` (cancel marks queued rows `skipped` with reason `cancelled`) → `Campaign`
- `POST /campaigns/:id/retry-failed` → requeues failed rows whose code is retryable or `131049` (cap) with `send_after = now()`; → `{ requeued }`
- `POST /campaigns/:id/test-send` `{ phone }` → `{ waMessageId }`
- `POST /campaigns/:id/duplicate` → new draft `Campaign`
- `DELETE /campaigns/:id` (draft/cancelled only)
- `GET /campaigns/:id/messages?page&limit&status&search` → paginated `MessageRow`: `{ id, contactId, phone, provider: { id, brandName, city } | null, status, errorCode, errorMessage, skipReason, attempts, sentAt, deliveredAt, readAt, failedAt, costInr, renderedBody }`
- `GET /campaigns/:id/export` → `text/csv` attachment of the same rows.

### Inbox
- `GET /inbox/conversations?page&limit&filter=all|unread|open_window&search` → paginated:
  `{ contactId, phone, displayName, provider: { id, brandName, city } | null, consent, unreadCount, lastMessage: { direction, kind, body, at, status }, windowExpiresAt: string | null }`
- `GET /inbox/conversations/:contactId/messages?before&limit=50` → `{ items: Message[], contact: Contact, windowExpiresAt }` newest last; `Message` = `{ id, direction, kind, status, body: renderedBody, templateName, errorMessage, createdAt, sentAt, deliveredAt, readAt, campaign: { id, name } | null }`
- `POST /inbox/conversations/:contactId/reply` `{ text }` (422 if window closed) or `{ templateId, variables: { "1": "…" } }` → `Message`
- `POST /inbox/conversations/:contactId/read` → `{ ok: true }` (also calls Meta `markRead` on the latest inbound)
- `GET /inbox/unread-count` → `{ count }` (sidebar badge; poll 60s)

### Provider page hook
- `GET /providers/:providerId` → `{ contact: Contact | null, phoneCandidates: [{ source: 'whatsapp_number'|'contact_number'|'mobile_number', raw, normalized }], windowExpiresAt, messages: Message[] (last 20) }`
- `POST /providers/:providerId/send` `{ templateId, variables?: { "1": "…" } } | { text }` → `Message`

### Webhook
- `GET /api/whatsapp/webhook`, `POST /api/whatsapp/webhook` — `@Public()`, `@SkipThrottle()`, `@ApiExcludeEndpoint()`, controller path `whatsapp`.

---

## 5. Admin app spec (`admin-app`)

### Routing & nav
- `ROUTES.WHATSAPP = '/whatsapp'` with nested routes rendered inside a `WhatsAppLayout` (page header "WhatsApp" + horizontal tab nav: Overview · Campaigns · Templates · Audience · Inbox · Settings). Inbox tab shows an unread count pill.
  `/whatsapp` (Overview) · `/whatsapp/campaigns` · `/whatsapp/campaigns/new` · `/whatsapp/campaigns/:id` · `/whatsapp/templates` · `/whatsapp/templates/new` · `/whatsapp/templates/:id` · `/whatsapp/audience` · `/whatsapp/inbox` · `/whatsapp/inbox/:contactId` · `/whatsapp/settings`
- Sidebar: in the **Marketing** section add `{ name: 'WhatsApp', path: ROUTES.WHATSAPP, icon: MessageCircle }` with badge = unread count.
- `roles.ts`: `'whatsapp.view': 'associate'`, `'whatsapp.send': 'admin'`, `'whatsapp.templates': 'admin'`, `'whatsapp.settings': 'admin'`; `ROUTE_ROLES['/whatsapp'] = 'associate'`.
- Files: `src/types/whatsapp.ts` (re-export from `types/index.ts`), `src/services/whatsapp.service.ts`, `src/hooks/useWhatsApp.ts` (key factory `whatsappKeys`), `src/pages/whatsapp/*.tsx`, `src/components/whatsapp/*.tsx`. `URLS.WHATSAPP` block in `utils/urls.ts` (append only; the file has unrelated uncommitted edits).

### Shared components (`src/components/whatsapp/`)
- `WaPhonePreview` — a phone frame with WhatsApp's green header (business name, "Business account"), chat wallpaper, and a bubble rendering header (text or image), body with `{{n}}` replaced by sample/mapped values and `*bold*`/`_italic_` markdown, footer in muted small text, buttons as full-width rounded rows below the bubble. Light and dark theme aware via existing tokens. Used in template builder, campaign wizard, and campaign detail.
- `TemplateBodyEditor` — textarea with an "Insert variable" dropdown (sources from `VariableSource` with labels), auto-numbers `{{n}}`, shows char count /1024, and renders the variable table beneath (index, label, source, sample) editable.
- `AudienceBuilder` — filter panel (city multi-select, category multi-select, status chips, trust level chips, verification select, toggles: women-led, featured, missing logo, missing products; numeric: created within N days, inactive N days, not contacted N days; consent select) + "Manual" tab with `ProviderPicker` and a paste-phones textarea; right side a sticky **live count card** (debounced `POST /audience/preview`): total, sendable, skipped breakdown as small rows, estimated cost for utility vs marketing with the chosen category highlighted, 10 sample names. "Save as segment" button; "Load segment" dropdown.
- `CampaignStatusBadge`, `TemplateStatusBadge` (draft grey, pending amber, approved green, rejected red w/ tooltip reason, paused/disabled grey), `ConsentBadge`.
- `WindowTimer` — "Free replies for 23h 12m" countdown or "Window closed — send a template".
- `CostHint` — small text "≈ ₹X (utility) · ₹Y if marketing".
- `MessageStatusIcon` — WhatsApp-style ticks: one grey (sent), two grey (delivered), two blue (read), red ! (failed), clock (queued).

### Pages
- **Overview** (`WhatsAppOverview.tsx`): if `!configured` show a full-width setup card with the exact steps (create WABA in Meta app → add test number → copy ids into `.env` → set webhook URL/verify token → add your phone as a test recipient) and env var names; otherwise: `KPICard` row (Sent, Delivered %, Read %, Replies, Failed, Spend ₹), a recharts area chart of the series (sent/delivered/read) + bars for cost, an "Attention" list with links, a "Phone health" card (quality rating colour, tier, remaining today = dailyCap − uniqueRecipientsLast24h, test-number warning), recent campaigns table.
- **Campaigns list**: status tabs (All, Draft, Scheduled, Sending, Paused, Completed, Failed), `DataTable` with name, template (+category pill), progress bar (sent/total with delivered/read/failed segments), replies, cost (actual · est), created, status badge; row click → detail. Header action "New campaign".
- **Campaign wizard** (`CampaignNew.tsx`, 4 steps with a stepper; state in one `useState` form; can save draft at any step):
  1. *Audience* — `AudienceBuilder`.
  2. *Message* — template picker (approved only, grouped by category, search, preview on hover/select), then variable mapping table (each `{{n}}`: label, source select, custom value input, resolved sample), header image URL field when the template has an IMAGE header, URL button param mapping; live `WaPhonePreview` using the first sample provider.
  3. *Schedule* — Send now / Schedule (datetime, IST) / rate per minute slider (10–200, default from settings) with "≈ finishes in X min"; shows send window note.
  4. *Review* — summary cards (audience count, template, cost estimate with GST line, cap warnings: "N recipients received a marketing message in the last 24h and will be skipped", "exceeds daily cap, will roll over"), "Send test to my number" input+button, then primary **Send to N businesses** (opens `ConfirmDialog` variant warning) or **Schedule**.
- **Campaign detail**: header with name, status badge, actions (Pause/Resume/Cancel/Retry failed/Duplicate/Export CSV, permission-gated), stats tiles (queued, sent, delivered, read, failed, skipped, replied, cost actual vs est), stacked progress bar, live refetch every 5s while `sending`; skip + failure breakdown chips with human text; `WaPhonePreview` of the message; `DataTable` of recipients with status filter tabs and search (phone/brand), each row shows `MessageStatusIcon`, error text, timestamps, link to provider.
- **Templates list**: filter chips by status/category, search; cards or table showing name, language, category pill with per-message rate, status badge, quality dot, used-in N campaigns, updated; actions: New template, Sync from Meta, "Add starter templates" (seed) shown when list is empty or via menu. Row → editor.
- **Template editor** (`TemplateEditor.tsx`): left form — name (auto-slugify from a friendly title, show rule), language select (en, en_US, hi, mr, gu, ur), category radio cards with rate + one-line guidance ("Utility: updates about the owner's own listing — ₹0.115" / "Marketing: promotions & announcements — ₹0.86"), header (none / text ≤60 / image), `TemplateBodyEditor`, footer (≤60), buttons (up to 3: URL w/ optional `{{1}}` suffix, Quick reply, Call), description; right — sticky `WaPhonePreview`. Footer actions: Save draft · Submit to Meta (confirm; explains review takes minutes–24h) · Delete. Read-only once `pending|approved` with a "Duplicate to edit" action; rejected shows reason banner and allows edit+resubmit.
- **Audience**: `DataTable` of contacts (phone, business → link, city, consent badge, reachable, last contacted, last replied, unread, tags), filters (search, consent, city, has provider), row side `DetailPanel` to edit consent/tags/notes and show last 5 messages; secondary tab **Segments** (saved filters list with count-on-demand, create/edit via `AudienceBuilder` in a modal, "Start campaign from segment").
- **Inbox**: two-pane. Left: conversation list with filter (All / Unread / Window open), search, each row avatar initials, name or phone, business name, snippet, time, unread dot. Right: thread with day separators, bubbles (inbound left/white, outbound right/green), template messages labelled with the template name, status ticks, error text; top bar shows contact name, phone, provider link, `ConsentBadge`, `WindowTimer`; composer: textarea + send when window open, otherwise a "Send template" button opening a template picker with variable inputs. Mark read on open. Poll conversations every 15s, thread every 5s when open. Quick actions in a right-side info drawer: open provider, consent toggle, tags, notes.
- **Settings**: read-only credentials card (configured ✓/✗ per env var, API version, webhook URL with copy button, last webhook event, verify token/app secret set?), phone card (display number, verified name, quality, tier, name status, Refresh button, test-number banner), editable form (daily cap, rate/min, send window hours, opt-out/opt-in keywords as chips, require opt-in toggle, rates table) with Save, and "Send a test message" (phone + template select, defaults to hello_world).
- **Provider page**: in `ProviderView.tsx` add a "WhatsApp" card: contact state, phone candidates, last 5 messages, buttons "Send template" (modal: template select + variable inputs with provider values prefilled) and "Open in inbox". Permission-gated.

### UX rules
- Every destructive or costly action goes through `ConfirmDialog` and states the count and ₹ estimate.
- Toasts on success/failure (`react-toastify`), consistent with the app.
- Empty states use `EmptyState` with a clear next step.
- Loading states: skeleton rows, never layout jumps.
- Keep everything responsive down to ~1024px; inbox collapses to one pane below that.

---

## 6. Starter templates (seeded as drafts, language `en`)

| name | category | body | buttons |
|---|---|---|---|
| `tijarah_new_enquiry` | utility | `Hi {{1}}, you have a new enquiry on Tijarah Connect from a customer in {{2}}. Reply quickly to win the business.` | URL "Open enquiries" → `{{profile_url}}` |
| `tijarah_weekly_visits` | utility | `Hi {{1}}, your Tijarah Connect profile was viewed {{2}} times this week. Keep it updated to turn visits into customers.` | URL "View profile" |
| `tijarah_verification_approved` | utility | `Congratulations {{1}}! Your business is now verified on Tijarah Connect. Verified businesses appear higher in search and earn more trust.` | URL "See your badge" |
| `tijarah_verification_docs_needed` | utility | `Hi {{1}}, we couldn't complete your Tijarah Connect verification yet. Please upload a valid ID document so customers can see your verified badge.` | URL "Upload documents" |
| `tijarah_profile_incomplete` | utility | `Hi {{1}}, your Tijarah Connect listing is missing a logo and products. Complete it in 2 minutes so customers in {{2}} can find you.` | URL "Complete profile" |
| `tijarah_new_review` | utility | `Hi {{1}}, a customer just left a review for your business on Tijarah Connect. Read and respond to build trust.` | URL "Read review" |
| `tijarah_add_products` | marketing | `Hi {{1}}, businesses with products listed get 3× more enquiries on Tijarah Connect. Add yours today and get discovered in {{2}}.` | URL "Add products" |
| `tijarah_share_profile` | marketing | `Hi {{1}}, share your Tijarah Connect profile with your customers and on social media to get more reviews and reach. Here is your link.` | URL "Share now" |
| `tijarah_announcement` | marketing | `Hi {{1}}, {{2}}` | URL "Open Tijarah" |
| `tijarah_consent_request` | marketing | `Hi {{1}}, this is Tijarah Connect. We'd like to send you occasional tips and updates to help grow your business on WhatsApp. Reply START to subscribe or STOP to opt out.` | Quick replies "START", "STOP" |
| `tijarah_winback` | marketing | `Hi {{1}}, we miss you on Tijarah Connect! Customers in {{2}} are searching for businesses like yours. Log in to check your new enquiries.` | URL "Open app" |

Footer on all: `Tijarah Connect`. Variables: `{{1}}` → `brand_name`, `{{2}}` → `city` / `visits_7d` / `custom` as appropriate; every variable has a sample value.

---

## 7. Verification gates

- **bdial-service**: `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint src/whatsapp src/entities src/config` clean (no new errors); do **not** run `nest build` or start the server (a watcher may be running and the DB is shared); jest is pre-broken at DI, don't gate on it. Confirm the migration SQL is idempotent by reading it twice.
- **admin-app**: `./node_modules/.bin/tsc --noEmit -p .` clean, `./node_modules/.bin/eslint src` no new errors, `./node_modules/.bin/vite build` succeeds.
