# OTP Service Setup Guide

## Overview

The OTP system uses **Supabase Phone Auth** (which uses **Twilio Verify** under the hood) for production SMS delivery and falls back to a local in-memory mock in development.

**Key point**: Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`) are configured **in the Supabase dashboard**, not in our `.env` file. Our app just calls Supabase's `signInWithOtp()` / `verifyOtp()` APIs.

| Environment | Behavior |
|---|---|
| `NODE_ENV=development` | OTP generated locally, returned in API response, no SMS sent |
| `NODE_ENV=production` (or any non-development) | OTP sent via Supabase Phone Auth (Twilio SMS), NOT returned in API response |

---

## Twilio Verify vs Twilio SMS — Which to Use?

**Use Twilio Verify** (what Supabase uses internally). Here's why:

| Feature | Twilio SMS | Twilio Verify |
|---|---|---|
| OTP Generation | You manage it | Twilio generates it |
| OTP Storage | You store & expire it | Twilio manages lifecycle |
| Delivery | Raw SMS send | SMS, WhatsApp, Email, Voice |
| Rate Limiting | You implement it | Built-in |
| Fraud Detection | None | Built-in (Fraud Guard) |
| Retry Logic | You implement it | Automatic failover |
| Compliance | Manual | Managed by Twilio |
| Pricing | Per-SMS (~$0.0079/SMS US) | Per-verification (~$0.05/verification) |

**Bottom line**: We use Twilio Verify through Supabase's built-in Phone Auth provider. No direct Twilio SDK needed in the app — Supabase handles all the Twilio API calls.

---

## Setup Instructions

### 1. Create a Twilio Account

1. Go to [twilio.com](https://www.twilio.com/) and sign up
2. Complete phone verification
3. From the [Twilio Console](https://console.twilio.com/), note:
   - **Account SID** (starts with `AC...`)
   - **Auth Token**

### 2. Create a Twilio Verify Service

1. In the Twilio Console, navigate to **Verify → Services**
   - Direct link: https://console.twilio.com/us1/develop/verify/services
2. Click **Create new**
3. Configure:
   - **Friendly name**: `Tijarah Connect` (or your app name)
   - **Code length**: `6` (default)
4. After creation, note the **Verify Service SID** (starts with `VA...`)

### 3. Configure Twilio in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Providers → Phone**
3. Enable the **Phone** provider
4. Enter your Twilio credentials:
   - **Twilio Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Twilio Auth Token**: `your_auth_token`
   - **Twilio Verify Service SID**: `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **SMS Sender**: Your Twilio phone number (optional, Verify doesn't require it)
5. Click **Save**

That's it. No Twilio env vars are needed in the app — Supabase handles the integration.

### 4. Set App Environment Variables

The only OTP-related env var in your app:

```env
# Phone number country code prefix (default: +91 for India)
SMS_COUNTRY_CODE=+91
```

Ensure Supabase credentials are set (these are already required for the app to work):

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 5. Test in Development

```bash
# Start the server
NODE_ENV=development npm run start:dev

# Send OTP (returns OTP in response for testing)
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543210"}'

# Response includes OTP for dev testing:
# { "data": { "mobileNumber": "9876543210", "expiresIn": "5 minutes", "otp": "482913" } }
```

### 6. Test in Production

```bash
NODE_ENV=production npm run start

# Send OTP (sends real SMS, no OTP in response)
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543210"}'

# Response does NOT include OTP:
# { "data": { "mobileNumber": "9876543210", "expiresIn": "10 minutes" } }

# User receives SMS → enters OTP → verify:
curl -X POST http://localhost:3001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543210", "otp": "123456"}'
```

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Frontend    │────▶│  Auth APIs   │────▶│   OtpService     │
│  (Next.js)  │     │  (NestJS)    │     │                  │
└─────────────┘     └─────────────┘     │  isDevelopment?  │
                                         │  ┌──────┐ ┌─────┐│
                                         │  │ Mock │ │Supa-││
                                         │  │(mem) │ │base ││
                                         │  └──────┘ └──┬──┘│
                                         └──────────────│───┘
                                                        ▼
                                               ┌────────────┐
                                               │Twilio Verify│
                                               │(configured  │
                                               │in dashboard)│
                                               └────────────┘
```

### Files

| File | Purpose |
|---|---|
| `src/otp/otp.service.ts` | Centralized OTP service — dev mock or Supabase Phone Auth |
| `src/otp/otp.module.ts` | Global NestJS module exporting OtpService |
| `src/supabase/supabase-auth.service.ts` | Supabase client — `sendPhoneOtp()` / `verifyPhoneOtp()` methods |
| `src/auth/auth.service.ts` | Login & registration — uses OtpService |
| `src/admin-auth/admin-auth.service.ts` | Admin login — uses OtpService |
| `src/providers/providers.service.ts` | Provider onboarding OTP — uses OtpService |

### API Response Differences

**Development** (`NODE_ENV=development`):
```json
{
  "message": "OTP sent successfully",
  "data": {
    "mobileNumber": "9876543210",
    "expiresIn": "5 minutes",
    "otp": "482913"
  }
}
```

**Production** (`NODE_ENV=production`):
```json
{
  "message": "OTP sent successfully",
  "data": {
    "mobileNumber": "9876543210",
    "expiresIn": "10 minutes"
  }
}
```

The frontend handles both cases automatically — it only shows the OTP in toast notifications when the `otp` field is present in the response.

---

## Costs

| Item | Cost |
|---|---|
| Twilio Verify SMS (India) | ~$0.04–0.09 per verification |
| Twilio Verify WhatsApp | ~$0.01–0.05 per verification |
| Free trial | $15.50 credit on new Twilio accounts |

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `Supabase Phone Auth configuration is incomplete` | Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env` |
| `Supabase phone OTP send failed` | Check Twilio credentials in Supabase dashboard (Auth → Providers → Phone) |
| SMS not received | Verify phone number format; check Twilio console for delivery logs |
| `Too many OTP requests` (429) | Rate limit hit — wait or check Twilio Verify Fraud Guard settings |
| OTP works in dev but not prod | Ensure Twilio credentials are correctly entered in Supabase dashboard |
| `Supabase client not configured` | Missing `SUPABASE_URL` or `SUPABASE_ANON_KEY` env vars |
