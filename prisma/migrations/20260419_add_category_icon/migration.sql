-- Add icon column to categories table
ALTER TABLE "categories" ADD COLUMN "icon" VARCHAR(300);
ALTER TABLE "categories" ADD COLUMN "icon_storage_key" VARCHAR(300);
