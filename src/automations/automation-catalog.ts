import { LINK_ORIGIN_TOKEN } from '../common/app-links';
import type {
  WhatsAppTemplateCategory,
  WhatsAppTemplateComponent,
  WhatsAppTemplateVariable,
} from '../entities/whatsapp-template.entity';

/**
 * Every automated WhatsApp message: its template (submitted to Meta from
 * admin → WhatsApp → Templates → Seed), what fills its blanks, when it may be
 * sent and which app screen its button opens. All start switched off.
 */

/** Button links: the app opens the screen, or the right store sends them to install. */
export const GO_URL_BASE = `${LINK_ORIGIN_TOKEN}/go?c=`;
const GO_URL_EXAMPLE = `${GO_URL_BASE}k3m9q2xw7a`;

export type AutomationKey =
  | 'enquiry_alert'
  | 'enquiries_waiting'
  | 'weekly_summary'
  | 'monthly_summary'
  | 'free_leads_left'
  | 'review_alert'
  | 'verification_approved'
  | 'verification_not_approved'
  | 'women_led_approved'
  | 'deal_approved'
  | 'deal_not_approved'
  | 'shop_live'
  | 'plan_renewal'
  | 'payment_failed'
  | 'boost_ending'
  | 'business_replied'
  | 'customer_waiting';

export interface AutomationTemplateDef {
  name: string;
  category: WhatsAppTemplateCategory;
  /** Meta's {{1}} {{2}} … in order. */
  body: string;
  /** For each {{n}}: the context value that fills it, and an example. */
  vars: Array<{ key: string; label: string; sample: string }>;
  /** The link button (first button). */
  linkButton: string;
  /** Extra quick-reply buttons (marketing asks for consent). */
  quickReplies?: string[];
}

export interface AutomationDef {
  key: AutomationKey;
  /** Admin-facing name and what triggers it. */
  name: string;
  when: string;
  audience: 'owner' | 'customer';
  template: AutomationTemplateDef;
  /** Wait this long after the event (gives push and the app a chance first). */
  delayMinutes: number;
  /** Skip WhatsApp if they used the app this recently (0 = never skip). */
  appFirstMinutes: number;
  /** Account and money messages: always sent, but still counted in limits. */
  essential: boolean;
  /** Enquiry alerts may be 2 a day; everything else 1. */
  enquiry?: boolean;
  /** Who it's for: opted_in (utility) or not_decided (asks for consent). */
  consent: 'opted_in' | 'not_decided';
}

const FOOTER = 'Tijarah · reply STOP to turn off';

export const AUTOMATIONS: AutomationDef[] = [
  {
    key: 'enquiry_alert',
    name: 'New enquiry',
    when: 'A customer enquires and the owner hasn’t seen it in the app within 30 minutes. Several in 6 hours become one message.',
    audience: 'owner',
    delayMinutes: 30,
    appFirstMinutes: 30,
    essential: false,
    enquiry: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_enquiry_alert',
      category: 'utility',
      body: 'Salaam {{1}}, {{2}} sent {{3}} an enquiry on Tijarah:\n"{{4}}"',
      vars: [
        { key: 'ownerFirstName', label: 'Owner first name', sample: 'Huzefa' },
        { key: 'customerName', label: 'Customer name', sample: 'Sakina' },
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        {
          key: 'excerpt',
          label: 'Enquiry text',
          sample: 'Do you have kaju katli 1 kg boxes for Eid?',
        },
      ],
      linkButton: 'View enquiry',
    },
  },
  {
    key: 'enquiries_waiting',
    name: 'Customers waiting',
    when: '6 PM, if an enquiry has gone unanswered for 4+ hours. Once a day.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 60,
    essential: false,
    enquiry: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_enquiries_waiting',
      category: 'utility',
      body: '{{1}} customers are waiting for a reply from {{2}} on Tijarah. The oldest enquiry is from {{3}}.',
      vars: [
        { key: 'waitingCount', label: 'Customers waiting', sample: '3' },
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'oldestWhen', label: 'Oldest enquiry', sample: 'this morning' },
      ],
      linkButton: 'Open chats',
    },
  },
  {
    key: 'weekly_summary',
    name: 'Weekly summary',
    when: 'Monday 10 AM, with real activity (5+ views or an enquiry), if they haven’t opened the app in 3 days. Not in the first week of the month.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 3 * 24 * 60,
    essential: false,
    consent: 'opted_in',
    template: {
      name: 'tijarah_weekly_summary',
      category: 'utility',
      body: '{{1}} this week on Tijarah ({{2}}): {{3}} views, {{4}} times in search, {{5}} enquiries, {{6}} calls.',
      vars: [
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'range', label: 'Dates', sample: '6–12 Oct' },
        { key: 'views', label: 'Profile views', sample: '92' },
        { key: 'searches', label: 'Search appearances', sample: '310' },
        { key: 'enquiries', label: 'Enquiries', sample: '3' },
        { key: 'calls', label: 'Calls', sample: '2' },
      ],
      linkButton: 'View my week',
    },
  },
  {
    key: 'monthly_summary',
    name: 'Monthly summary + free leads renewed',
    when: '1st of the month, 10 AM, for shops viewed at least once last month.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: false,
    consent: 'opted_in',
    template: {
      name: 'tijarah_monthly_summary',
      category: 'utility',
      body: "Salaam {{1}}, here's {{2}} for {{3}} on Tijarah:\n👀 {{4}} profile views\n🔎 {{5}} times in search\n💬 {{6}} enquiries · 📞 {{7}} calls\nYour {{8}} free lead unlocks for {{9}} are ready.",
      vars: [
        { key: 'ownerFirstName', label: 'Owner first name', sample: 'Huzefa' },
        { key: 'month', label: 'Month', sample: 'October' },
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'views', label: 'Profile views', sample: '210' },
        { key: 'searches', label: 'Search appearances', sample: '540' },
        { key: 'enquiries', label: 'Enquiries', sample: '6' },
        { key: 'calls', label: 'Calls', sample: '4' },
        { key: 'freeLeads', label: 'Free unlocks', sample: '5' },
        { key: 'nextMonth', label: 'New month', sample: 'November' },
      ],
      linkButton: 'View my month',
    },
  },
  {
    key: 'free_leads_left',
    name: 'Free leads left',
    when: '25th, only if free unlocks are unused, leads are waiting, and they haven’t opened the app in 7 days.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 7 * 24 * 60,
    essential: false,
    consent: 'opted_in',
    template: {
      name: 'tijarah_free_leads_left',
      category: 'utility',
      body: '{{1}} has {{2}} of {{3}} free lead unlocks left for {{4}} on Tijarah. They reset on {{5}}. {{6}} leads are waiting to be seen.',
      vars: [
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'left', label: 'Unlocks left', sample: '3' },
        { key: 'quota', label: 'Monthly unlocks', sample: '5' },
        { key: 'month', label: 'Month', sample: 'October' },
        { key: 'resetDate', label: 'Reset date', sample: '1 November' },
        { key: 'waiting', label: 'Leads waiting', sample: '4' },
      ],
      linkButton: 'View leads',
    },
  },
  {
    key: 'review_alert',
    name: 'New review',
    when: '2 hours after a review, if the owner hasn’t opened the app since. One a day.',
    audience: 'owner',
    delayMinutes: 120,
    appFirstMinutes: 120,
    essential: false,
    consent: 'opted_in',
    template: {
      name: 'tijarah_review_alert',
      category: 'utility',
      body: '{{1}} rated {{2}} {{3}}★ on Tijarah: "{{4}}"',
      vars: [
        { key: 'reviewerName', label: 'Reviewer', sample: 'Sakina' },
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'stars', label: 'Stars', sample: '5' },
        {
          key: 'excerpt',
          label: 'Review text',
          sample: 'Best kaju katli in Pune.',
        },
      ],
      linkButton: 'Reply to review',
    },
  },
  {
    key: 'verification_approved',
    name: 'Verification approved',
    when: 'When an admin approves the owner’s verification.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_verified',
      category: 'utility',
      body: 'Your verification for {{1}} on Tijarah is approved. Your listing now shows the Verified badge.',
      vars: [
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
      ],
      linkButton: 'View my shop',
    },
  },
  {
    key: 'verification_not_approved',
    name: 'Verification not approved',
    when: 'When an admin rejects the owner’s verification.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_verification_not_approved',
      category: 'utility',
      body: "We couldn't verify {{1}} on Tijarah yet: {{2}}",
      vars: [
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        {
          key: 'reason',
          label: 'Reason',
          sample: 'the document photo was blurry. Please upload a clearer one.',
        },
      ],
      linkButton: 'Try again',
    },
  },
  {
    key: 'women_led_approved',
    name: 'Women-led approved',
    when: 'When an admin approves a women-led request.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_women_led_approved',
      category: 'utility',
      body: '{{1}} is approved as women-led on Tijarah. It now gets {{2}} free lead unlocks a month and the women-led badge.',
      vars: [
        { key: 'brandName', label: 'Business name', sample: 'Fatema Boutique' },
        { key: 'freeLeads', label: 'Free unlocks', sample: '8' },
      ],
      linkButton: 'View my shop',
    },
  },
  {
    key: 'deal_approved',
    name: 'Deal approved',
    when: 'When an admin approves a deal.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_deal_approved',
      category: 'utility',
      body: 'Your deal "{{1}}" for {{2}} is approved and live on Tijarah until {{3}}.',
      vars: [
        { key: 'dealTitle', label: 'Deal', sample: 'Eid gift boxes 10% off' },
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'endDate', label: 'Ends', sample: '30 Oct' },
      ],
      linkButton: 'View deal',
    },
  },
  {
    key: 'deal_not_approved',
    name: 'Deal not approved',
    when: 'When an admin rejects a deal.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_deal_not_approved',
      category: 'utility',
      body: 'Your deal "{{1}}" for {{2}} wasn\'t approved on Tijarah: {{3}}',
      vars: [
        { key: 'dealTitle', label: 'Deal', sample: 'Eid gift boxes 10% off' },
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        {
          key: 'reason',
          label: 'Reason',
          sample: 'please add the minimum order amount.',
        },
      ],
      linkButton: 'Edit deal',
    },
  },
  {
    key: 'shop_live',
    name: 'Your shop is live',
    when: 'When a listing is approved, and 3 days after an onboarded owner says Yes on WhatsApp (if they haven’t signed in).',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_shop_live',
      category: 'utility',
      body: '{{1}} is live on Tijarah. {{2}} people have viewed it so far. Sign in with {{3}} to manage it.',
      vars: [
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'views', label: 'Views so far', sample: '23' },
        { key: 'maskedPhone', label: 'Sign-in number', sample: '98••••3210' },
      ],
      linkButton: 'Open my shop',
    },
  },
  {
    key: 'plan_renewal',
    name: 'Plan renews soon',
    when: '3 days before an auto-renewing plan renews.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_plan_renewal',
      category: 'utility',
      body: 'Your {{1}} plan for {{2}} on Tijarah renews on {{3}} for ₹{{4}}.',
      vars: [
        { key: 'planName', label: 'Plan', sample: 'Growth' },
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'renewDate', label: 'Renews on', sample: '20 Oct' },
        { key: 'amount', label: 'Amount', sample: '999' },
      ],
      linkButton: 'Manage plan',
    },
  },
  {
    key: 'payment_failed',
    name: 'Payment failed',
    when: 'When a plan payment fails.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_payment_failed',
      category: 'utility',
      body: "The payment of ₹{{1}} for {{2}}'s {{3}} plan on Tijarah didn't go through.",
      vars: [
        { key: 'amount', label: 'Amount', sample: '999' },
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'planName', label: 'Plan', sample: 'Growth' },
      ],
      linkButton: 'Update payment',
    },
  },
  {
    key: 'boost_ending',
    name: 'Boost ending',
    when: '2–3 days before a boost ends.',
    audience: 'owner',
    delayMinutes: 0,
    appFirstMinutes: 0,
    essential: true,
    consent: 'opted_in',
    template: {
      name: 'tijarah_boost_ending',
      category: 'utility',
      body: "{{1}}'s boost on Tijarah ends on {{2}}. So far: {{3}} impressions and {{4}} visits.",
      vars: [
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        { key: 'endDate', label: 'Ends', sample: '20 Oct' },
        { key: 'impressions', label: 'Impressions', sample: '1,240' },
        { key: 'clicks', label: 'Visits', sample: '86' },
      ],
      linkButton: 'View results',
    },
  },
  {
    key: 'business_replied',
    name: 'A business replied (customers)',
    when: 'A business replies and the customer hasn’t read it within an hour. Customers who turned on WhatsApp replies only.',
    audience: 'customer',
    delayMinutes: 60,
    appFirstMinutes: 60,
    essential: false,
    consent: 'opted_in',
    template: {
      name: 'tijarah_business_replied',
      category: 'utility',
      body: '{{1}} replied to your enquiry on Tijarah: "{{2}}"',
      vars: [
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
        {
          key: 'excerpt',
          label: 'Reply text',
          sample: 'Yes, we have 1 kg boxes. Shall I keep one aside?',
        },
      ],
      linkButton: 'Read and reply',
    },
  },
  {
    key: 'customer_waiting',
    name: 'A customer is trying to reach you (not yet agreed)',
    when: 'An enquiry arrives for an owner who hasn’t agreed to WhatsApp alerts yet. Once a week, 3 times ever. Marketing (₹0.86).',
    audience: 'owner',
    delayMinutes: 30,
    appFirstMinutes: 24 * 60,
    essential: false,
    enquiry: true,
    consent: 'not_decided',
    template: {
      name: 'tijarah_customer_waiting',
      category: 'marketing',
      body: "Salaam {{1}}, a customer enquired about {{2}} on Tijarah, the Dawoodi Bohra community's business app. Your shop is already set up for you.",
      vars: [
        { key: 'ownerFirstName', label: 'Owner first name', sample: 'Huzefa' },
        { key: 'brandName', label: 'Business name', sample: 'Burhani Sweets' },
      ],
      linkButton: 'View enquiry',
      quickReplies: ['Yes, alert me'],
    },
  },
];

export const AUTOMATION_BY_KEY = new Map(AUTOMATIONS.map((a) => [a.key, a]));
export const AUTOMATION_KEYS = AUTOMATIONS.map((a) => a.key);

/** Quick replies that mean "yes" / "no" to WhatsApp alerts (any template). */
export const CONSENT_YES_REPLIES = [
  'YES, ALERT ME',
  'YES, SEND ME CUSTOMER ALERTS',
];
export const CONSENT_NO_REPLIES = ['NOT INTERESTED'];

/** The template definition as stored and submitted to Meta. */
export function templateComponents(t: AutomationTemplateDef): {
  components: WhatsAppTemplateComponent[];
  variables: WhatsAppTemplateVariable[];
} {
  const buttons: NonNullable<WhatsAppTemplateComponent['buttons']> = [
    {
      type: 'URL',
      text: t.linkButton,
      url: `${GO_URL_BASE}{{1}}`,
      example: [GO_URL_EXAMPLE],
    },
    ...(t.quickReplies ?? []).map((text) => ({
      type: 'QUICK_REPLY' as const,
      text,
    })),
  ];
  return {
    components: [
      { type: 'BODY', text: t.body },
      {
        type: 'FOOTER',
        text:
          t.category === 'marketing'
            ? 'Tijarah · tap "Not interested" to stop'
            : FOOTER,
      },
      { type: 'BUTTONS', buttons },
    ],
    variables: t.vars.map((v, i) => ({
      index: i + 1,
      location: 'body' as const,
      label: v.label,
      source: 'custom' as const,
      sample: v.sample,
    })),
  };
}
