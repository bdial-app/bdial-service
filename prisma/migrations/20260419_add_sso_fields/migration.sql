-- Add SSO fields to users table
ALTER TABLE "users" ADD COLUMN "email" VARCHAR(150);
ALTER TABLE "users" ADD COLUMN "supabase_id" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN "google_id" VARCHAR(150);
ALTER TABLE "users" ADD COLUMN "google_email" VARCHAR(150);
ALTER TABLE "users" ADD COLUMN "google_name" VARCHAR(150);
ALTER TABLE "users" ADD COLUMN "sso_provider" VARCHAR(50);

-- Create unique indexes for SSO fields
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_supabase_id_key" ON "users"("supabase_id");
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- Create index for sso_provider for faster queries
CREATE INDEX "users_sso_provider_idx" ON "users"("sso_provider");
