import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/**
 * Copies files between two S3-compatible buckets without ever changing the
 * one it copies from, and without ever deleting or replacing anything in the
 * one it copies to. Used by the nightly backup (live bucket → backup) and the
 * restore script (backup → a bucket that lost files).
 *
 * The guarantees are enforced here, not left to the callers: the source can
 * only be listed and read, the destination can only be listed, read and
 * added to, and an object that already exists in the destination is never
 * written again.
 */

export class StorageGuardError extends Error {}

/** A bucket the copier may only list and read. */
export class ReadOnlyBucket {
  constructor(
    private readonly client: Pick<S3Client, 'send'>,
    readonly bucket: string,
    readonly prefix = '',
  ) {}

  send(command: object): Promise<unknown> {
    if (
      !(command instanceof ListObjectsV2Command) &&
      !(command instanceof GetObjectCommand) &&
      !(command instanceof HeadObjectCommand)
    ) {
      throw new StorageGuardError(
        `Refused ${(command as { constructor: { name: string } }).constructor.name} on read-only bucket ${this.bucket}`,
      );
    }
    return this.client.send(command as never);
  }
}

/** A bucket the copier may list, read and add new objects to — never delete or overwrite. */
export class AddOnlyBucket {
  constructor(
    private readonly client: Pick<S3Client, 'send'>,
    readonly bucket: string,
    readonly prefix = '',
  ) {}

  send(command: object): Promise<unknown> {
    if (
      !(command instanceof ListObjectsV2Command) &&
      !(command instanceof GetObjectCommand) &&
      !(command instanceof HeadObjectCommand) &&
      !(command instanceof PutObjectCommand)
    ) {
      throw new StorageGuardError(
        `Refused ${(command as { constructor: { name: string } }).constructor.name} on add-only bucket ${this.bucket}`,
      );
    }
    return this.client.send(command as never);
  }
}

export interface ObjectInfo {
  size: number;
}

/** Every object under the bucket's prefix, keyed by the path after the prefix. */
export async function listObjects(
  b: ReadOnlyBucket | AddOnlyBucket,
): Promise<Map<string, ObjectInfo>> {
  const out = new Map<string, ObjectInfo>();
  let token: string | undefined;
  do {
    const page = (await b.send(
      new ListObjectsV2Command({
        Bucket: b.bucket,
        Prefix: b.prefix || undefined,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    )) as {
      Contents?: { Key?: string; Size?: number }[];
      IsTruncated?: boolean;
      NextContinuationToken?: string;
    };
    for (const o of page.Contents ?? []) {
      if (!o.Key || o.Key.endsWith('/')) continue; // folder placeholders
      out.set(o.Key.slice(b.prefix.length), { size: o.Size ?? 0 });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function exists(b: AddOnlyBucket, key: string): Promise<boolean> {
  try {
    await b.send(
      new HeadObjectCommand({ Bucket: b.bucket, Key: b.prefix + key }),
    );
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    const name = (err as { name?: string }).name;
    if (status === 404 || name === 'NotFound' || name === 'NoSuchKey')
      return false;
    throw err;
  }
}

/**
 * Copies one object unless the destination already has it. Returns the bytes
 * copied (0 when it was already there).
 */
export async function copyOne(
  from: ReadOnlyBucket,
  to: AddOnlyBucket,
  key: string,
): Promise<number> {
  if (await exists(to, key)) return 0;
  const res = (await from.send(
    new GetObjectCommand({ Bucket: from.bucket, Key: from.prefix + key }),
  )) as {
    Body?: { transformToByteArray(): Promise<Uint8Array> };
    ContentType?: string;
    CacheControl?: string;
    LastModified?: Date;
    ETag?: string;
  };
  if (!res.Body) throw new Error(`Empty object: ${key}`);
  const body = Buffer.from(await res.Body.transformToByteArray());
  await to.send(
    new PutObjectCommand({
      Bucket: to.bucket,
      Key: to.prefix + key,
      Body: body,
      ContentType: res.ContentType,
      CacheControl: res.CacheControl,
      // Kept so a restore can tell when and what the original was.
      Metadata: {
        'source-bucket': from.bucket,
        'source-last-modified': res.LastModified?.toISOString() ?? '',
        'source-etag': (res.ETag ?? '').replace(/"/g, ''),
      },
    }),
  );
  return body.length;
}

export interface CopyResult {
  scanned: number;
  alreadyThere: number;
  copied: number;
  failed: number;
  bytesCopied: number;
  /** The first few failures, for the log. */
  errors: { key: string; message: string }[];
}

/**
 * Copies every object the destination doesn't have yet. Objects already in
 * the destination are left alone, even if they differ: files here are stored
 * under new random names and never edited, so a same-named object is the
 * same file, and a backup copy must never be replaced.
 */
export async function copyMissing(
  from: ReadOnlyBucket,
  to: AddOnlyBucket,
  opts: { concurrency?: number; dryRun?: boolean } = {},
): Promise<CopyResult & { missing: string[] }> {
  const [source, dest] = await Promise.all([
    listObjects(from),
    listObjects(to),
  ]);
  const missing = [...source.keys()].filter((k) => !dest.has(k)).sort();
  const result: CopyResult & { missing: string[] } = {
    scanned: source.size,
    alreadyThere: source.size - missing.length,
    copied: 0,
    failed: 0,
    bytesCopied: 0,
    errors: [],
    missing,
  };
  if (opts.dryRun) return result;

  let next = 0;
  const worker = async () => {
    while (next < missing.length) {
      const key = missing[next++];
      try {
        result.bytesCopied += await copyOne(from, to, key);
        result.copied++;
      } catch (err) {
        if (err instanceof StorageGuardError) throw err;
        result.failed++;
        if (result.errors.length < 10) {
          result.errors.push({
            key,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(opts.concurrency ?? 4, 16)) },
      worker,
    ),
  );
  return result;
}
