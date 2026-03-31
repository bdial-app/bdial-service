-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('pending', 'live', 'rejected', 'inactive');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "IjamatStatus" AS ENUM ('pending', 'approved', 'rejected', 'not_submitted');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('active', 'removed');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewed', 'dismissed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "mobile_number" VARCHAR(15) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "gender" "Gender" NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "city" VARCHAR(100),
    "area" VARCHAR(100),
    "pincode" VARCHAR(10),
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "business_name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "contact_phone" VARCHAR(15),
    "city" VARCHAR(100) NOT NULL,
    "area" VARCHAR(100),
    "pincode" VARCHAR(10),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_women_led" BOOLEAN NOT NULL DEFAULT false,
    "community_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ListingStatus" NOT NULL DEFAULT 'pending',
    "rejection_note" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_categories" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "listing_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "aadhaar_doc_url" VARCHAR(500) NOT NULL,
    "aadhaar_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "ijamat_number" VARCHAR(50),
    "ijamat_expiry" DATE,
    "ijamat_doc_url" VARCHAR(500),
    "ijamat_status" "IjamatStatus" NOT NULL DEFAULT 'not_submitted',
    "admin_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "storage_key" VARCHAR(300) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "photo_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "star_rating" SMALLINT NOT NULL,
    "review_text" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'active',
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderated_at" TIMESTAMP(3),
    "moderated_by" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_photos" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "storage_key" VARCHAR(300) NOT NULL,

    CONSTRAINT "review_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_reports" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_number_key" ON "users"("mobile_number");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "listings_status_city_idx" ON "listings"("status", "city");

-- CreateIndex
CREATE INDEX "listings_is_women_led_status_idx" ON "listings"("is_women_led", "status");

-- CreateIndex
CREATE INDEX "listings_provider_id_idx" ON "listings"("provider_id");

-- CreateIndex
CREATE INDEX "listings_community_verified_status_idx" ON "listings"("community_verified", "status");

-- CreateIndex
CREATE INDEX "listing_categories_category_id_listing_id_idx" ON "listing_categories"("category_id", "listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_categories_listing_id_category_id_key" ON "listing_categories"("listing_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_user_id_key" ON "verifications"("user_id");

-- CreateIndex
CREATE INDEX "verifications_user_id_idx" ON "verifications"("user_id");

-- CreateIndex
CREATE INDEX "photos_listing_id_display_order_idx" ON "photos"("listing_id", "display_order");

-- CreateIndex
CREATE INDEX "products_listing_id_is_active_idx" ON "products"("listing_id", "is_active");

-- CreateIndex
CREATE INDEX "reviews_listing_id_status_idx" ON "reviews"("listing_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_listing_id_reviewer_id_key" ON "reviews"("listing_id", "reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_reports_review_id_reporter_id_key" ON "review_reports"("review_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_categories" ADD CONSTRAINT "listing_categories_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_categories" ADD CONSTRAINT "listing_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
