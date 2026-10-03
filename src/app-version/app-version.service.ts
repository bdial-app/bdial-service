import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog, SystemSetting } from '../entities';
import {
  APP_PLATFORMS,
  APP_VERSION_GROUP,
  AppPlatform,
  DEFAULT_VERSION,
  STORE_URLS,
  appVersionKey,
} from './app-version.constants';
import { compareVersions, parseVersion } from './app-version.util';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';

export interface PlatformVersion {
  latestVersion: string;
  minVersion: string;
  releaseNotes: string | null;
  storeUrl: string;
}

export type AppVersionConfig = Record<AppPlatform, PlatformVersion> & {
  updatedAt: Date | null;
};

/**
 * What /health/app-version answers. The shape predates this service and is
 * what every installed copy of the app already parses, so it must not change.
 */
export interface AppVersionCheck {
  platform: string | null;
  latestVersion: string;
  minSupportedVersion: string;
  currentVersion: string | null;
  updateAvailable: boolean;
  forceUpdate: boolean;
  updateUrl: string;
  releaseNotes: string | null;
}

/** Every app open asks, so the settings are held briefly rather than re-read. */
const CACHE_MS = 30_000;

const isPlatform = (p: string | null | undefined): p is AppPlatform =>
  (APP_PLATFORMS as readonly string[]).includes(p ?? '');

@Injectable()
export class AppVersionService {
  private cache: { at: number; value: AppVersionConfig } | null = null;

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settings: Repository<SystemSetting>,
    @InjectRepository(AuditLog)
    private readonly audit: Repository<AuditLog>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Per-platform versions from system_settings. Before anything is saved, the
   * old shared env values still apply, so an existing deployment behaves
   * exactly as it did until someone edits the page.
   */
  async getConfig(): Promise<AppVersionConfig> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) {
      return this.cache.value;
    }
    const rows = await this.settings.find({
      where: { group: APP_VERSION_GROUP },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const envLatest =
      this.config.get<string>('APP_LATEST_VERSION') || DEFAULT_VERSION;
    const envMin =
      this.config.get<string>('APP_MIN_VERSION') || DEFAULT_VERSION;
    const envNotes = this.config.get<string>('APP_RELEASE_NOTES') || null;

    const read = (platform: AppPlatform): PlatformVersion => {
      const notes = byKey.get(appVersionKey(platform, 'notes'));
      return {
        latestVersion:
          byKey.get(appVersionKey(platform, 'latest'))?.value || envLatest,
        minVersion: byKey.get(appVersionKey(platform, 'min'))?.value || envMin,
        // A saved empty value means "no notes", not "fall back to the env".
        releaseNotes: notes ? notes.value || null : envNotes,
        storeUrl: STORE_URLS[platform],
      };
    };

    const updatedAt = rows.length
      ? new Date(Math.max(...rows.map((r) => r.updatedAt.getTime())))
      : null;
    const value: AppVersionConfig = {
      android: read('android'),
      ios: read('ios'),
      updatedAt,
    };
    this.cache = { at: Date.now(), value };
    return value;
  }

  async check(
    platform: string | undefined,
    currentVersion: string | undefined,
  ): Promise<AppVersionCheck> {
    const current = currentVersion?.trim() || null;

    // A browser cannot update from a store, so it is never told to.
    if (!isPlatform(platform)) {
      return {
        platform: platform ?? null,
        latestVersion: current ?? DEFAULT_VERSION,
        minSupportedVersion: DEFAULT_VERSION,
        currentVersion: current,
        updateAvailable: false,
        forceUpdate: false,
        updateUrl: STORE_URLS.android,
        releaseNotes: null,
      };
    }

    const cfg = (await this.getConfig())[platform];
    const have = parseVersion(current);
    const latest = parseVersion(cfg.latestVersion);
    const min = parseVersion(cfg.minVersion);

    // An unreadable version on either side never blocks anyone.
    const forceUpdate = !!have && !!min && compareVersions(have, min) < 0;
    const updateAvailable =
      forceUpdate || (!!have && !!latest && compareVersions(have, latest) < 0);

    return {
      platform,
      latestVersion: cfg.latestVersion,
      minSupportedVersion: cfg.minVersion,
      currentVersion: current,
      updateAvailable,
      forceUpdate,
      updateUrl: cfg.storeUrl,
      releaseNotes: cfg.releaseNotes,
    };
  }

  async update(
    adminId: string,
    dto: UpdateAppVersionDto,
  ): Promise<AppVersionConfig> {
    // A minimum above the store version would block everyone, including people
    // who just installed — there would be nothing for them to update to.
    for (const platform of APP_PLATFORMS) {
      const { latestVersion, minVersion } = dto[platform];
      if (
        compareVersions(
          parseVersion(minVersion)!,
          parseVersion(latestVersion)!,
        ) > 0
      ) {
        throw new BadRequestException(
          `${platform === 'ios' ? 'iOS' : 'Android'}: minimum version ${minVersion} is higher than the store version ${latestVersion}. Nobody could satisfy it.`,
        );
      }
    }

    const before = await this.getConfig();
    const wanted: { key: string; value: string; description: string }[] = [];
    for (const platform of APP_PLATFORMS) {
      const p = dto[platform];
      const label = platform === 'ios' ? 'iOS' : 'Android';
      wanted.push(
        {
          key: appVersionKey(platform, 'latest'),
          value: p.latestVersion.trim(),
          description: `${label}: version live in the store`,
        },
        {
          key: appVersionKey(platform, 'min'),
          value: p.minVersion.trim(),
          description: `${label}: older versions must update`,
        },
        {
          key: appVersionKey(platform, 'notes'),
          value: (p.releaseNotes ?? '').trim(),
          description: `${label}: shown in the update prompt`,
        },
      );
    }

    const existing = await this.settings.find({
      where: { key: In(wanted.map((w) => w.key)) },
    });
    const byKey = new Map(existing.map((r) => [r.key, r]));
    await this.settings.save(
      wanted.map((w) => {
        const row =
          byKey.get(w.key) ??
          this.settings.create({ key: w.key, type: 'string' });
        row.value = w.value;
        row.group = APP_VERSION_GROUP;
        row.description = w.description;
        return row;
      }),
    );

    this.cache = null;
    const after = await this.getConfig();

    await this.audit.save(
      this.audit.create({
        adminId,
        action: 'update_app_version',
        entityType: 'app_version',
        entityId: null,
        previousState: { android: before.android, ios: before.ios },
        newState: { android: after.android, ios: after.ios },
        description: `App versions — Android ${after.android.latestVersion} (min ${after.android.minVersion}), iOS ${after.ios.latestVersion} (min ${after.ios.minVersion})`,
      }),
    );

    return after;
  }
}
