/**
 * Restore files from the storage backup.
 *
 *   npm run storage:restore -- [--folder verifications/] [--to-bucket <name>] [--confirm]
 *
 * Without --confirm it only reports what is missing and would be copied
 * (a dry run). With --confirm it copies those files from the backup into
 * the target bucket (S3_BUCKET unless --to-bucket is given). It never
 * overwrites or deletes a file that is already in the target, and never
 * changes the backup.
 *
 * Reads the same env vars as the API: S3_* for the target, STORAGE_BACKUP_*
 * for the backup. See src/storage-backup/README.md.
 */
import 'dotenv/config';
import { S3Client } from '@aws-sdk/client-s3';
import {
  AddOnlyBucket,
  ReadOnlyBucket,
  copyMissing,
} from '../storage-backup/bucket-copier';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name} in the environment.`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const confirm = process.argv.includes('--confirm');
  const folder = (arg('folder') ?? '').replace(/^\/+/, '');
  const toBucket = arg('to-bucket') ?? need('S3_BUCKET');
  let backupPrefix = (process.env.STORAGE_BACKUP_PREFIX ?? '').replace(
    /^\/+/,
    '',
  );
  if (backupPrefix && !backupPrefix.endsWith('/')) backupPrefix += '/';

  const backupClient = new S3Client({
    endpoint: process.env.STORAGE_BACKUP_ENDPOINT || undefined,
    region: process.env.STORAGE_BACKUP_REGION || 'auto',
    credentials: {
      accessKeyId: need('STORAGE_BACKUP_ACCESS_KEY_ID'),
      secretAccessKey: need('STORAGE_BACKUP_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: process.env.STORAGE_BACKUP_FORCE_PATH_STYLE === 'true',
  });
  const targetClient = new S3Client({
    endpoint: need('S3_ENDPOINT'),
    region: process.env.S3_REGION || 'ap-southeast-1',
    credentials: {
      accessKeyId: need('S3_ACCESS_KEY_ID'),
      secretAccessKey: need('S3_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: true,
  });

  const from = new ReadOnlyBucket(
    backupClient,
    need('STORAGE_BACKUP_BUCKET'),
    backupPrefix + folder,
  );
  const to = new AddOnlyBucket(targetClient, toBucket, folder);

  console.log(`Backup: ${from.bucket}/${from.prefix}`);
  console.log(`Target: ${to.bucket}/${to.prefix}`);
  console.log(
    confirm
      ? 'Restoring missing files…'
      : 'Dry run (add --confirm to restore).',
  );

  const result = await copyMissing(from, to, {
    concurrency: 4,
    dryRun: !confirm,
  });
  console.log(
    `In backup: ${result.scanned}. Already in target: ${result.alreadyThere}. Missing: ${result.missing.length}.`,
  );
  if (!confirm) {
    result.missing
      .slice(0, 20)
      .forEach((k) => console.log(`  would restore ${folder}${k}`));
    if (result.missing.length > 20)
      console.log(`  …and ${result.missing.length - 20} more`);
    return;
  }
  console.log(
    `Restored ${result.copied} file(s), ${(result.bytesCopied / 1_048_576).toFixed(1)} MB. Failed: ${result.failed}.`,
  );
  result.errors.forEach((e) => console.log(`  failed ${e.key}: ${e.message}`));
  if (result.failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
