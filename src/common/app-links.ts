/**
 * The public web app that WhatsApp buttons and message links point at. Its
 * /b/<business> and /go?c=<code> pages open the Tijarah app when it's
 * installed (iOS universal links / Android app links on this domain) and
 * otherwise send the person to the App Store or Google Play — never the web
 * app. APP_LINK_ORIGIN overrides it; by default it's the live website,
 * whose apple-app-site-association and assetlinks.json cover /b and /go.
 *
 * Read at call time, not import time, so .env is always loaded.
 */
export function appLinkOrigin(): string {
  return (process.env.APP_LINK_ORIGIN || 'https://www.tijarahapp.in')
    .trim()
    .replace(/\/+$/, '');
}

/** Stands in for the origin in template definitions until they're seeded. */
export const LINK_ORIGIN_TOKEN = '@@APP_LINK_ORIGIN@@';

/** Replace the origin token anywhere inside a template definition. */
export function withLinkOrigin<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value).split(LINK_ORIGIN_TOKEN).join(appLinkOrigin()),
  ) as T;
}

/** A business: opens it in the app, or the store. */
export const businessAppLink = (providerId: string) =>
  `${appLinkOrigin()}/b/${providerId}`;
