/*
  Warnings:

  - You are about to drop the column `listing_id` on the `photos` table. All the data in the column will be lost.
  - You are about to drop the column `listing_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `listing_id` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the `listing_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `listings` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[provider_id,reviewer_id]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `provider_id` to the `photos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_id` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_id` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('active', 'inactive');

-- DropForeignKey
ALTER TABLE "listing_categories" DROP CONSTRAINT "listing_categories_category_id_fkey";

-- DropForeignKey
ALTER TABLE "listing_categories" DROP CONSTRAINT "listing_categories_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "listings" DROP CONSTRAINT "listings_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "photos" DROP CONSTRAINT "photos_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_listing_id_fkey";

-- DropIndex
DROP INDEX "photos_listing_id_display_order_idx";

-- DropIndex
DROP INDEX "products_listing_id_is_active_idx";

-- DropIndex
DROP INDEX "reviews_listing_id_reviewer_id_key";

-- DropIndex
DROP INDEX "reviews_listing_id_status_idx";

-- AlterTable
ALTER TABLE "photos" DROP COLUMN "listing_id",
ADD COLUMN     "provider_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "listing_id",
ADD COLUMN     "provider_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "listing_id",
ADD COLUMN     "provider_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "verifications" ADD COLUMN     "status" "VerificationStatus" NOT NULL DEFAULT 'pending';

-- DropTable
DROP TABLE "listing_categories";

-- DropTable
DROP TABLE "listings";

-- DropEnum
DROP TYPE "ListingStatus";

-- CreateTable
CREATE TABLE "provider_categories" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "provider_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand_name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" VARCHAR(100) NOT NULL,
    "area" VARCHAR(100),
    "pincode" VARCHAR(10),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "contact_number" VARCHAR(15) NOT NULL,
    "open_time" TIME,
    "close_time" TIME,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "profile_photo_url" VARCHAR(500),
    "is_women_lead" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProviderStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_categories_category_id_provider_id_idx" ON "provider_categories"("category_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_categories_provider_id_category_id_key" ON "provider_categories"("provider_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "providers_user_id_key" ON "providers"("user_id");

-- CreateIndex
CREATE INDEX "photos_provider_id_display_order_idx" ON "photos"("provider_id", "display_order");

-- CreateIndex
CREATE INDEX "products_provider_id_is_active_idx" ON "products"("provider_id", "is_active");

-- CreateIndex
CREATE INDEX "reviews_provider_id_status_idx" ON "reviews"("provider_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_provider_id_reviewer_id_key" ON "reviews"("provider_id", "reviewer_id");

-- AddForeignKey
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
