import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Readable public addresses for businesses and their products:
 *
 *   /business/<provider slug>                  e.g. /business/pronttera
 *   /business/<provider slug>/<product slug>   e.g. /business/pronttera/black-nida-abaya
 *
 * A business slug is unique across the platform; a product slug is unique
 * within its business. Both are made by the database when a row is inserted
 * without one, so every way in (onboarding, the admin app, bulk imports, an
 * older API build still running against this database) gets a slug.
 *
 * A slug never changes when the name does, so a link once shared keeps
 * working. When a slug is changed on purpose, the old one is kept in
 * slug_redirects and still leads to the same listing, and nobody else can
 * take it.
 */
export class PublicSlugs1782000000000 implements MigrationInterface {
  name = 'PublicSlugs1782000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "slug" varchar(80)`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "slug" varchar(90)`,
    );
    // Before the backfill, so each lookup it makes is an index hit.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_providers_slug" ON "providers" ("slug")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_products_provider_slug" ON "products" ("provider_id", "slug")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "slug_redirects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "kind" varchar(10) NOT NULL,
        -- The business a product slug belongs to; null for a business slug.
        "scope_id" uuid,
        "old_slug" varchar(90) NOT NULL,
        "target_id" uuid NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_slug_redirects_old"
        ON "slug_redirects" ("kind", COALESCE("scope_id", '00000000-0000-0000-0000-000000000000'::uuid), "old_slug")
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_slug_redirects_target" ON "slug_redirects" ("target_id")`,
    );

    // "Ali's Café & Bakery" → "alis-cafe-and-bakery". At most 60 characters,
    // cut at a word.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_slugify(input text)
      RETURNS text AS $$
      DECLARE
        s text := lower(coalesce(input, ''));
      BEGIN
        s := translate(s,
          'àáâãäåāăąçćčďèéêëēėęěìíîïīįıñńňòóôõöøōőùúûüūůűųýÿžźżśšşğł',
          'aaaaaaaaacccdeeeeeeeeiiiiiiinnnooooooooouuuuuuuuyyzzzsssgl');
        s := replace(s, '&', ' and ');
        s := regexp_replace(s, '[''’\`]', '', 'g');
        s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
        s := btrim(s, '-');
        IF length(s) > 60 THEN
          IF substr(s, 61, 1) = '-' THEN
            s := left(s, 60);
          ELSE
            s := left(s, 60);
            IF position('-' IN s) > 0 THEN
              s := regexp_replace(s, '-[^-]*$', '');
            END IF;
          END IF;
          s := btrim(s, '-');
        END IF;
        RETURN s;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    // Slugs a business may not have: words that would read as Tijarah's own
    // page, or that a later page might need.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_provider_slug_taken(p_slug text, p_id uuid)
      RETURNS boolean AS $$
        SELECT p_slug = ANY (ARRAY[
            'admin', 'api', 'app', 'about', 'b', 'c', 'p', 'business', 'businesses',
            'catalogue', 'category', 'categories', 'contact', 'deals', 'help', 'login',
            'new', 'privacy', 'search', 'shop', 'support', 'terms', 'tijarah',
            'tijarah-connect', 'tijarahapp', 'www'
          ])
          OR EXISTS (SELECT 1 FROM providers WHERE slug = p_slug AND id IS DISTINCT FROM p_id)
          OR EXISTS (
            SELECT 1 FROM slug_redirects
            WHERE kind = 'provider' AND scope_id IS NULL AND old_slug = p_slug
              AND target_id IS DISTINCT FROM p_id
          )
      $$ LANGUAGE sql STABLE
    `);

    // The brand name; if that's taken, the brand name with the area, then the
    // city, then a number. A name with no Latin letters falls back to where
    // the business is.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_provider_slug(p_id uuid, p_brand text, p_area text, p_city text)
      RETURNS text AS $$
      DECLARE
        base text := fn_slugify(p_brand);
        area_s text := fn_slugify(p_area);
        city_s text := fn_slugify(p_city);
        candidate text;
        n int := 2;
      BEGIN
        IF base = '' THEN base := fn_slugify(concat_ws(' ', p_area, p_city, 'business')); END IF;
        IF base = '' THEN base := 'business'; END IF;

        IF NOT fn_provider_slug_taken(base, p_id) THEN RETURN base; END IF;
        IF area_s <> '' AND base NOT LIKE '%-' || area_s THEN
          candidate := base || '-' || area_s;
          IF NOT fn_provider_slug_taken(candidate, p_id) THEN RETURN candidate; END IF;
        END IF;
        IF city_s <> '' AND city_s <> area_s AND base NOT LIKE '%-' || city_s THEN
          candidate := base || '-' || city_s;
          IF NOT fn_provider_slug_taken(candidate, p_id) THEN RETURN candidate; END IF;
        END IF;
        LOOP
          candidate := base || '-' || n;
          IF NOT fn_provider_slug_taken(candidate, p_id) THEN RETURN candidate; END IF;
          n := n + 1;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql VOLATILE
    `);

    // Product slugs share the business's address, so the words a business
    // page may use under it are kept free.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_product_slug_taken(p_slug text, p_provider uuid, p_id uuid)
      RETURNS boolean AS $$
        SELECT p_slug = ANY (ARRAY[
            'about', 'catalogue', 'contact', 'deals', 'photos', 'products', 'reviews', 'services'
          ])
          OR EXISTS (
            SELECT 1 FROM products
            WHERE provider_id = p_provider AND slug = p_slug AND id IS DISTINCT FROM p_id
          )
          OR EXISTS (
            SELECT 1 FROM slug_redirects
            WHERE kind = 'product' AND scope_id = p_provider AND old_slug = p_slug
              AND target_id IS DISTINCT FROM p_id
          )
      $$ LANGUAGE sql STABLE
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_product_slug(p_id uuid, p_provider uuid, p_name text)
      RETURNS text AS $$
      DECLARE
        base text := fn_slugify(p_name);
        candidate text;
        n int := 2;
      BEGIN
        IF base = '' THEN base := 'item'; END IF;
        IF NOT fn_product_slug_taken(base, p_provider, p_id) THEN RETURN base; END IF;
        LOOP
          candidate := base || '-' || n;
          IF NOT fn_product_slug_taken(candidate, p_provider, p_id) THEN RETURN candidate; END IF;
          n := n + 1;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql VOLATILE
    `);

    // Fill in a missing slug on insert, or when one is cleared.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_providers_fill_slug()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
          NEW.slug := fn_provider_slug(NEW.id, NEW.brand_name, NEW.area, NEW.city);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_products_fill_slug()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
          NEW.slug := fn_product_slug(NEW.id, NEW.provider_id, NEW.name);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // When a slug changes, the old one keeps pointing at the same listing. A
    // listing taking back one of its own old slugs drops that redirect.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_providers_keep_old_slug()
      RETURNS trigger AS $$
      BEGIN
        IF OLD.slug IS NOT NULL AND OLD.slug IS DISTINCT FROM NEW.slug THEN
          DELETE FROM slug_redirects
            WHERE kind = 'provider' AND scope_id IS NULL AND old_slug = NEW.slug;
          INSERT INTO slug_redirects (kind, scope_id, old_slug, target_id)
            VALUES ('provider', NULL, OLD.slug, NEW.id)
            ON CONFLICT (kind, (COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)), old_slug)
            DO UPDATE SET target_id = EXCLUDED.target_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_products_keep_old_slug()
      RETURNS trigger AS $$
      BEGIN
        IF OLD.slug IS NOT NULL AND OLD.slug IS DISTINCT FROM NEW.slug THEN
          DELETE FROM slug_redirects
            WHERE kind = 'product' AND scope_id = NEW.provider_id AND old_slug = NEW.slug;
          INSERT INTO slug_redirects (kind, scope_id, old_slug, target_id)
            VALUES ('product', OLD.provider_id, OLD.slug, NEW.id)
            ON CONFLICT (kind, (COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)), old_slug)
            DO UPDATE SET target_id = EXCLUDED.target_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_providers_fill_slug ON "providers"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_providers_fill_slug
        BEFORE INSERT OR UPDATE OF slug ON "providers"
        FOR EACH ROW EXECUTE FUNCTION fn_providers_fill_slug()
    `);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_providers_keep_old_slug ON "providers"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_providers_keep_old_slug
        AFTER UPDATE OF slug ON "providers"
        FOR EACH ROW EXECUTE FUNCTION fn_providers_keep_old_slug()
    `);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_products_fill_slug ON "products"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_products_fill_slug
        BEFORE INSERT OR UPDATE OF slug ON "products"
        FOR EACH ROW EXECUTE FUNCTION fn_products_fill_slug()
    `);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_products_keep_old_slug ON "products"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER trg_products_keep_old_slug
        AFTER UPDATE OF slug ON "products"
        FOR EACH ROW EXECUTE FUNCTION fn_products_keep_old_slug()
    `);

    // Existing listings, oldest first, so the business that has been here
    // longest gets the plain name. One row at a time, so each one sees the
    // slugs given out before it.
    await queryRunner.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN SELECT id FROM providers WHERE slug IS NULL ORDER BY created_at, id LOOP
          UPDATE providers SET slug = NULL WHERE id = r.id;
        END LOOP;
        FOR r IN
          SELECT id FROM products WHERE slug IS NULL
          ORDER BY provider_id, is_active DESC, display_order, created_at, id
        LOOP
          UPDATE products SET slug = NULL WHERE id = r.id;
        END LOOP;
      END $$
    `);

    await queryRunner.query(
      `ALTER TABLE "providers" ALTER COLUMN "slug" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_products_keep_old_slug ON "products"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_products_fill_slug ON "products"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_providers_keep_old_slug ON "providers"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_providers_fill_slug ON "providers"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS fn_products_keep_old_slug()`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS fn_providers_keep_old_slug()`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_products_fill_slug()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_providers_fill_slug()`);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS fn_product_slug(uuid, uuid, text)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS fn_product_slug_taken(text, uuid, uuid)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS fn_provider_slug(uuid, text, text, text)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS fn_provider_slug_taken(text, uuid)`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_slugify(text)`);
    await queryRunner.query(`DROP TABLE IF EXISTS "slug_redirects"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_products_provider_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_providers_slug"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "slug"`,
    );
    await queryRunner.query(
      `ALTER TABLE "providers" DROP COLUMN IF EXISTS "slug"`,
    );
  }
}
