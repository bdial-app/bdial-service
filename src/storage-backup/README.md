# Storage backup

The app keeps every uploaded file in one Supabase Storage bucket (`S3_BUCKET`):
business photos, product photos, banners, **identity documents**
(`verifications/`), **chat media** (`chat-media/`) and **WhatsApp media**
(`whatsapp-media/`).

Supabase's database backups do **not** include the files in Storage. If the
bucket is emptied or deleted, the files are gone. This module keeps a second
copy at a different provider.

## What it does

- **Every night at 02:30 IST** it copies every file the backup doesn't have yet
  into the backup bucket. Admins can also start a run from the Storage Backup
  page.
- **Before the app deletes a file** (an old photo replaced by a new one, for
  example), it first makes sure the backup has a copy. If that copy fails, the
  file is kept.
- **Files in `verifications/`, `chat-media/` and `whatsapp-media/` are never
  deleted by the app.**
- Every run is written to the admin Logs (`storage_backup`), and a failed run
  is logged as an error.

What it never does:

- It never writes to, changes or deletes anything in the live bucket. The code
  only lets it list and read that bucket (`ReadOnlyBucket` in
  `bucket-copier.ts`); any other request is refused.
- It never deletes or overwrites anything in the backup. It can only add new
  files (`AddOnlyBucket`).

## One-time setup (about 15 minutes)

Use a **different provider and account** from Supabase, so a single mistake or
a single compromised login can't remove both copies. AWS S3 in Mumbai
(`ap-south-1`) keeps the copy in India.

1. **Create the bucket.** In AWS S3, create a bucket such as
   `tijarah-storage-backup` in `ap-south-1`, with:
   - **Block all public access** turned on;
   - **Bucket Versioning** turned on;
   - **Object Lock** turned on, with default retention in **Compliance** mode
     for **90 days**. Nobody, not even the account owner, can delete a file in
     its first 90 days.
   - **Default encryption** set to SSE-S3.
2. **Optional: control how long copies are kept.** Add a lifecycle rule that
   deletes *noncurrent* versions after 180 days.
3. **Create an access key that can only add and read.** Create an IAM user
   such as `tijarah-backup-writer` with only this policy. It has no delete
   permission at all.

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:ListBucket"],
         "Resource": "arn:aws:s3:::tijarah-storage-backup"
       },
       {
         "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject"],
         "Resource": "arn:aws:s3:::tijarah-storage-backup/*"
       }
     ]
   }
   ```

4. **Add the key to the API's environment** (production and UAT), then
   redeploy:

   ```
   STORAGE_BACKUP_BUCKET=tijarah-storage-backup
   STORAGE_BACKUP_REGION=ap-south-1
   STORAGE_BACKUP_ACCESS_KEY_ID=...
   STORAGE_BACKUP_SECRET_ACCESS_KEY=...
   # optional
   STORAGE_BACKUP_PREFIX=prod/          # keep prod and uat apart in one bucket
   STORAGE_BACKUP_ENABLED=false         # pause the nightly run
   STORAGE_BACKUP_ENDPOINT=...          # only for non-AWS providers (R2, B2)
   STORAGE_BACKUP_FORCE_PATH_STYLE=true # some non-AWS providers need this
   ```

5. **Run the first backup.** In the admin app, open System → Storage Backup
   and press **Back up now**. The first run copies everything; after that,
   only new files are copied.

Cloudflare R2 or Backblaze B2 also work, using `STORAGE_BACKUP_ENDPOINT`. If
you use one, turn on its bucket lock or retention rules too.

## Restoring

From `bdial-service`, with the same env vars:

```bash
# See what is missing from the live bucket (changes nothing)
npm run storage:restore

# Only one folder
npm run storage:restore -- --folder verifications/

# Copy the missing files back (never overwrites a file that exists)
npm run storage:restore -- --confirm

# Restore into a new bucket instead (for example, if the old one was deleted)
npm run storage:restore -- --to-bucket tijarah-restored --confirm
```

If the bucket itself was deleted, first create a new bucket with the **same
name** in Supabase, set it to public as before, then run the restore with
`--confirm`. Existing links keep working because the file paths are the same.
