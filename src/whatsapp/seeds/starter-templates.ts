import {
  WhatsAppTemplateCategory,
  WhatsAppTemplateComponent,
  WhatsAppTemplateVariable,
} from '../../entities/whatsapp-template.entity';
import {
  AUTOMATIONS,
  GO_URL_BASE,
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

/**
 * Every link button is …/go?c={{1}}: each person gets their own code, which
 * opens the template's screen in the app (LINK_TARGETS below), or sends them
 * to the App Store / Google Play and opens that screen after they sign in.
 */
const LINK_URL = `${GO_URL_BASE}{{1}}`;
const LINK_EXAMPLE = `${GO_URL_BASE}k3m9q2xw7a`;

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

/** One link button (to the template's screen in LINK_TARGETS). */
function linkButton(text: string): WhatsAppTemplateComponent {
  return {
    type: 'BUTTONS',
    buttons: [{ type: 'URL', text, url: LINK_URL, example: [LINK_EXAMPLE] }],
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
        'Salaam, {{1}} has a new enquiry on Tijarah from a customer in {{2}}. Open the chat to read it and reply.',
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      linkButton('Open enquiries'),
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
        'Salaam, {{1}} was viewed {{2}} times on Tijarah this week. Up-to-date photos, prices and hours turn more of these visits into customers.',
        'Pronttera',
        '37',
      ),
      FOOTER,
      linkButton('See my week'),
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
        'Mubarak! {{1}} is now verified on Tijarah. Your listing shows the Verified badge, and verified businesses appear higher in search.',
        'Pronttera',
      ),
      FOOTER,
      linkButton('See my listing'),
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
        "Salaam, we couldn't complete the verification of {{1}} on Tijarah yet. Please upload a clear photo of a valid ID document from the app so your listing can show the Verified badge.",
        'Pronttera',
      ),
      FOOTER,
      linkButton('Upload documents'),
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
        'Salaam, the listing for {{1}} on Tijarah is missing a logo and products. Adding them takes about two minutes and helps customers in {{2}} find and choose you.',
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      linkButton('Complete profile'),
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
        'Salaam, {{1}} is on Tijarah, but customers in {{2}} cannot see how far away it is because its map location is not set. Tap below and choose Set my location. It takes a minute and gives customers directions to you.',
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      linkButton('Set my location'),
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
        'Salaam, a customer just reviewed {{1}} on Tijarah. Read it and reply, since customers notice businesses that respond to reviews.',
        'Pronttera',
      ),
      FOOTER,
      linkButton('Read review'),
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
        "Salaam, customers on Tijarah can only see what {{1}} sells once it's listed. Add your products and services with prices so people in {{2}} can find them.",
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      linkButton('Add products'),
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
        'Salaam, share the Tijarah page of {{1}} with your customers and on your WhatsApp status. More visits bring more reviews and enquiries.',
        'Pronttera',
      ),
      FOOTER,
      linkButton('Open my page'),
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
        'Salaam, an update from the Tijarah team for {{1}}:\n\n{{2}}\n\nTap below to see it in the app.',
        'Pronttera',
        'we have launched a new Deals section where you can post offers for free this month',
      ),
      FOOTER,
      linkButton('Open Tijarah'),
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
        'Salaam, this is Tijarah. May we message {{1}} on WhatsApp when customers enquire, along with occasional tips to grow your business? Tap a reply below.',
        'Pronttera',
      ),
      FOOTER,
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Yes, send me customer alerts' },
          { type: 'QUICK_REPLY', text: 'Not interested' },
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
        'Salaam, {{1}} has been quiet on Tijarah lately, while customers in {{2}} keep searching for businesses like yours. Open the app to see your latest enquiries.',
        'Pronttera',
        'Pune',
      ),
      FOOTER,
      linkButton('See my enquiries'),
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
        url: LINK_URL,
        example: [LINK_EXAMPLE],
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
        text: 'Salaam, {{1}} Mumineen viewed {{2}} on Tijarah this week. Your shop is ready whenever you are.',
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
        text: 'Salaam, and {{1}} Mubarak from Tijarah. Mumineen are searching for {{2}} this week. Add a deal so they find {{3}} first.',
      },
      MARKETING_FOOTER,
      linkButton('Add a deal'),
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
      linkButton('Open my shop'),
    ],
    variables: [
      v(1, 'Business name', 'brand_name', 'Burhani Sweets'),
      v(2, 'Views (7 days)', 'visits_7d', '34'),
      v(3, 'Enquiries (7 days)', 'enquiries_7d', '2'),
    ],
  },
];

// ── Growth: visibility for owners, discovery for customers (drafts) ─────────

const NOT_INTERESTED = { type: 'QUICK_REPLY' as const, text: 'Not interested' };

/** A link (to the screen in LINK_TARGETS), any extra replies, and a way out. */
function shopButtons(
  text: string,
  ...replies: string[]
): WhatsAppTemplateComponent {
  return {
    type: 'BUTTONS',
    buttons: [
      {
        type: 'URL',
        text,
        url: LINK_URL,
        example: [LINK_EXAMPLE],
      },
      ...replies.map((r) => ({ type: 'QUICK_REPLY' as const, text: r })),
      NOT_INTERESTED,
    ],
  };
}

/** A link (to the screen in LINK_TARGETS) and a way out. */
function siteButtons(text: string): WhatsAppTemplateComponent {
  return {
    type: 'BUTTONS',
    buttons: [
      { type: 'URL', text, url: LINK_URL, example: [LINK_EXAMPLE] },
      NOT_INTERESTED,
    ],
  };
}

const ownerVar = (i: number) => v(i, 'Owner name', 'owner_name', 'Huzefa');
const brandAt = (i: number) =>
  v(i, 'Business name', 'brand_name', 'Burhani Sweets');
const cityAt = (i: number) => v(i, 'City', 'city', 'Pune');
/** For customers, owner_name is the customer's own name. */
const customerVar = v(1, 'Customer name', 'owner_name', 'Sakina');

/**
 * For Campaigns to business owners: each nudges one thing that gets a shop
 * seen more. Audience: Businesses.
 */
const OWNER_GROWTH_TEMPLATES: StarterTemplate[] = [
  {
    name: 'tijarah_shop_link',
    language: 'en',
    category: 'marketing',
    description:
      "Owners: their shop's own web page (www.tijarahapp.in/business/…) to post on their status, Instagram bio and visiting cards. {{3}} = Business page link.",
    components: [
      body(
        'Salaam {{1}},\n{{2}} now has its own page on the web: {{3}}\n\nPost it on your WhatsApp status, Instagram bio and visiting cards. Anyone who opens it sees your products and prices and can call or message you directly.',
        'Huzefa',
        'Burhani Sweets',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
      MARKETING_FOOTER,
      shopButtons('Open my shop'),
    ],
    variables: [
      ownerVar(1),
      brandAt(2),
      v(
        3,
        'Business page link',
        'business_link',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
    ],
  },
  {
    name: 'tijarah_add_photos',
    language: 'en',
    category: 'marketing',
    description:
      'Owners with few or no gallery photos: photos are what customers look at first.',
    components: [
      body(
        'Salaam {{1}},\ncustomers in {{2}} decide in seconds, and photos are the first thing they look at. Add a few clear photos of {{3}}, your products or your shop, so they know what to expect before they call.',
        'Huzefa',
        'Pune',
        'Burhani Sweets',
      ),
      MARKETING_FOOTER,
      shopButtons('Add photos'),
    ],
    variables: [ownerVar(1), cityAt(2), brandAt(3)],
  },
  {
    name: 'tijarah_post_deal',
    language: 'en',
    category: 'marketing',
    description:
      'Owners with no running deal: offers appear in the Deals section and on their shop.',
    components: [
      body(
        'Salaam {{1}},\nposting an offer is the quickest way to get noticed on Tijarah. Deals from {{2}} show in the Deals section that customers in {{3}} browse, and on your shop page. It takes a minute in the app.',
        'Huzefa',
        'Burhani Sweets',
        'Pune',
      ),
      MARKETING_FOOTER,
      shopButtons('Post a deal'),
    ],
    variables: [ownerVar(1), brandAt(2), cityAt(3)],
  },
  {
    name: 'tijarah_get_reviews',
    language: 'en',
    category: 'marketing',
    description:
      'Owners with few reviews: send happy customers their review link from the app (My business → Get reviews).',
    components: [
      body(
        'Salaam {{1}},\nnew customers trust what other Mumineen say. Ask a few happy customers to review {{2}} on Tijarah: in the app, open My business and tap Get reviews to send them your review link on WhatsApp.',
        'Huzefa',
        'Burhani Sweets',
      ),
      MARKETING_FOOTER,
      shopButtons('Get reviews'),
    ],
    variables: [ownerVar(1), brandAt(2)],
  },
  {
    name: 'tijarah_get_verified',
    language: 'en',
    category: 'marketing',
    description: 'Unverified owners: what the Verified badge gives them.',
    components: [
      body(
        'Salaam {{1}},\nget the Verified badge for {{2}} on Tijarah. Verified businesses show higher in search and customers trust them more. It takes a few minutes in the app.',
        'Huzefa',
        'Burhani Sweets',
      ),
      MARKETING_FOOTER,
      shopButtons('Get verified'),
    ],
    variables: [ownerVar(1), brandAt(2)],
  },
  {
    name: 'tijarah_check_details',
    language: 'en',
    category: 'marketing',
    description:
      'Every few months: are hours, phone and address still right? Wrong hours lose customers.',
    components: [
      body(
        'Salaam {{1}},\nare the opening hours, phone number and address of {{2}} still right on Tijarah? Customers in {{3}} check them before they visit or call, so it is worth a quick look.',
        'Huzefa',
        'Burhani Sweets',
        'Pune',
      ),
      MARKETING_FOOTER,
      shopButtons('Check my details', 'All correct'),
    ],
    variables: [ownerVar(1), brandAt(2), cityAt(3)],
  },
  {
    name: 'tijarah_share_catalogue',
    language: 'en',
    category: 'marketing',
    description:
      'Owners with products: send their whole catalogue, with prices, in one tap.',
    components: [
      body(
        'Salaam {{1}},\nyour customers can now see everything {{2}} sells, with prices, from one link. In the app, open your catalogue and tap Share to send it to a customer, a group or your WhatsApp status.',
        'Huzefa',
        'Burhani Sweets',
      ),
      MARKETING_FOOTER,
      shopButtons('Open my catalogue'),
    ],
    variables: [ownerVar(1), brandAt(2)],
  },
  {
    name: 'tijarah_boost_listing',
    language: 'en',
    category: 'marketing',
    description:
      'Owners getting views who could reach more: a sponsored boost puts them at the top.',
    components: [
      body(
        'Salaam {{1}},\nwant more customers in {{2}} to see {{3}}? A boost puts your shop at the top of search and on the home page for the days you choose. Set it up in the app under My business.',
        'Huzefa',
        'Pune',
        'Burhani Sweets',
      ),
      MARKETING_FOOTER,
      shopButtons('Boost my shop'),
    ],
    variables: [ownerVar(1), cityAt(2), brandAt(3)],
  },
  {
    name: 'tijarah_women_led_badge',
    language: 'en',
    category: 'marketing',
    description:
      'Owners not marked Women-Led: a "Yes" reply lands in the inbox, where an admin checks and adds the badge.',
    components: [
      body(
        'Salaam {{1}},\nis {{2}} run by a woman? Tijarah has a Women-Led section where customers look for women-run businesses. Reply below and our team will add the badge to your shop after a quick check.',
        'Huzefa',
        'Burhani Sweets',
      ),
      MARKETING_FOOTER,
      shopButtons('Open my shop', "Yes, it's women-led"),
    ],
    variables: [ownerVar(1), brandAt(2)],
  },
  {
    name: 'tijarah_refer_business',
    language: 'en',
    category: 'marketing',
    description:
      'Owners: invite other business owners. More shops on Tijarah bring more customers to all of them.',
    components: [
      body(
        'Salaam {{1}},\ndo you know another business owner in {{2}} who should be on Tijarah? Forward them this message. Listing a business is free and takes about three minutes, and every new shop brings more customers to the app.',
        'Huzefa',
        'Pune',
      ),
      MARKETING_FOOTER,
      siteButtons('List a business'),
    ],
    variables: [ownerVar(1), cityAt(2)],
  },
];

/**
 * For Campaigns to app customers: bring them back to discover community
 * businesses. Audience: Customers. Only their name and city can be filled
 * in (business fields are refused for customers); buttons are fixed pages.
 */
const CUSTOMER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'tijarah_cust_discover',
    language: 'en',
    category: 'marketing',
    description: 'Customers: what Tijarah has near them.',
    components: [
      body(
        'Salaam {{1}},\nlooking for something in {{2}}? Tijarah has shops, services and home businesses from our community, with photos, prices and reviews. Call or WhatsApp them directly from the app.',
        'Sakina',
        'Pune',
      ),
      MARKETING_FOOTER,
      siteButtons('Explore Tijarah'),
    ],
    variables: [customerVar, cityAt(2)],
  },
  {
    name: 'tijarah_cust_deals',
    language: 'en',
    category: 'marketing',
    description: 'Customers: new offers from community businesses.',
    components: [
      body(
        'Salaam {{1}},\nthere are new deals from community businesses in {{2}} on Tijarah this week. Have a look before they end.',
        'Sakina',
        'Pune',
      ),
      MARKETING_FOOTER,
      siteButtons('See deals'),
    ],
    variables: [customerVar, cityAt(2)],
  },
  {
    name: 'tijarah_cust_occasion',
    language: 'en',
    category: 'marketing',
    description:
      'Customers, before a community occasion. {{2}} = the occasion (custom value, e.g. Eid).',
    components: [
      body(
        'Salaam {{1}},\ngetting ready for {{2}}? Find ridas, sweets, caterers, gifts and more from community businesses in {{3}} on Tijarah, and order straight from them.',
        'Sakina',
        'Eid',
        'Pune',
      ),
      MARKETING_FOOTER,
      siteButtons('Start shopping'),
    ],
    variables: [customerVar, v(2, 'Occasion', 'custom', 'Eid'), cityAt(3)],
  },
  {
    name: 'tijarah_cust_women_led',
    language: 'en',
    category: 'marketing',
    description: 'Customers: the Women-Led section.',
    components: [
      body(
        'Salaam {{1}},\nsupport women-run businesses in our community. The Women-Led section on Tijarah has home bakers, boutiques, tutors and more in {{2}}, all in one place.',
        'Sakina',
        'Pune',
      ),
      MARKETING_FOOTER,
      siteButtons('See Women-Led'),
    ],
    variables: [customerVar, cityAt(2)],
  },
  {
    name: 'tijarah_cust_new_businesses',
    language: 'en',
    category: 'marketing',
    description:
      'Customers: how many shops joined lately. {{2}} = the number (custom value per campaign).',
    components: [
      body(
        'Salaam {{1}},\n{{2}} new community businesses joined Tijarah in {{3}} recently. See who is new near you.',
        'Sakina',
        '12',
        'Pune',
      ),
      MARKETING_FOOTER,
      siteButtons("See what's new"),
    ],
    variables: [
      customerVar,
      v(2, 'New businesses (number)', 'custom', '12'),
      cityAt(3),
    ],
  },
  {
    name: 'tijarah_cust_list_business',
    language: 'en',
    category: 'marketing',
    description:
      'Customers who might run a business, even from home: list it free. Turns customers into listings.',
    components: [
      body(
        'Salaam {{1}},\ndo you run a business, even from home? List it on Tijarah for free and let the community in {{2}} find you. It takes about three minutes.',
        'Sakina',
        'Pune',
      ),
      MARKETING_FOOTER,
      siteButtons('List my business'),
    ],
    variables: [customerVar, cityAt(2)],
  },
  {
    name: 'tijarah_cust_invite',
    language: 'en',
    category: 'marketing',
    description: 'Customers: share the app with family and friends.',
    components: [
      body(
        'Salaam {{1}},\nshukran for using Tijarah. Know someone in {{2}} who would find it useful? Share the app with family and friends, so more of our businesses get found.',
        'Sakina',
        'Pune',
      ),
      MARKETING_FOOTER,
      siteButtons('Get the app'),
    ],
    variables: [customerVar, cityAt(2)],
  },
  {
    name: 'tijarah_cust_comeback',
    language: 'en',
    category: 'marketing',
    description: "Customers who haven't opened the app in a while.",
    components: [
      body(
        "Salaam {{1}},\nit's been a while! Since your last visit, new shops, services and deals from community businesses in {{2}} have joined Tijarah.",
        'Sakina',
        'Pune',
      ),
      MARKETING_FOOTER,
      siteButtons('Open Tijarah'),
    ],
    variables: [customerVar, cityAt(2)],
  },
];

// ── Utility: event updates that carry a link (drafts) ───────────────────────
//
// Meta keeps a template in Utility only while it is a plain, non-promotional
// update about something the person did or has with us, sent because that
// thing happened. These are written that way: no selling, each tied to one
// event (see its description). The visibility comes from the links they
// carry — owners get their own page link to share, customers the business's.
// Send each when its event happens (one person, not a broadcast).

const pageLinkAt = (i: number) =>
  v(
    i,
    'Business page link',
    'business_link',
    'https://www.tijarahapp.in/business/burhani-sweets/',
  );

const OWNER_UTILITY_TEMPLATES: StarterTemplate[] = [
  {
    name: 'tijarah_page_ready',
    language: 'en',
    category: 'utility',
    description:
      "Event: the owner's listing goes live. Gives them their own page link.",
    components: [
      body(
        'Salaam {{1}},\nthe listing for {{2}} on Tijarah is now live. Your business page is at {{3}}\n\nAnyone who opens this link can see your details and contact you directly.',
        'Huzefa',
        'Burhani Sweets',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
      FOOTER,
      linkButton('Open my page'),
    ],
    variables: [ownerVar(1), brandAt(2), pageLinkAt(3)],
  },
  {
    name: 'tijarah_listing_created_for_you',
    language: 'en',
    category: 'utility',
    description:
      'Event: an admin or a bulk import created a listing for this owner. "Not mine" lands in the inbox.',
    components: [
      body(
        'Salaam {{1}},\na business listing for {{2}} has been created on Tijarah, the business app of our Dawoodi Bohra community. Its page is at {{3}}\n\nYou can check and edit the details from the app. If this is not your business, reply Not mine.',
        'Huzefa',
        'Burhani Sweets',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
      FOOTER,
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Check my listing',
            url: LINK_URL,
            example: [LINK_EXAMPLE],
          },
          { type: 'QUICK_REPLY', text: 'Not mine' },
        ],
      },
    ],
    variables: [ownerVar(1), brandAt(2), pageLinkAt(3)],
  },
  {
    name: 'tijarah_link_changed',
    language: 'en',
    category: 'utility',
    description:
      "Event: the business's link (slug) was changed by the owner or an admin. {{4}} = the old link.",
    components: [
      body(
        'Salaam {{1}},\nthe web address of {{2}} on Tijarah is now {{3}}\n\nYour old link, {{4}}, still opens your page, so links you have already shared keep working.',
        'Huzefa',
        'Burhani Sweets',
        'https://www.tijarahapp.in/business/burhani-sweets-pune/',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
      FOOTER,
      linkButton('Open my page'),
    ],
    variables: [
      ownerVar(1),
      brandAt(2),
      pageLinkAt(3),
      v(
        4,
        'Old link',
        'custom',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
    ],
  },
  {
    name: 'tijarah_details_updated',
    language: 'en',
    category: 'utility',
    description:
      'Event: the listing was edited by someone other than the owner (e.g. an admin). {{2}} = what changed, {{4}} = when.',
    components: [
      body(
        'Salaam {{1}},\nthe {{2}} of {{3}} on Tijarah was updated on {{4}}. If you did not ask for this change, reply to this message and our team will help.',
        'Huzefa',
        'opening hours',
        'Burhani Sweets',
        '24 Oct',
      ),
      FOOTER,
      linkButton('View my listing'),
    ],
    variables: [
      ownerVar(1),
      v(2, 'What changed', 'custom', 'opening hours'),
      brandAt(3),
      v(4, 'Date', 'custom', '24 Oct'),
    ],
  },
  {
    name: 'tijarah_photo_removed',
    language: 'en',
    category: 'utility',
    description:
      'Event: a photo was removed in Photo Moderation. {{3}} = the reason.',
    components: [
      body(
        'Salaam {{1}},\na photo was removed from {{2}} on Tijarah because {{3}}. You can upload a replacement from the app at any time.',
        'Huzefa',
        'Burhani Sweets',
        'it was blurry',
      ),
      FOOTER,
      linkButton('Add a photo'),
    ],
    variables: [
      ownerVar(1),
      brandAt(2),
      v(3, 'Reason', 'custom', 'it was blurry'),
    ],
  },
  {
    name: 'tijarah_item_hidden',
    language: 'en',
    category: 'utility',
    description:
      'Event: an admin hid one of their products or services. {{2}} = the item, {{4}} = the reason.',
    components: [
      body(
        'Salaam {{1}},\nthe item "{{2}}" from {{3}} is hidden from customers on Tijarah because {{4}}. You can edit it in the app to show it again.',
        'Huzefa',
        'Kaju Katli 1 kg',
        'Burhani Sweets',
        'the price was missing',
      ),
      FOOTER,
      linkButton('Edit the item'),
    ],
    variables: [
      ownerVar(1),
      v(2, 'Item', 'custom', 'Kaju Katli 1 kg'),
      brandAt(3),
      v(4, 'Reason', 'custom', 'the price was missing'),
    ],
  },
  {
    name: 'tijarah_review_link',
    language: 'en',
    category: 'utility',
    description:
      'Event: the owner asked for their review link (My business → Get reviews). {{3}} = their review link.',
    components: [
      body(
        'Salaam {{1}},\nhere is the review link for {{2}} that you asked for: {{3}}\n\nCustomers who open it can rate your business in one step.',
        'Huzefa',
        'Burhani Sweets',
        'https://www.tijarahapp.in/r?b=burhani-sweets',
      ),
      FOOTER,
      linkButton('Open my reviews'),
    ],
    variables: [
      ownerVar(1),
      brandAt(2),
      v(
        3,
        'Review link',
        'custom',
        'https://www.tijarahapp.in/r?b=burhani-sweets',
      ),
    ],
  },
  {
    name: 'tijarah_catalogue_link',
    language: 'en',
    category: 'utility',
    description:
      'Event: the owner asked for their catalogue link. {{3}} = /business/<slug>/catalogue/.',
    components: [
      body(
        'Salaam {{1}},\nhere is the catalogue link for {{2}} that you asked for: {{3}}\n\nIt lists every item with its price and stays up to date as you edit your catalogue.',
        'Huzefa',
        'Burhani Sweets',
        'https://www.tijarahapp.in/business/burhani-sweets/catalogue/',
      ),
      FOOTER,
      linkButton('Open my catalogue'),
    ],
    variables: [
      ownerVar(1),
      brandAt(2),
      v(
        3,
        'Catalogue link',
        'custom',
        'https://www.tijarahapp.in/business/burhani-sweets/catalogue/',
      ),
    ],
  },
  {
    name: 'tijarah_verification_received',
    language: 'en',
    category: 'utility',
    description:
      'Event: the owner submitted verification documents. {{3}} = how long review takes.',
    components: [
      body(
        'Salaam {{1}},\nwe have received the verification documents for {{2}}. Our team reviews them within {{3}}, and you will get a message as soon as it is done.',
        'Huzefa',
        'Burhani Sweets',
        '2 working days',
      ),
      FOOTER,
      linkButton('Check status'),
    ],
    variables: [
      ownerVar(1),
      brandAt(2),
      v(3, 'Review time', 'custom', '2 working days'),
    ],
  },
];

/**
 * Customers' updates. Business details come in as custom values, filled by
 * whatever sends them; the button opens the business (/b/<provider id>).
 */
const CUSTOMER_UTILITY_TEMPLATES: StarterTemplate[] = [
  {
    name: 'tijarah_enquiry_sent',
    language: 'en',
    category: 'utility',
    description:
      'Event: a customer sent an enquiry. {{2}} = business, {{3}} = their message, {{4}} = the business page link.',
    components: [
      body(
        'Salaam {{1}},\nyour enquiry to {{2}} was sent on Tijarah:\n"{{3}}"\n\nTheir reply will come to you in the app. Their page, {{4}}, has their phone number and location.',
        'Sakina',
        'Burhani Sweets',
        'Do you have kaju katli 1 kg boxes for Eid?',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
      FOOTER,
      linkButton('Open my enquiry'),
    ],
    variables: [
      customerVar,
      v(2, 'Business name', 'custom', 'Burhani Sweets'),
      v(
        3,
        'Enquiry text',
        'custom',
        'Do you have kaju katli 1 kg boxes for Eid?',
      ),
      v(
        4,
        'Business page link',
        'custom',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
    ],
  },
  {
    name: 'tijarah_review_posted',
    language: 'en',
    category: 'utility',
    description:
      "Event: a customer's review was published. {{3}} = the business page link.",
    components: [
      body(
        'Salaam {{1}},\nyour review of {{2}} is now published on Tijarah. You can see it, or edit it, on their page, {{3}}, at any time.',
        'Sakina',
        'Burhani Sweets',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
      FOOTER,
      linkButton('View business'),
    ],
    variables: [
      customerVar,
      v(2, 'Business name', 'custom', 'Burhani Sweets'),
      v(
        3,
        'Business page link',
        'custom',
        'https://www.tijarahapp.in/business/burhani-sweets/',
      ),
    ],
  },
  {
    name: 'tijarah_saved_business',
    language: 'en',
    category: 'utility',
    description:
      'Event: a customer saved a business. Its address and hours, for reference.',
    components: [
      body(
        'Salaam {{1}},\nyou saved {{2}} on Tijarah. Address: {{3}}. Hours: {{4}}. You can find it again any time under Saved in the app.',
        'Sakina',
        'Burhani Sweets',
        'Shop 4, Camp, Pune',
        '10 AM to 8 PM',
      ),
      FOOTER,
      linkButton('View business'),
    ],
    variables: [
      customerVar,
      v(2, 'Business name', 'custom', 'Burhani Sweets'),
      v(3, 'Address', 'custom', 'Shop 4, Camp, Pune'),
      v(4, 'Hours', 'custom', '10 AM to 8 PM'),
    ],
  },
  {
    name: 'tijarah_saved_business_update',
    language: 'en',
    category: 'utility',
    description:
      'Event: a business the customer saved changed its hours, phone or location. {{3}} = what changed, {{4}} = the new value.',
    components: [
      body(
        'Salaam {{1}},\n{{2}}, a business you saved on Tijarah, has updated its {{3}}. The new details: {{4}}. Open it in the app for directions or to contact them.',
        'Sakina',
        'Burhani Sweets',
        'opening hours',
        '9 AM to 9 PM',
      ),
      FOOTER,
      linkButton('View business'),
    ],
    variables: [
      customerVar,
      v(2, 'Business name', 'custom', 'Burhani Sweets'),
      v(3, 'What changed', 'custom', 'opening hours'),
      v(4, 'New details', 'custom', '9 AM to 9 PM'),
    ],
  },
  {
    name: 'tijarah_account_ready',
    language: 'en',
    category: 'utility',
    description:
      'Event: a customer signed up. {{2}} = last digits of their number. A "not me" reply lands in the inbox.',
    components: [
      body(
        'Salaam {{1}},\nyour Tijarah account is ready. You signed up with the number ending {{2}}. If this was not you, reply to this message and we will look into it.',
        'Sakina',
        '4885',
      ),
      FOOTER,
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Open Tijarah',
            url: LINK_URL,
            example: [LINK_EXAMPLE],
          },
        ],
      },
    ],
    variables: [customerVar, v(2, 'Number ending', 'custom', '4885')],
  },
  {
    name: 'tijarah_invite_joined',
    language: 'en',
    category: 'utility',
    description:
      'Event: someone joined Tijarah through this person’s invite. {{2}} = who joined.',
    components: [
      body(
        'Salaam {{1}},\n{{2}} joined Tijarah using your invite. Thank you for sharing the app with the community.',
        'Sakina',
        'Fatema',
      ),
      FOOTER,
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Open Tijarah',
            url: LINK_URL,
            example: [LINK_EXAMPLE],
          },
        ],
      },
    ],
    variables: [customerVar, v(2, 'Who joined', 'custom', 'Fatema')],
  },
];

// ── Where each link button opens ───────────────────────────────────────────
//
// App routes. `mode=provider` opens the owner's side of the app, `customer`
// the shopper's. `{provider_id}` is the recipient's own business;
// `{business_id}` is a business the message is about (the campaign picks it).

const owner = (path: string) =>
  `${path}${path.includes('?') ? '&' : '?'}mode=provider`;
const shopper = (path: string) =>
  `${path}${path.includes('?') ? '&' : '?'}mode=customer`;
const MY_PAGE = owner('/provider-details?id={provider_id}');
const MANAGE = (subTab: string) => owner(`/?tab=listings&subTab=${subTab}`);
const BUSINESS = shopper('/provider-details?id={business_id}');

export const LINK_TARGETS: Record<string, string> = {
  // Owners: alerts and their listing
  tijarah_new_enquiry: owner('/?tab=chats'),
  tijarah_weekly_visits: owner('/?tab=analytics'),
  tijarah_verification_approved: MY_PAGE,
  tijarah_verification_docs_needed: owner('/provider-onboarding/verify'),
  tijarah_profile_incomplete: MANAGE('details'),
  tijarah_set_location: MANAGE('details'),
  tijarah_new_review: MANAGE('reviews'),
  tijarah_add_products: MANAGE('products'),
  tijarah_share_profile: MY_PAGE,
  tijarah_announcement: owner('/?tab=home'),
  tijarah_winback: owner('/?tab=chats'),
  // Owners: onboarding campaigns
  tijarah_welcome: owner('/?tab=home'),
  tijarah_welcome_new: owner('/?tab=home'),
  tijarah_listing_reminder: owner('/?tab=home'),
  tijarah_occasion: MANAGE('deals'),
  tijarah_win_back: owner('/?tab=analytics'),
  // Owners: growth
  tijarah_shop_link: MY_PAGE,
  tijarah_add_photos: MANAGE('photos'),
  tijarah_post_deal: MANAGE('deals'),
  tijarah_get_reviews: MANAGE('reviews'),
  tijarah_get_verified: owner('/provider-onboarding/verify'),
  tijarah_check_details: MANAGE('details'),
  tijarah_share_catalogue: owner('/shop?id={provider_id}'),
  tijarah_boost_listing: MANAGE('boost'),
  tijarah_women_led_badge: owner('/?tab=home'),
  tijarah_refer_business: '/provider-onboarding',
  // Customers: discovery
  tijarah_cust_discover: shopper('/?tab=explore'),
  tijarah_cust_deals: shopper('/deals'),
  tijarah_cust_occasion: shopper('/?tab=explore'),
  tijarah_cust_women_led: shopper('/women-led'),
  tijarah_cust_new_businesses: shopper('/'),
  tijarah_cust_list_business: '/provider-onboarding',
  tijarah_cust_invite: shopper('/invite'),
  tijarah_cust_comeback: shopper('/'),
  // Owners: event updates
  tijarah_page_ready: MY_PAGE,
  tijarah_listing_created_for_you: MANAGE('details'),
  tijarah_link_changed: MY_PAGE,
  tijarah_details_updated: MANAGE('details'),
  tijarah_photo_removed: MANAGE('photos'),
  tijarah_item_hidden: MANAGE('products'),
  tijarah_review_link: MANAGE('reviews'),
  tijarah_catalogue_link: owner('/shop?id={provider_id}'),
  tijarah_verification_received: owner('/provider-onboarding/verify'),
  // Customers: event updates
  tijarah_enquiry_sent: shopper('/?tab=chats'),
  tijarah_review_posted: BUSINESS,
  tijarah_saved_business: BUSINESS,
  tijarah_saved_business_update: BUSINESS,
  tijarah_account_ready: shopper('/'),
  tijarah_invite_joined: shopper('/'),
};

/** The link button's own variable: a code per recipient, for LINK_TARGETS[name]. */
function withLinkTarget(t: StarterTemplate): StarterTemplate {
  const target = LINK_TARGETS[t.name];
  if (!target) return t;
  return {
    ...t,
    variables: [
      ...t.variables,
      {
        index: 1,
        location: 'button',
        label: 'Opens',
        source: 'app_link',
        sample: 'k3m9q2xw7a',
        target,
      },
    ],
  };
}

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
  ...OWNER_GROWTH_TEMPLATES,
  ...CUSTOMER_TEMPLATES,
  ...OWNER_UTILITY_TEMPLATES,
  ...CUSTOMER_UTILITY_TEMPLATES,
].map(withLinkTarget);
