import {
  WhatsAppTemplateCategory,
  WhatsAppTemplateComponent,
  WhatsAppTemplateVariable,
} from '../../entities/whatsapp-template.entity';
import {
  AUTOMATIONS,
  templateComponents,
} from '../../automations/automation-catalog';

export interface StarterTemplate {
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  description: string;
  components: WhatsAppTemplateComponent[];
  variables: WhatsAppTemplateVariable[];
}

const FOOTER: WhatsAppTemplateComponent = {
  type: 'FOOTER',
  text: 'Tijarah Connect',
};

const PROFILE_URL_BASE = 'https://tijarahapp.in/provider-details?id=';
const PROFILE_URL_EXAMPLE = `${PROFILE_URL_BASE}3f9c2e1a-0000-4000-8000-000000000000`;
const APP_URL =
  'https://play.google.com/store/apps/details?id=com.pronttera.tijarah';

const brandVar: WhatsAppTemplateVariable = {
  index: 1,
  location: 'body',
  label: 'Business name',
  source: 'brand_name',
  sample: 'Pronttera',
};
const cityVar: WhatsAppTemplateVariable = {
  index: 2,
  location: 'body',
  label: 'City',
  source: 'city',
  sample: 'Pune',
};

/** A URL button whose last path segment is the provider id ({{1}} suffix). */
function profileButton(text: string): WhatsAppTemplateComponent {
  return {
    type: 'BUTTONS',
    buttons: [
      {
        type: 'URL',
        text,
        url: `${PROFILE_URL_BASE}{{1}}`,
        example: [PROFILE_URL_EXAMPLE],
      },
    ],
  };
}

function appButton(text: string): WhatsAppTemplateComponent {
  return {
    type: 'BUTTONS',
    buttons: [{ type: 'URL', text, url: APP_URL }],
  };
}

function body(text: string, ...samples: string[]): WhatsAppTemplateComponent {
  return {
    type: 'BODY',
    text,
    example: samples.length ? { body_text: [samples] } : undefined,
  };
}

const BASE_TEMPLATES: StarterTemplate[] = [
  {
    name: 'tijarah_new_enquiry',
    language: 'en',
    category: 'utility',
    description:
      'Tell an owner a customer has sent an enquiry so they reply quickly.',
    components: [
      body(
        'Hi {{1}}, you have a new enquiry on Tijarah Connect from a customer in {{2}}. Reply quickly to win the business.',
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      profileButton('Open enquiries'),
    ],
    variables: [brandVar, cityVar],
  },
  {
    name: 'tijarah_weekly_visits',
    language: 'en',
    category: 'utility',
    description: 'Weekly profile-view count to keep owners engaged.',
    components: [
      body(
        'Hi {{1}}, your Tijarah Connect profile was viewed {{2}} times this week. Keep it updated to turn visits into customers.',
        'Pronttera',
        '37',
      ),
      FOOTER,
      profileButton('View profile'),
    ],
    variables: [
      brandVar,
      {
        index: 2,
        location: 'body',
        label: 'Profile views (7 days)',
        source: 'visits_7d',
        sample: '37',
      },
    ],
  },
  {
    name: 'tijarah_verification_approved',
    language: 'en',
    category: 'utility',
    description: 'Sent when a business verification is approved.',
    components: [
      body(
        'Congratulations {{1}}! Your business is now verified on Tijarah Connect. Verified businesses appear higher in search and earn more trust.',
        'Pronttera',
      ),
      FOOTER,
      profileButton('See your badge'),
    ],
    variables: [brandVar],
  },
  {
    name: 'tijarah_verification_docs_needed',
    language: 'en',
    category: 'utility',
    description: 'Ask an owner to upload a valid ID document.',
    components: [
      body(
        "Hi {{1}}, we couldn't complete your Tijarah Connect verification yet. Please upload a valid ID document so customers can see your verified badge.",
        'Pronttera',
      ),
      FOOTER,
      profileButton('Upload documents'),
    ],
    variables: [brandVar],
  },
  {
    name: 'tijarah_profile_incomplete',
    language: 'en',
    category: 'utility',
    description: 'Nudge owners whose listing has no logo or products.',
    components: [
      body(
        'Hi {{1}}, your Tijarah Connect listing is missing a logo and products. Complete it in 2 minutes so customers in {{2}} can find you.',
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      profileButton('Complete profile'),
    ],
    variables: [brandVar, cityVar],
  },
  {
    name: 'tijarah_set_location',
    language: 'en',
    category: 'utility',
    description:
      'Owners whose listing sits at the city centre: ask them to drop their pin so customers get a distance and directions.',
    components: [
      body(
        'Hi {{1}}, customers in {{2}} can see your business on Tijarah Connect but not how far away it is, because its map location is not set. Open the app, go to My business, then Details, and tap Set my location. It takes a minute and lets customers get directions to you.',
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      profileButton('Open Tijarah'),
    ],
    variables: [brandVar, cityVar],
  },
  {
    name: 'tijarah_new_review',
    language: 'en',
    category: 'utility',
    description: 'Tell an owner a customer left a review.',
    components: [
      body(
        'Hi {{1}}, a customer just left a review for your business on Tijarah Connect. Read and respond to build trust.',
        'Pronttera',
      ),
      FOOTER,
      profileButton('Read review'),
    ],
    variables: [brandVar],
  },
  {
    name: 'tijarah_add_products',
    language: 'en',
    category: 'marketing',
    description: 'Promote adding products to the listing.',
    components: [
      body(
        'Hi {{1}}, businesses with products listed get 3× more enquiries on Tijarah Connect. Add yours today and get discovered in {{2}}.',
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      profileButton('Add products'),
    ],
    variables: [brandVar, cityVar],
  },
  {
    name: 'tijarah_share_profile',
    language: 'en',
    category: 'marketing',
    description: 'Encourage owners to share their profile link.',
    components: [
      body(
        'Hi {{1}}, share your Tijarah Connect profile with your customers and on social media to get more reviews and reach. Here is your link.',
        'Pronttera',
      ),
      FOOTER,
      profileButton('Share now'),
    ],
    variables: [brandVar],
  },
  {
    name: 'tijarah_announcement',
    language: 'en',
    category: 'marketing',
    description: 'Generic announcement; {{2}} is free text set per campaign.',
    components: [
      body(
        'Hi {{1}}, here is an update from the Tijarah Connect team for your business:\n\n{{2}}\n\nOpen the app to see what has changed.',
        'Pronttera',
        'we have launched a new Deals section where you can post offers for free this month',
      ),
      FOOTER,
      appButton('Open Tijarah'),
    ],
    variables: [
      brandVar,
      {
        index: 2,
        location: 'body',
        label: 'Announcement text',
        source: 'custom',
        sample:
          'we have launched a new Deals section where you can post offers for free this month.',
      },
    ],
  },
  {
    name: 'tijarah_consent_request',
    language: 'en',
    category: 'marketing',
    description:
      'Ask the existing base for opt-in before regular marketing broadcasts.',
    components: [
      body(
        "Hi {{1}}, this is Tijarah Connect. We'd like to send you occasional tips and updates to help grow your business on WhatsApp. Reply START to subscribe or STOP to opt out.",
        'Pronttera',
      ),
      FOOTER,
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'START' },
          { type: 'QUICK_REPLY', text: 'STOP' },
        ],
      },
    ],
    variables: [brandVar],
  },
  {
    name: 'tijarah_winback',
    language: 'en',
    category: 'marketing',
    description: 'Win back owners who have not opened the app recently.',
    components: [
      body(
        'Hi {{1}}, we miss you on Tijarah Connect! Customers in {{2}} are searching for businesses like yours. Log in to check your new enquiries.',
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      appButton('Open app'),
    ],
    variables: [brandVar, cityVar],
  },
];

// ── Automations and the onboarding campaigns (all seeded as drafts) ─────────

function v(
  index: number,
  label: string,
  source: WhatsAppTemplateVariable['source'],
  sample: string,
): WhatsAppTemplateVariable {
  return { index, location: 'body', label, source, sample };
}

/** Quick replies the webhook understands: "Yes" records consent, "Not interested" opts out. */
function welcomeButtons(): WhatsAppTemplateComponent {
  return {
    type: 'BUTTONS',
    buttons: [
      {
        type: 'URL',
        text: 'Open my shop',
        url: `${PROFILE_URL_BASE}{{1}}`,
        example: [PROFILE_URL_EXAMPLE],
      },
      { type: 'QUICK_REPLY', text: 'Yes, send me customer alerts' },
      { type: 'QUICK_REPLY', text: 'Not interested' },
    ],
  };
}
const MARKETING_FOOTER: WhatsAppTemplateComponent = {
  type: 'FOOTER',
  text: 'Tijarah · tap "Not interested" to stop',
};

/** For Campaigns: owners we onboarded, before they've agreed to alerts. */
const ONBOARDING_CAMPAIGN_TEMPLATES: StarterTemplate[] = [
  {
    name: 'tijarah_welcome',
    language: 'en',
    category: 'marketing',
    description:
      'Welcome for owners we onboarded. "Yes" turns on WhatsApp alerts; "Not interested" stops messages.',
    components: [
      {
        type: 'BODY',
        text: 'Salaam {{1}},\n{{2}} is now on Tijarah, the business app made for our Dawoodi Bohra community. Mumineen in {{3}} can now find your shop, see your products and message you directly. {{4}} people viewed your listing this week.',
      },
      MARKETING_FOOTER,
      welcomeButtons(),
    ],
    variables: [
      v(1, 'Owner name', 'owner_name', 'Huzefa'),
      v(2, 'Business name', 'brand_name', 'Burhani Sweets'),
      v(3, 'City', 'city', 'Pune'),
      v(4, 'Views (7 days)', 'visits_7d', '23'),
    ],
  },
  {
    name: 'tijarah_welcome_new',
    language: 'en',
    category: 'marketing',
    description: 'The welcome for shops with no views yet.',
    components: [
      {
        type: 'BODY',
        text: 'Salaam {{1}},\n{{2}} is now on Tijarah, the business app made for our Dawoodi Bohra community. Mumineen in {{3}} can now find your shop, see your products and message you directly.',
      },
      MARKETING_FOOTER,
      welcomeButtons(),
    ],
    variables: [
      v(1, 'Owner name', 'owner_name', 'Huzefa'),
      v(2, 'Business name', 'brand_name', 'Burhani Sweets'),
      v(3, 'City', 'city', 'Pune'),
    ],
  },
  {
    name: 'tijarah_listing_reminder',
    language: 'en',
    category: 'marketing',
    description:
      "Day 7 / day 30 reminder for owners who didn't answer the welcome. Only for shops with views.",
    components: [
      {
        type: 'BODY',
        text: '{{1}} Mumineen viewed {{2}} on Tijarah this week. Your shop is ready whenever you are.',
      },
      MARKETING_FOOTER,
      welcomeButtons(),
    ],
    variables: [
      v(1, 'Views (7 days)', 'visits_7d', '12'),
      v(2, 'Business name', 'brand_name', 'Burhani Sweets'),
    ],
  },
  {
    name: 'tijarah_occasion',
    language: 'en',
    category: 'marketing',
    description:
      'Community occasions (about 4 a year). Fill the occasion as a custom value.',
    components: [
      {
        type: 'BODY',
        text: '{{1}} Mubarak from Tijarah. Mumineen are searching for {{2}} this week. Add a deal so they find {{3}} first.',
      },
      MARKETING_FOOTER,
      profileButton('Add a deal'),
    ],
    variables: [
      v(1, 'Occasion', 'custom', 'Eid'),
      v(2, 'Category', 'category', 'sweets'),
      v(3, 'Business name', 'brand_name', 'Burhani Sweets'),
    ],
  },
  {
    name: 'tijarah_win_back',
    language: 'en',
    category: 'marketing',
    description:
      "Owners who haven't opened the app in 30 days, with real activity. At most every 60 days.",
    components: [
      {
        type: 'BODY',
        text: 'In the last 7 days, {{1}} got {{2}} views and {{3}} enquiries on Tijarah.',
      },
      MARKETING_FOOTER,
      profileButton('Open my shop'),
    ],
    variables: [
      v(1, 'Business name', 'brand_name', 'Burhani Sweets'),
      v(2, 'Views (7 days)', 'visits_7d', '34'),
      v(3, 'Enquiries (7 days)', 'enquiries_7d', '2'),
    ],
  },
];

/** The automated messages' templates (admin → WhatsApp → Automations sends them). */
const AUTOMATION_TEMPLATES: StarterTemplate[] = AUTOMATIONS.map((a) => ({
  name: a.template.name,
  language: 'en',
  category: a.template.category,
  description: `Automation: ${a.name}. ${a.when}`,
  ...templateComponents(a.template),
}));

export const STARTER_TEMPLATES: StarterTemplate[] = [
  ...BASE_TEMPLATES,
  ...AUTOMATION_TEMPLATES,
  ...ONBOARDING_CAMPAIGN_TEMPLATES,
];
