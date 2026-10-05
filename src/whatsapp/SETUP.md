# WhatsApp Cloud API — setup checklist

What has to happen in Meta's dashboards before the WhatsApp section of the admin
app can send anything. Nothing here is code; each step produces a value that goes
into `.env`.

## A. Today: test number (free, 15 minutes)

1. Open <https://developers.facebook.com/apps> and select the existing Tijarah
   app (the one that already holds the Instagram Graph token). If that app is
   type "Consumer", create a new app of type **Business** instead; WhatsApp only
   attaches to Business apps.
2. In the app dashboard click **Add product → WhatsApp → Set up**. Meta creates a
   test WhatsApp Business Account (WABA) and a test sender number (`+1 555 …`).
3. On **WhatsApp → API Setup** copy:
   - **Temporary access token** → `WHATSAPP_ACCESS_TOKEN` (expires in 24h; fine
     for today, replaced in step B4)
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`
4. Still on API Setup, under **To**, click *Manage phone number list* and add the
   phone numbers that should receive test messages (yours, the team's). Each gets
   a one-time code on WhatsApp. **The test number can only message these
   numbers, up to 5.**
5. **App settings → Basic**: copy **App secret** → `WHATSAPP_APP_SECRET`.
6. Invent a random string → `WHATSAPP_VERIFY_TOKEN`.
7. Fill the values into `bdial-service/.env` and restart the API. In the admin
   app, open **Marketing → WhatsApp → Settings**; the credentials card should show
   everything configured and the phone card should show the test number.
8. Webhook: **WhatsApp → Configuration → Webhook → Edit**:
   - Callback URL: `https://uat.tijarahapp.in/api/whatsapp/webhook`
     (the API must be reachable from the internet; for a laptop use the dev
     tunnel URL the admin app already falls back to)
   - Verify token: the string from step 6 → **Verify and save**
   - **Manage** → subscribe to `messages`, `message_template_status_update`,
     `phone_number_quality_update`.
   - **Link the app to the WhatsApp Business Account** — without this Meta sends
     no events at all (no template approvals, delivery receipts or replies),
     even with the fields above ticked. Once per account:
     `curl -X POST -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" https://graph.facebook.com/v21.0/$WHATSAPP_BUSINESS_ACCOUNT_ID/subscribed_apps`
     → `{"success":true}`. A `GET` on the same URL should list the app.
9. In Settings click **Send a test message** with the pre-approved `hello_world`
   template to one of the numbers from step 4. Reply to it from your phone; it
   should appear in **Inbox** within a few seconds. That proves both directions.
10. **Templates → Add starter templates**, open one, **Submit to Meta**. Approval
    on a test WABA is usually within minutes. Once it shows *Approved*, create a
    campaign against a manual audience containing only your own provider.

## B. Before real sends: production number and verification

1. **Business verification** — <https://business.facebook.com/settings/security>:
   upload the company registration / GST certificate and a utility bill or bank
   statement showing the same legal name and address. Typically 1–5 business
   days. Without it the account is capped at 250 unique recipients per day and
   the display name is not shown.
2. **Phone number** — a number that is **not** registered on the WhatsApp or
   WhatsApp Business app. A new SIM or a virtual landline that can receive an SMS
   or voice OTP works. If you want to use a number already on WhatsApp, back up
   and delete that WhatsApp account first; the app stops working on that number
   permanently once it becomes an API number.
   **WhatsApp → API Setup → Add phone number**: enter the number, pick the
   **display name** (shown to recipients; must match the business, e.g.
   "Tijarah Connect"), verify by OTP. Copy its new **Phone number ID** into
   `WHATSAPP_PHONE_NUMBER_ID`.
3. **Payment method** — <https://business.facebook.com/billing_hub> → the WABA →
   add a card/UPI and pick **INR** billing. Messages are billed per delivered
   template plus 18% GST.
4. **Permanent token** — Business settings → **Users → System users → Add**
   (name `tijarah-api`, role Admin) → **Add assets**: the app (full control) and
   the WABA (full control) → **Generate new token** with permissions
   `whatsapp_business_messaging` and `whatsapp_business_management`, expiry
   *Never*. Replace `WHATSAPP_ACCESS_TOKEN`.
5. Re-point the webhook to the production API URL and re-verify.
6. **App review** is *not* required as long as the WABA belongs to your own
   business and the app is only used by you (standard access).
7. In the admin app Settings: set **Daily cap** to your current Meta tier (shown
   on the phone card; starts at 1,000 after verification) and the sending window
   (default 9:00–21:00 IST).

## C. Keeping the account healthy

- **Quality rating** on the phone card: GREEN/YELLOW/RED. Blocks and reports by
  recipients drive it down; RED for 7 days lowers the tier. The Overview page
  flags drops.
- Prefer **utility** templates for anything about the owner's own listing
  (₹0.115 vs ₹0.86 for marketing). Meta re-categorises templates it thinks are
  mis-labelled; check the category after approval.
- Send the `tijarah_consent_request` campaign once to the existing base before
  regular marketing broadcasts, and leave `STOP` handling on. Consent is a
  Meta policy requirement and a DPDP Act requirement.
- Rates in Settings → Rates should be updated when Meta changes its India rate
  card (last change: 1 Jan 2026).
