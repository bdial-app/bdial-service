# Tijarah Connect — UAT Seed Data

Complete seed data for User Acceptance Testing of the Tijarah Connect platform.

## Quick Start

```bash
cd bdial-service/uat-data
psql -U <user> -d <database> -f run-all.sql
```

Or from an active `psql` session:

```sql
\i run-all.sql
```

> **Warning:** `00-reset.sql` deletes all existing data from ~25 tables before seeding. Do **not** run against production.

## Files

| # | File | Description | Row Count |
|---|------|-------------|-----------|
| 00 | `00-reset.sql` | DELETE FROM all tables in FK-safe order + schema guards | — |
| 01 | `01-users.sql` | Users (admins, provider owners, customers) | 55 |
| 02 | `02-categories.sql` | Service categories | 10 |
| 03 | `03-providers.sql` | Providers + category mappings | 40 + ~60 |
| 04 | `04-products.sql` | Products and services | 107 |
| 05 | `05-photos.sql` | Gallery photos (Unsplash URLs) | 63 |
| 06 | `06-verifications.sql` | Provider identity verifications | 40 |
| 07 | `07-reviews.sql` | Reviews + review photos + review reports | 80 + 15 + 3 |
| 08 | `08-bookings.sql` | Bookings | 30 |
| 09 | `09-conversations.sql` | Conversations + participants + messages | 15 + 30 + 38 |
| 10 | `10-saved.sql` | Saved items + saved locations | 25 + 10 |
| 11 | `11-explore.sql` | Banners, sponsored listings, badges, offers | 6 + 8 + 15 + 10 |
| 12 | `12-reports-warnings.sql` | Reports, provider warnings, bug reports | 8 + 4 + 5 |
| 13 | `13-system.sql` | System settings + search synonyms | 15 + 20 |
| 14 | `14-analytics.sql` | Search logs, analytics events, leads, ad events, invites | 20 + 15 + 10 + 8 + 6 |
| 15 | `15-notifications.sql` | Device tokens, preferences, batches, notifications | 15 + 10 + 3 + 20 |

## Data Summary

| Entity | Count |
|--------|-------|
| Users | 55 (2 admins + 40 provider owners + 13 customers) |
| Providers | 40 (~33 active, 3 in_review, 2 pending, 1 suspended, 1 inactive) |
| Categories | 10 |
| Products / Services | 107 |
| Reviews | 80 |
| Bookings | 30 |
| Conversations | 15 |
| Notifications | 20 |

## Cities Covered

Mumbai, Pune, Surat, Bangalore, Delhi, Hyderabad, Ahmedabad, Indore

## Key Test Accounts

| Role | Name | Phone | Notes |
|------|------|-------|-------|
| Admin | Ahmed Bhaisaheb | +919876543210 | Google SSO enabled |
| Admin | Mulla Saifuddin | +919876543211 | — |
| Customer | Ahmed (test) | +919900000001 | Primary test customer |
| Customer | Aisha | +919900000002 | Active reviewer |
| Provider Owner | Fatima | +919800000101 | Fatima's Tailoring (Provider 01) |
| Provider Owner | Husain | +919800000102 | Husain's Kitchen (Provider 02) |

## UUID Patterns (for debugging)

| Entity | ID Pattern Example |
|--------|-------------------|
| Categories | `b1a2c3d4-e5f6-4a7b-8c9d-100000000001` |
| Providers | `c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b01` |
| Products | `e1a00001-aaaa-4f7a-8b9c-000000000001` |
| Reviews | `b1a00001-dddd-4f7a-8b9c-000000000001` |
| Bookings | `a1b00001-1111-4f7a-8b9c-000000000001` |
| Conversations | `d1c00001-2222-4f7a-8b9c-000000000001` |

## Notes

- Each SQL file is wrapped in `BEGIN; ... COMMIT;` for atomic execution.
- Photos use Unsplash placeholder URLs — replace with real uploads for visual testing.
- Provider features (`is_women_led`, `community_verified`, `is_featured`) are distributed realistically across providers.
- Review sentiments range from 1-star to 5-star with natural Bohri community language.
- The `run-all.sql` script executes files in dependency order via `\i` includes.
