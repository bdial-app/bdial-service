/**
 * The rules for a slug someone types in (an owner choosing their link, or an
 * admin fixing one). Slugs the database makes on its own follow the same
 * shape — see fn_slugify in the PublicSlugs migration — and these lists must
 * match the ones there.
 */

/** Words a business can't have as its address. */
export const RESERVED_BUSINESS_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'about',
  'b',
  'c',
  'p',
  'business',
  'businesses',
  'catalogue',
  'category',
  'categories',
  'contact',
  'deals',
  'help',
  'login',
  'new',
  'privacy',
  'search',
  'shop',
  'support',
  'terms',
  'tijarah',
  'tijarah-connect',
  'tijarahapp',
  'www',
]);

/** Words a product can't have, because the business page uses them below its own address. */
export const RESERVED_PRODUCT_SLUGS = new Set([
  'about',
  'catalogue',
  'contact',
  'deals',
  'photos',
  'products',
  'reviews',
  'services',
]);

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN = 3;
export const SLUG_MAX = 60;

/** "  Pronttera Official! " → "pronttera-official". */
export function normalizeSlug(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Why a business slug can't be used, or null when its shape is fine. */
export function businessSlugProblem(slug: string): string | null {
  if (slug.length < SLUG_MIN)
    return `Use at least ${SLUG_MIN} letters or numbers`;
  if (slug.length > SLUG_MAX) return `Use at most ${SLUG_MAX} characters`;
  if (!SLUG_RE.test(slug)) return 'Use only letters, numbers and dashes';
  if (UUID_RE.test(slug)) return 'Choose a name, not an id';
  if (RESERVED_BUSINESS_SLUGS.has(slug)) return 'That name is reserved';
  return null;
}
