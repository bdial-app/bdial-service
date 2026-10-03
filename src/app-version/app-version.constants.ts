export type AppPlatform = 'android' | 'ios';

export const APP_PLATFORMS: readonly AppPlatform[] = ['android', 'ios'];

/** Where each platform's settings live in system_settings. */
export const APP_VERSION_GROUP = 'app_version';
export const appVersionKey = (
  platform: AppPlatform,
  field: 'latest' | 'min' | 'notes',
) => `${APP_VERSION_GROUP}.${platform}.${field}`;

/**
 * The live store listings. Hard-coded on purpose — the env fallbacks these
 * replace pointed at a Play package that does not exist (com.tijarah.app) and
 * an App Store placeholder (id000000000), so every "Update now" led nowhere.
 */
export const STORE_URLS: Record<AppPlatform, string> = {
  android:
    'https://play.google.com/store/apps/details?id=com.pronttera.tijarah',
  ios: 'https://apps.apple.com/app/id6772507338',
};

/**
 * Accepts 1, 1.2, 1.2.3 and Android's zero-padded "1.0.03". Anything else is
 * refused on save, and ignored when a client reports it — a version we cannot
 * read must never be the reason someone is locked out of the app.
 */
export const VERSION_PATTERN = /^\d{1,4}(\.\d{1,4}){0,2}$/;

export const DEFAULT_VERSION = '1.0.0';
