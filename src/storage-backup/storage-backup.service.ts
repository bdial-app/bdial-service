import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Client } from '@aws-sdk/client-s3';
import { DataSource, Repository } from 'typeorm';
import { SystemSetting } from '../entities';
import { SystemLogsService } from '../system-logs/system-logs.service';
import {
  AddOnlyBucket,
  CopyResult,
  ReadOnlyBucket,
  copyMissing,
  copyOne,
} from './bucket-copier';

const IST = { timeZone: 'Asia/Kolkata' } as const;
const SETTINGS_GROUP = 'storage_backup';
const LAST_RUN_KEY = 'storage_backup.last_run';
/** One backup at a time across every API instance. */
const LOCK_ID = 815_402_001;

export interface BackupRun extends CopyResult {
  trigger: 'schedule' | 'manual';
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  /** Set when the run couldn't start or stopped early. */
  error?: string;
}

/**
 * Nightly copy of the storage bucket (photos, documents, chat and WhatsApp
 * media) to a separate backup bucket at another provider, so files survive
 * the bucket being emptied or deleted by mistake.
 *
 * It never changes the live bucket: it only lists and reads it (enforced by
 * ReadOnlyBucket). In the backup it only adds files, never deletes or
 * replaces one (AddOnlyBucket) — and the backup bucket itself should have
 * versioning and object lock, so not even these credentials can remove a
 * copy. Setup: src/storage-backup/README.md.
 */
@Injectable()
export class StorageBackupService {
  private readonly logger = new Logger(StorageBackupService.name);
  private running = false;

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settings: Repository<SystemSetting>,
    private readonly dataSource: DataSource,
    private readonly logs: SystemLogsService,
  ) {}

  /** Backup destination is set up (STORAGE_BACKUP_* env vars). */
  isConfigured(): boolean {
    return !!(
      process.env.STORAGE_BACKUP_BUCKET &&
      process.env.STORAGE_BACKUP_ACCESS_KEY_ID &&
      process.env.STORAGE_BACKUP_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET
    );
  }

  /** The nightly run is on unless STORAGE_BACKUP_ENABLED=false. */
  private scheduleOn(): boolean {
    return (
      this.isConfigured() && process.env.STORAGE_BACKUP_ENABLED !== 'false'
    );
  }

  private source(): ReadOnlyBucket {
    const client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
    return new ReadOnlyBucket(client, process.env.S3_BUCKET!);
  }

  private destination(): AddOnlyBucket {
    const client = new S3Client({
      endpoint: process.env.STORAGE_BACKUP_ENDPOINT || undefined,
      region: process.env.STORAGE_BACKUP_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.STORAGE_BACKUP_ACCESS_KEY_ID!,
        secretAccessKey: process.env.STORAGE_BACKUP_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: process.env.STORAGE_BACKUP_FORCE_PATH_STYLE === 'true',
    });
    const prefix = (process.env.STORAGE_BACKUP_PREFIX ?? '').replace(
      /^\/+/,
      '',
    );
    return new AddOnlyBucket(
      client,
      process.env.STORAGE_BACKUP_BUCKET!,
      prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix,
    );
  }

  /** Every night at 02:30 IST, when traffic is lowest. */
  @Cron('30 2 * * *', IST)
  async nightly(): Promise<void> {
    if (!this.scheduleOn()) return;
    await this.run('schedule').catch(() => undefined);
  }

  /** "Back up now" from the admin: starts in the background. */
  startManual(): { started: true } {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Storage backup is not set up yet');
    }
    if (this.running)
      throw new ConflictException('A backup is already running');
    void this.run('manual').catch(() => undefined);
    return { started: true };
  }

  /** Copies every file the backup doesn't have yet, and records how it went. */
  async run(trigger: BackupRun['trigger']): Promise<BackupRun> {
    const startedAt = new Date().toISOString();
    const empty: CopyResult = {
      scanned: 0,
      alreadyThere: 0,
      copied: 0,
      failed: 0,
      bytesCopied: 0,
      errors: [],
    };
    if (this.running)
      throw new ConflictException('A backup is already running');
    this.running = true;
    const qr = this.dataSource.createQueryRunner();
    let locked = false;
    try {
      await qr.connect();
      locked = !!(
        (await qr.query('SELECT pg_try_advisory_lock($1) AS locked', [
          LOCK_ID,
        ])) as { locked: boolean }[]
      )[0]?.locked;
      if (!locked) {
        // Another API instance is already backing up.
        return {
          ...empty,
          trigger,
          startedAt,
          finishedAt: startedAt,
          ok: true,
          error: 'skipped: running elsewhere',
        };
      }
      const result = await copyMissing(this.source(), this.destination(), {
        concurrency: 4,
      });
      const { missing: _missing, ...counts } = result;
      void _missing;
      const run: BackupRun = {
        ...counts,
        trigger,
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: counts.failed === 0,
      };
      await this.saveRun(run);
      return run;
    } catch (err) {
      const run: BackupRun = {
        ...empty,
        trigger,
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      await this.saveRun(run).catch(() => undefined);
      throw err;
    } finally {
      if (locked)
        await qr
          .query('SELECT pg_advisory_unlock($1)', [LOCK_ID])
          .catch(() => undefined);
      await qr.release().catch(() => undefined);
      this.running = false;
    }
  }

  private async saveRun(run: BackupRun): Promise<void> {
    const existing = await this.settings.findOne({
      where: { key: LAST_RUN_KEY },
    });
    await this.settings.save({
      ...(existing ?? {}),
      key: LAST_RUN_KEY,
      value: JSON.stringify(run),
      type: 'json',
      group: SETTINGS_GROUP,
    });
    const mb = (run.bytesCopied / 1_048_576).toFixed(1);
    const message = run.error
      ? `Storage backup failed: ${run.error}`
      : `Storage backup: ${run.copied} new file(s) copied (${mb} MB), ${run.alreadyThere} already backed up, ${run.failed} failed`;
    if (run.ok) this.logger.log(message);
    else this.logger.error(message);
    this.logs.record({
      source: 'server',
      level: run.ok ? 'info' : 'error',
      category: 'storage_backup',
      event: run.ok ? 'storage_backup_ok' : 'storage_backup_failed',
      message,
      details: { ...run, errors: run.errors.slice(0, 5) },
    });
  }

  /**
   * Makes sure a file has a copy in the backup before the app deletes it, so
   * a file uploaded and removed between two nightly runs isn't lost. Throws
   * if it can't; the caller then keeps the file. Does nothing when backup
   * isn't set up.
   */
  async ensureBackedUp(storageKey: string): Promise<void> {
    if (!this.isConfigured()) return;
    await copyOne(this.source(), this.destination(), storageKey);
  }

  async status() {
    const row = await this.settings.findOne({ where: { key: LAST_RUN_KEY } });
    let lastRun: BackupRun | null = null;
    try {
      lastRun = row ? (JSON.parse(row.value) as BackupRun) : null;
    } catch {
      lastRun = null;
    }
    return {
      configured: this.isConfigured(),
      scheduled: this.scheduleOn(),
      running: this.running,
      destination: this.isConfigured()
        ? {
            bucket: process.env.STORAGE_BACKUP_BUCKET,
            endpoint: process.env.STORAGE_BACKUP_ENDPOINT || 'AWS S3',
            prefix: process.env.STORAGE_BACKUP_PREFIX || '',
          }
        : null,
      schedule: 'Every night at 02:30 IST',
      lastRun,
    };
  }
}
