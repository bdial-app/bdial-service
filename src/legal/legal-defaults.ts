/**
 * The first published version of each legal document, inserted when a
 * document doesn't exist yet. After that the documents live in the database
 * and super admins edit them in the admin app (Legal documents); changing
 * this file does not change a document that already exists.
 *
 * Content is a small Markdown subset that the apps render: "## " and "### "
 * headings, paragraphs, "- " and "1. " lists, "> " callouts, **bold** and
 * [links](/legal?doc=privacy).
 */

export type LegalRequiredFor = 'everyone' | 'business' | 'none';

export interface LegalDefault {
  slug: string;
  title: string;
  summary: string;
  /** Who must tick to accept it: everyone signed in, business owners, or no one (read-only). */
  requiredFor: LegalRequiredFor;
  sortOrder: number;
  content: string;
}

const CONTACT = 'support@tijarahapp.in';
const EFFECTIVE = '17 October 2026';

const GRIEVANCE = `## Grievance Officer

In line with the Information Technology Act, 2000, the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Digital Personal Data Protection Act, 2023, you can raise any complaint about Tijarah, its content or your personal data with our Grievance Officer:

- **Grievance Officer, Tijarah (Pronttera)**
- Email: [${CONTACT}](mailto:${CONTACT}) with the subject "Grievance"
- Address: Pune, Maharashtra, India

We acknowledge complaints within 24 hours and resolve them within 15 days. Requests to remove content that exposes someone's private areas, shows them in a sexual act, or impersonates them are acted on within 24 hours.`;

export const LEGAL_DEFAULTS: LegalDefault[] = [
  {
    slug: 'terms',
    title: 'Terms of Use',
    summary:
      'The rules for using Tijarah: your account, what we are and are not, content, payments and your rights.',
    requiredFor: 'everyone',
    sortOrder: 1,
    content: `Effective ${EFFECTIVE}

Welcome to Tijarah, the business app of the Dawoodi Bohra community. Tijarah is operated by Pronttera ("Tijarah", "we", "us"). These Terms of Use ("Terms") are an agreement between you and us for using the Tijarah mobile apps, website and related services (the "Platform").

By creating an account, ticking "I agree", or using the Platform, you accept these Terms together with our [Privacy Policy](/legal?doc=privacy) and [Community Guidelines](/legal?doc=community-guidelines). If you list a business, the [Business Listing Terms](/legal?doc=business-terms) also apply. If you buy a paid feature, the [Refund & Cancellation Policy](/legal?doc=refund-policy) applies. If you do not agree, please do not use the Platform.

## 1. What Tijarah is, and is not

Tijarah helps people discover Bohra-owned businesses, products and services, contact them, and share reviews.

> Tijarah is an intermediary under Section 79 of the Information Technology Act, 2000. We do not own, run or control any listed business. Orders, bookings, prices, payments for goods or services, delivery and quality are agreed directly between you and the business. We are not a party to those arrangements and are not responsible for them.

## 2. Who can use Tijarah

- You must be 18 or older, or use Tijarah with the knowledge and consent of a parent or legal guardian who accepts these Terms for you.
- You must be able to enter into a binding contract under Indian law and not be barred from using the Platform.
- To list a business you must be 18 or older and authorised to act for that business.

## 3. Your account

- You sign in with your mobile number (and a one-time password), or with Google or Apple.
- Give accurate details and keep them up to date. Keep your phone and sign-in secure; you are responsible for activity on your account.
- Tell us straight away at [${CONTACT}](mailto:${CONTACT}) if you think someone else has used your account.
- You can delete your account at any time from Profile → Delete Account.

## 4. Using the Platform

You agree not to:

- post anything false, misleading, defamatory, obscene, hateful, or that infringes someone else's rights;
- impersonate a person or business, or misrepresent your connection with them;
- harass, threaten or spam anyone, including businesses you contact through Tijarah;
- copy, scrape or collect data from the Platform, or use it to build a competing service;
- upload malware, attempt to break into accounts or systems, or interfere with the Platform;
- use the Platform for anything unlawful under Indian law.

The full rules for reviews, photos, chats and listings are in the [Community Guidelines](/legal?doc=community-guidelines).

## 5. Listings, reviews and other content

- Listings are provided by businesses, by our team from information the business gave us, or from publicly available information. We work to keep them accurate but do not guarantee them.
- The "Verified" badge means our team checked an identity or community document. It does not guarantee the quality, safety or reliability of a business.
- Reviews must be honest and based on your own experience. Owners cannot review their own business.
- You keep ownership of what you post. You give us a non-exclusive, royalty-free, worldwide licence to host, show, adapt (for example resize) and share it on the Platform and in Tijarah's own promotion of the Platform, for as long as it stays on the Platform.
- We may remove content or restrict accounts that break these Terms, the Community Guidelines or the law, and we act on valid court and government orders.

## 6. Messages and notifications

We send service messages about your account and activity (for example sign-in codes, enquiry replies and alerts) by SMS, push notification, email or WhatsApp. Promotional messages are sent only where you have agreed, and you can turn them off in Settings or by replying STOP on WhatsApp.

## 7. Paid features

Some features for businesses, such as subscriptions and Boost, are paid. Prices are shown in Indian Rupees before you pay and include applicable taxes unless stated. Payments are processed by Razorpay on Android and the web, and by Apple on iOS. Subscriptions renew automatically until cancelled. Refunds follow the [Refund & Cancellation Policy](/legal?doc=refund-policy).

## 8. Intellectual property

The Platform, its design, software, name and logos belong to us or our licensors. We give you a personal, limited, non-transferable, revocable licence to use the apps for their intended purpose. On iOS, the [End User Licence Agreement](/legal?doc=eula) also applies.

## 9. Disclaimers

The Platform is provided "as is" and "as available". We do not promise that it will always be available or error-free, or that any listing, product, price, deal or review is accurate. Please use your own judgement before dealing with any business.

## 10. Limitation of liability

To the extent the law allows, we are not liable for any indirect or consequential loss, or for any loss arising from your dealings with a business or another user. Our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim, or ₹1,000 if you paid nothing.

## 11. Indemnity

You agree to compensate us for claims, losses and costs arising from your breach of these Terms, your content, or your misuse of the Platform.

## 12. Suspension and ending

You can stop using Tijarah at any time. We may suspend or end your access if you break these Terms or the law, or to protect other users or the Platform. Where it is reasonable, we will tell you why and give you a chance to respond.

## 13. Changes to these Terms

We may update these Terms. If a change is important, we will tell you in the app and ask you to accept the new version before you continue. The version you accepted and when you accepted it are recorded on your account.

## 14. Law and disputes

These Terms are governed by the laws of India. Please contact us first; most issues can be sorted out quickly. If not, the courts at Pune, Maharashtra have exclusive jurisdiction.

${GRIEVANCE}

## Contact

Questions about these Terms: [${CONTACT}](mailto:${CONTACT})`,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary:
      'What personal data we collect, why, who we share it with, how long we keep it, and your rights.',
    requiredFor: 'everyone',
    sortOrder: 2,
    content: `Effective ${EFFECTIVE}

This Privacy Policy explains how Tijarah, operated by Pronttera ("we", "us"), handles your personal data when you use the Tijarah apps and website. It is our notice to you under the Digital Personal Data Protection Act, 2023 ("DPDP Act") and the Information Technology Act, 2000.

## 1. The data we collect

### What you give us

- **Mobile number** to create your account, sign you in with a one-time password, and let businesses reply to you.
- **Name, email and profile photo** (optional) to personalise your account and show on your reviews.
- **Business details** if you list a business: name, address, location pin, categories, products, prices, photos, timings and contact numbers.
- **Identity documents** (optional, business owners only): Aadhaar, PAN or Ejamaat card, only to give the Verified badge.
- **Reviews, photos, chats, reports and enquiries** you send through the app.
- **Payment details** for paid features. Card and UPI details are handled by Razorpay or Apple; we only receive the payment status and reference.

### What we collect automatically

- **Location** (only with your permission) to show businesses near you.
- **Device and app information**: device model, operating system, app version, push notification token.
- **Usage information**: searches, screens viewed, businesses you contact or save, to improve results and recommendations.
- **Crash and error reports** to fix problems.

## 2. Why we use it

- To run your account and sign you in.
- To show listings, search results, nearby businesses and personalised suggestions.
- To pass your enquiries, chats and calls to the business you contact, and their replies to you.
- To send service messages (sign-in codes, enquiry alerts, account updates) by SMS, push, email or WhatsApp.
- To send offers and updates only if you have agreed; you can stop them at any time.
- To verify businesses, prevent fraud and spam, and moderate content.
- To process payments for business features.
- To understand how the app is used and improve it.
- To meet legal obligations and respond to lawful requests.

We do not sell your personal data.

## 3. Who we share it with

- **Businesses you contact**: your name and the details you send them, so they can respond. Businesses may use these only to respond to you.
- **Service providers** who process data for us under contract: Supabase (database, sign-in and storage), Google Firebase (push notifications), Google Maps (maps and places), MSG91 (SMS codes), Meta (WhatsApp Business messages), Razorpay (payments on Android and web), Apple (payments on iOS), PostHog (product analytics), Sentry (crash reports).
- **Authorities**, when required by law or a valid order.

## 4. Where and how long we keep it

Your data is stored on secure cloud servers and encrypted in transit and at rest. Identity documents are kept in a separate, restricted store that only authorised staff can open.

We keep your data while your account is active. When you delete your account, we delete or anonymise your personal data within 30 days, except what the law requires us to keep (for example payment records for tax purposes). Identity documents are deleted within 30 days of a request.

## 5. Your rights

Under the DPDP Act you can:

- **access** a summary of the personal data we hold about you and how we use it;
- **correct or update** it (most details can be changed in the app);
- **erase** it, by deleting your account in Profile → Delete Account or by writing to us;
- **withdraw consent** for optional uses (location, notifications, WhatsApp updates) in Settings, without affecting what was done before;
- **nominate** someone to exercise your rights if you die or are incapacitated;
- **raise a grievance** with us, and if not resolved, complain to the Data Protection Board of India.

Write to [${CONTACT}](mailto:${CONTACT}) to use any of these rights. We may need to confirm your identity first.

## 6. Children

Tijarah is meant for people aged 18 and over. A person under 18 may use it only with the verifiable consent of a parent or legal guardian. We do not track or target advertising at children. If you believe a child has given us data without consent, contact us and we will delete it.

## 7. Security

We use encryption, access controls and monitoring to protect your data. No system is perfectly secure; if a breach affects you, we will tell you and the Data Protection Board as the law requires.

## 8. Changes

If we change this policy in an important way, we will tell you in the app and, where needed, ask you to accept the new version.

${GRIEVANCE}`,
  },
  {
    slug: 'business-terms',
    title: 'Business Listing Terms',
    summary:
      'Extra terms for business owners: listing rules, verification, enquiries, WhatsApp alerts and paid features.',
    requiredFor: 'business',
    sortOrder: 3,
    content: `Effective ${EFFECTIVE}

These Business Listing Terms apply if you list or manage a business on Tijarah. They add to the [Terms of Use](/legal?doc=terms) and [Privacy Policy](/legal?doc=privacy). If they differ, these terms apply to your business listing.

## 1. Your listing

- You confirm you own the business or are authorised by its owner to list and manage it.
- Tijarah is a platform for businesses owned or run by members of the Dawoodi Bohra community. You confirm this applies to your business.
- Everything you publish (name, address, timings, products, prices, photos, deals) must be accurate, lawful and kept up to date.
- You hold any licence or registration your business needs, for example FSSAI for food or GST where applicable, and you are responsible for your own taxes.
- You have the rights to every photo, logo and text you upload.

## 2. Listings set up by our team

Our team may set up a listing for you, from details you gave us (in person, on a call or on a form) or from publicly available information. When you first sign in, please check every detail and accept these terms. You can ask us to correct or remove your listing at any time.

## 3. What you cannot list

- Illegal goods or services, or anything that needs a licence you do not hold.
- Weapons, drugs, tobacco or alcohol, adult content, gambling, or counterfeit goods.
- Duplicate, fake or misleading listings, or products and prices you do not actually offer.

## 4. Verification

The Verified badge is optional. If you submit an identity or community document, you confirm it is genuine and yours. We use it only to verify you, store it securely and never show it to customers. False documents lead to removal.

## 5. Customers and enquiries

- Respond to customers honestly and politely, and honour the prices and deals you publish.
- Use customers' details only to respond to their enquiry or complete what they asked for. Do not add them to marketing lists, share them, or message them unasked.
- You are responsible for the goods and services you provide and for any agreement you make with a customer.

## 6. WhatsApp alerts and messages

With your agreement, we send customer enquiries, reminders and account updates about your business to your WhatsApp number. You can turn them off in Notification Settings or reply STOP at any time. We never send them to a number that has opted out.

## 7. Reviews

You cannot review your own business, ask friends or staff to post fake reviews, or offer anything in exchange for a review. You may reply to reviews respectfully. You may share your review link to ask real customers for reviews.

## 8. Paid features

Subscriptions, Boost and other paid features are optional. Their price, what they include and how long they last are shown before you pay. Paid features improve visibility; they do not guarantee a number of enquiries or sales. Refunds follow the [Refund & Cancellation Policy](/legal?doc=refund-policy).

## 9. Suspension and removal

We may hide, suspend or remove a listing that breaks these terms, the [Community Guidelines](/legal?doc=community-guidelines) or the law, or that receives repeated valid complaints. Where it is reasonable, we will warn you first and tell you what to fix.

## 10. Indemnity

You agree to compensate Tijarah for claims, losses and costs arising from your business, your listing content, or your dealings with customers.

## 11. Ending

You can ask us to remove your listing at any time. Some information, such as reviews customers wrote about your business and records we must keep by law, may remain.

## Contact

Questions about these terms: [${CONTACT}](mailto:${CONTACT})`,
  },
  {
    slug: 'community-guidelines',
    title: 'Community Guidelines',
    summary:
      'How we keep Tijarah trustworthy: rules for reviews, photos, chats and listings, and what happens when they are broken.',
    requiredFor: 'none',
    sortOrder: 4,
    content: `Tijarah is built on trust within our community. These guidelines apply to everything shared on Tijarah: listings, products, photos, reviews, replies and chats. They form part of the [Terms of Use](/legal?doc=terms).

## Be honest

- Review only businesses you have actually dealt with, and describe your own experience.
- No paid, swapped or incentivised reviews, and no reviews of your own business or a competitor's.
- Listings, products, prices and deals must be real and current.

## Be respectful

- No abuse, threats, harassment or hate based on religion, community, caste, gender, disability or anything else.
- Disagree politely. Criticise the service, not the person.
- Do not share anyone's phone number, address or private details without permission.

## Keep it appropriate

- No sexual, violent, or graphic content.
- No content that is illegal, promotes illegal activity, or infringes someone's copyright or trademark.
- No spam, chain messages, or links to unrelated sites.

## Chats and enquiries

- Use chat to ask about products and services, and to make arrangements.
- Businesses must not message customers who have not contacted them, or keep messaging after being asked to stop.

## Reporting

Use Report on any business, review, photo or chat to tell us about something that breaks these guidelines. We review every report. You can also block a user.

## What we do

Depending on how serious it is, we may remove content, give a warning, limit features, or suspend or close an account. Repeated or serious violations, such as fraud, lead to permanent removal. If you think we got it wrong, write to [${CONTACT}](mailto:${CONTACT}).`,
  },
  {
    slug: 'refund-policy',
    title: 'Refund & Cancellation Policy',
    summary:
      'How cancellation and refunds work for subscriptions, Boost and other paid business features.',
    requiredFor: 'none',
    sortOrder: 5,
    content: `Effective ${EFFECTIVE}

This policy covers the paid features Tijarah sells to businesses, such as subscriptions and Boost. Tijarah does not sell or take payment for the goods and services that listed businesses offer; refunds for those are between you and the business.

## Cancelling

- **Subscriptions** renew automatically until you cancel. Cancel any time in the app (Business → Subscription), or on iOS in Settings → Apple ID → Subscriptions. Cancellation stops the next renewal; your plan stays active until the end of the period you paid for.
- **Boost** runs for the period you bought and can be stopped early, but the unused time is not refunded unless one of the cases below applies.

## When we refund

We refund the amount paid when:

- you were charged twice for the same purchase;
- you were charged but the feature was not activated within 48 hours and we could not fix it;
- the feature could not be delivered because of a fault on our side;
- you ask within 7 days of a first-time purchase and have not used the feature (for example, no Boost impressions delivered).

We do not refund partly used periods, renewals you forgot to cancel (after the period has started), or features removed because the listing broke our terms.

## How to ask

Write to [${CONTACT}](mailto:${CONTACT}) with your registered mobile number, the payment reference and the reason. We reply within 2 working days.

## How refunds are paid

Approved refunds go back to the original payment method within 5–7 working days through Razorpay. Your bank may take a few extra days to show it.

Purchases made on iPhone or iPad are processed by Apple, and only Apple can refund them: request one at reportaproblem.apple.com.`,
  },
  {
    slug: 'eula',
    title: 'End User Licence Agreement',
    summary:
      'The licence to use the Tijarah app on your device, including the terms Apple requires for iOS.',
    requiredFor: 'none',
    sortOrder: 6,
    content: `Effective ${EFFECTIVE}

This End User Licence Agreement ("Agreement") is between you and Pronttera, the operator of Tijarah ("we", "us"). It covers your use of the Tijarah app on your device and works together with the [Terms of Use](/legal?doc=terms).

## 1. Licence

We grant you a limited, non-exclusive, non-transferable, revocable licence to install and use the Tijarah app on devices you own or control, for its intended purpose. You may not:

- copy, modify, translate or create derivative works of the app;
- reverse engineer, decompile or disassemble it, except where the law allows;
- rent, lease, lend, sell or sublicense it;
- remove any copyright or other notices.

## 2. Your conduct

Your use of the app must follow the [Terms of Use](/legal?doc=terms) and the [Community Guidelines](/legal?doc=community-guidelines). Objectionable content and abusive users are not tolerated; you can report content and block users in the app, and we act on reports within 24 hours.

## 3. Updates

We may release updates. Some may be required to keep using the app.

## 4. Ending

This licence lasts until you or we end it. It ends automatically if you break it. When it ends, you must stop using and delete the app.

## 5. No warranty and limited liability

The app is provided "as is". The disclaimers and limits of liability in the [Terms of Use](/legal?doc=terms) apply.

## 6. Apple-specific terms (iOS)

- This Agreement is between you and us, not Apple. We, not Apple, are responsible for the app and its content.
- Apple has no obligation to provide maintenance or support for the app.
- If the app fails to meet any applicable warranty, you may notify Apple, and Apple will refund the purchase price (if any). Apple has no other warranty obligation for the app.
- We, not Apple, are responsible for any claims about the app, including product liability, legal or regulatory compliance, and consumer protection claims.
- If a third party claims that the app infringes their intellectual property, we, not Apple, are responsible for dealing with it.
- You confirm you are not located in a country under a US Government embargo or on a US Government list of prohibited or restricted parties.
- Apple and its subsidiaries are third-party beneficiaries of this Agreement and may enforce it against you.

## 7. Law

This Agreement is governed by the laws of India, and the courts at Pune, Maharashtra have exclusive jurisdiction.

## Contact

[${CONTACT}](mailto:${CONTACT})`,
  },
];
