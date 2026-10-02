import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Category, Product, Provider, ProviderCategory } from '../entities';

/**
 * What a shared link shows when the app is not installed. Everything here is
 * public listing data — the same fields the listing screen shows to a signed
 * out visitor — because this page is served to anyone holding the link.
 */
export interface LinkPreview {
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Where the app is asked to go, as a custom-scheme URL. */
  appUrl: string;
}

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.pronttera.tijarah';
const APP_STORE_URL = 'https://apps.apple.com/app/id6772507338';

/** An id we are willing to put in a query — the app only ever mints uuids. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const money = (amount: number | null, currency: string | null) => {
  if (amount == null || Number(amount) <= 0) return 'Price on request';
  const symbol = !currency || currency === 'INR' ? '₹' : `${currency} `;
  return `${symbol}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

@Injectable()
export class ShareLinksService {
  constructor(
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProviderCategory)
    private readonly providerCategories: Repository<ProviderCategory>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  /** The business's categories, best-effort — a preview is never worth failing over. */
  private async categoryNames(providerId: string): Promise<string[]> {
    try {
      const links = await this.providerCategories.find({
        where: { providerId },
        take: 2,
      });
      if (!links.length) return [];
      const rows = await this.categories.find({
        where: { id: In(links.map((l) => l.categoryId)) },
      });
      return rows.map((c) => c.name).filter(Boolean);
    } catch {
      return [];
    }
  }

  async business(id: string): Promise<LinkPreview | null> {
    if (!UUID.test(id)) return null;
    const p = await this.providers.findOne({ where: { id } });
    // A suspended or disabled listing is not shown to the public.
    if (!p || p.status === 'suspended' || p.status === 'disabled') return null;

    const where = [p.area, p.city].filter(Boolean).join(', ');
    const categories = await this.categoryNames(p.id);
    return {
      title: p.brandName,
      subtitle:
        [categories.join(' · '), where].filter(Boolean).join(' · ') || null,
      description: p.description,
      imageUrl: p.profilePhotoUrl || p.websiteLogoUrl || null,
      appUrl: `tijarah://b/${p.id}`,
    };
  }

  async product(id: string): Promise<LinkPreview | null> {
    if (!UUID.test(id)) return null;
    const item = await this.products.findOne({ where: { id } });
    if (!item || item.isActive === false) return null;
    const p = await this.providers.findOne({ where: { id: item.providerId } });
    if (!p || p.status === 'suspended' || p.status === 'disabled') return null;

    const kind = item.productType === 'service' ? 'Service' : 'Product';
    return {
      title: item.name,
      subtitle: `${money(item.price, item.currency)} · ${kind} · ${p.brandName}`,
      description: item.description,
      imageUrl:
        item.photoUrls?.find(Boolean) ||
        item.photoUrl ||
        p.profilePhotoUrl ||
        null,
      appUrl: `tijarah://p/${item.id}`,
    };
  }

  /**
   * The page a link lands on when the app did not take it. Phones are sent to
   * their own store after a moment; everyone else just sees both buttons, since
   * bouncing a desktop browser to a mobile store helps nobody.
   */
  page(preview: LinkPreview, canonicalUrl: string): string {
    const e = (v: string | null | undefined) =>
      (v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const blurb =
      preview.description?.replace(/\s+/g, ' ').trim().slice(0, 200) ?? '';
    const ogDescription =
      [preview.subtitle, blurb].filter(Boolean).join(' — ') ||
      'On Tijarah Connect';

    return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(preview.title)} · Tijarah Connect</title>
<meta name="description" content="${e(ogDescription)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tijarah Connect">
<meta property="og:title" content="${e(preview.title)}">
<meta property="og:description" content="${e(ogDescription)}">
<meta property="og:url" content="${e(canonicalUrl)}">
${preview.imageUrl ? `<meta property="og:image" content="${e(preview.imageUrl)}">` : ''}
<meta name="twitter:card" content="${preview.imageUrl ? 'summary_large_image' : 'summary'}">
<style>
:root{--brand:#1a1799;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
  font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:#f8fafc}
.card{width:100%;max-width:420px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:32px 24px;text-align:center;
  box-shadow:0 1px 3px rgba(15,23,42,.06)}
img.logo{width:132px;height:132px;border-radius:50%;object-fit:cover;border:1px solid var(--line);background:#fff}
h1{font-size:26px;line-height:1.25;margin:20px 0 6px}
.sub{color:var(--muted);font-size:15px;margin:0 0 14px}
.desc{font-size:15px;color:#334155;margin:0 0 24px}
a.btn{display:block;padding:14px 20px;border-radius:12px;text-decoration:none;font-weight:700;margin-top:10px}
a.primary{background:var(--brand);color:#fff}
a.store{background:#f1f5f9;color:var(--ink);border:1px solid var(--line)}
.note{margin-top:20px;font-size:13px;color:var(--muted)}
@media(prefers-color-scheme:dark){
  body{background:#0b1120;color:#e2e8f0}
  .card{background:#111827;border-color:#1f2937}
  .desc{color:#cbd5e1}
  a.store{background:#1f2937;color:#e2e8f0;border-color:#374151}
}
</style>
</head><body>
<main class="card">
  ${preview.imageUrl ? `<img class="logo" src="${e(preview.imageUrl)}" alt="">` : ''}
  <h1>${e(preview.title)}</h1>
  ${preview.subtitle ? `<p class="sub">${e(preview.subtitle)}</p>` : ''}
  ${blurb ? `<p class="desc">${e(blurb)}</p>` : ''}
  <a class="btn primary" id="open" href="${e(preview.appUrl)}">Open in the app</a>
  <a class="btn store" id="android" href="${PLAY_STORE_URL}">Get it on Google Play</a>
  <a class="btn store" id="ios" href="${APP_STORE_URL}">Download on the App Store</a>
  <p class="note">Tijarah Connect is free. The link opens straight to this listing once the app is installed.</p>
</main>
<script>
(function () {
  var ua = navigator.userAgent || "";
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  var android = /Android/.test(ua);
  // Only one store makes sense on a phone; a desktop keeps both.
  if (ios) document.getElementById("android").remove();
  if (android) document.getElementById("ios").remove();
  if (!ios && !android) { document.getElementById("open").remove(); return; }
  // The app link did not catch this, so the app is almost certainly missing.
  // Give the custom scheme one chance, then hand over to the store.
  var store = ios ? ${JSON.stringify(APP_STORE_URL)} : ${JSON.stringify(PLAY_STORE_URL)};
  var left = false;
  document.addEventListener("visibilitychange", function () { if (document.hidden) left = true; });
  window.location.href = ${JSON.stringify(preview.appUrl)};
  setTimeout(function () { if (!left) window.location.replace(store); }, 1500);
})();
</script>
</body></html>`;
  }

  /** Shown when an id is unknown, suspended, or simply mistyped. */
  notFoundPage(): string {
    return this.page(
      {
        title: 'Tijarah Connect',
        subtitle: 'This listing is no longer available',
        description:
          'Find shops, services and home businesses near you in the free Tijarah Connect app.',
        imageUrl: null,
        appUrl: 'tijarah://',
      },
      '',
    );
  }
}
