import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceableCities1778600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enum type
    await queryRunner.query(`
      CREATE TYPE "serviceable_city_status_enum" AS ENUM ('active', 'coming_soon', 'disabled')
    `);

    // 2. Create serviceable_cities table
    await queryRunner.query(`
      CREATE TABLE "serviceable_cities" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "status" "serviceable_city_status_enum" NOT NULL DEFAULT 'coming_soon',
        "launch_date" timestamptz,
        "lat" decimal(9,6) NOT NULL,
        "lng" decimal(9,6) NOT NULL,
        "radius_km" int NOT NULL DEFAULT 50,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_serviceable_cities" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_serviceable_cities_name" UNIQUE ("name"),
        CONSTRAINT "UQ_serviceable_cities_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_serviceable_cities_status" ON "serviceable_cities" ("status")
    `);

    // 3. Create city_requests table
    await queryRunner.query(`
      CREATE TABLE "city_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "city" varchar(100) NOT NULL,
        "user_id" uuid,
        "device_id" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_city_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_city_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_city_requests_city_created" ON "city_requests" ("city", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_city_requests_user_city" ON "city_requests" ("user_id", "city")
    `);

    // 4. Seed serviceable cities
    // Pune is the only active city. All others are coming_soon.
    // Covers all major Indian cities (Tier 1, 2 & 3) for future expansion.
    await queryRunner.query(`
      INSERT INTO "serviceable_cities" ("name", "slug", "status", "lat", "lng", "radius_km") VALUES
        -- Active
        ('Pune', 'pune', 'active', 18.5204, 73.8567, 100),

        -- Maharashtra
        ('Mumbai', 'mumbai', 'coming_soon', 19.0760, 72.8777, 50),
        ('Navi Mumbai', 'navi-mumbai', 'coming_soon', 19.0330, 73.0297, 40),
        ('Thane', 'thane', 'coming_soon', 19.2183, 72.9781, 40),
        ('Nagpur', 'nagpur', 'coming_soon', 21.1458, 79.0882, 50),
        ('Nashik', 'nashik', 'coming_soon', 19.9975, 73.7898, 50),
        ('Aurangabad', 'aurangabad', 'coming_soon', 19.8762, 75.3433, 50),
        ('Solapur', 'solapur', 'coming_soon', 17.6599, 75.9064, 50),
        ('Kolhapur', 'kolhapur', 'coming_soon', 16.7050, 74.2433, 50),

        -- Karnataka
        ('Bangalore', 'bangalore', 'coming_soon', 12.9716, 77.5946, 50),
        ('Mysore', 'mysore', 'coming_soon', 12.2958, 76.6394, 50),
        ('Mangalore', 'mangalore', 'coming_soon', 12.9141, 74.8560, 50),
        ('Hubli-Dharwad', 'hubli-dharwad', 'coming_soon', 15.3647, 75.1240, 50),
        ('Belgaum', 'belgaum', 'coming_soon', 15.8497, 74.4977, 50),

        -- Tamil Nadu
        ('Chennai', 'chennai', 'coming_soon', 13.0827, 80.2707, 50),
        ('Coimbatore', 'coimbatore', 'coming_soon', 11.0168, 76.9558, 50),
        ('Madurai', 'madurai', 'coming_soon', 9.9252, 78.1198, 50),
        ('Tiruchirappalli', 'tiruchirappalli', 'coming_soon', 10.7905, 78.7047, 50),
        ('Salem', 'salem', 'coming_soon', 11.6643, 78.1460, 50),
        ('Tiruppur', 'tiruppur', 'coming_soon', 11.1085, 77.3411, 40),

        -- Kerala
        ('Kochi', 'kochi', 'coming_soon', 9.9312, 76.2673, 50),
        ('Thiruvananthapuram', 'thiruvananthapuram', 'coming_soon', 8.5241, 76.9366, 50),
        ('Kozhikode', 'kozhikode', 'coming_soon', 11.2588, 75.7804, 50),
        ('Thrissur', 'thrissur', 'coming_soon', 10.5276, 76.2144, 40),

        -- Telangana & Andhra Pradesh
        ('Hyderabad', 'hyderabad', 'coming_soon', 17.3850, 78.4867, 50),
        ('Visakhapatnam', 'visakhapatnam', 'coming_soon', 17.6868, 83.2185, 50),
        ('Vijayawada', 'vijayawada', 'coming_soon', 16.5062, 80.6480, 50),
        ('Warangal', 'warangal', 'coming_soon', 17.9784, 79.5941, 50),
        ('Guntur', 'guntur', 'coming_soon', 16.3067, 80.4365, 40),
        ('Tirupati', 'tirupati', 'coming_soon', 13.6288, 79.4192, 40),

        -- NCR & North India
        ('Delhi', 'delhi', 'coming_soon', 28.7041, 77.1025, 50),
        ('Noida', 'noida', 'coming_soon', 28.5355, 77.3910, 40),
        ('Gurgaon', 'gurgaon', 'coming_soon', 28.4595, 77.0266, 40),
        ('Faridabad', 'faridabad', 'coming_soon', 28.4089, 77.3178, 40),
        ('Ghaziabad', 'ghaziabad', 'coming_soon', 28.6692, 77.4538, 40),
        ('Greater Noida', 'greater-noida', 'coming_soon', 28.4744, 77.5040, 40),

        -- Uttar Pradesh
        ('Lucknow', 'lucknow', 'coming_soon', 26.8467, 80.9462, 50),
        ('Kanpur', 'kanpur', 'coming_soon', 26.4499, 80.3319, 50),
        ('Agra', 'agra', 'coming_soon', 27.1767, 78.0081, 50),
        ('Varanasi', 'varanasi', 'coming_soon', 25.3176, 82.9739, 50),
        ('Prayagraj', 'prayagraj', 'coming_soon', 25.4358, 81.8463, 50),
        ('Meerut', 'meerut', 'coming_soon', 28.9845, 77.7064, 40),
        ('Aligarh', 'aligarh', 'coming_soon', 27.8974, 78.0880, 40),
        ('Bareilly', 'bareilly', 'coming_soon', 28.3670, 79.4304, 40),

        -- Rajasthan
        ('Jaipur', 'jaipur', 'coming_soon', 26.9124, 75.7873, 50),
        ('Jodhpur', 'jodhpur', 'coming_soon', 26.2389, 73.0243, 50),
        ('Udaipur', 'udaipur', 'coming_soon', 24.5854, 73.7125, 50),
        ('Kota', 'kota', 'coming_soon', 25.2138, 75.8648, 40),
        ('Ajmer', 'ajmer', 'coming_soon', 26.4499, 74.6399, 40),

        -- Gujarat
        ('Ahmedabad', 'ahmedabad', 'coming_soon', 23.0225, 72.5714, 50),
        ('Surat', 'surat', 'coming_soon', 21.1702, 72.8311, 50),
        ('Vadodara', 'vadodara', 'coming_soon', 22.3072, 73.1812, 50),
        ('Rajkot', 'rajkot', 'coming_soon', 22.3039, 70.8022, 50),
        ('Gandhinagar', 'gandhinagar', 'coming_soon', 23.2156, 72.6369, 40),

        -- Madhya Pradesh
        ('Bhopal', 'bhopal', 'coming_soon', 23.2599, 77.4126, 50),
        ('Indore', 'indore', 'coming_soon', 22.7196, 75.8577, 50),
        ('Gwalior', 'gwalior', 'coming_soon', 26.2183, 78.1828, 50),
        ('Jabalpur', 'jabalpur', 'coming_soon', 23.1815, 79.9864, 50),

        -- West Bengal
        ('Kolkata', 'kolkata', 'coming_soon', 22.5726, 88.3639, 50),
        ('Howrah', 'howrah', 'coming_soon', 22.5958, 88.2636, 40),
        ('Durgapur', 'durgapur', 'coming_soon', 23.5204, 87.3119, 40),
        ('Siliguri', 'siliguri', 'coming_soon', 26.7271, 88.3953, 40),

        -- Bihar & Jharkhand
        ('Patna', 'patna', 'coming_soon', 25.6093, 85.1376, 50),
        ('Ranchi', 'ranchi', 'coming_soon', 23.3441, 85.3096, 50),
        ('Jamshedpur', 'jamshedpur', 'coming_soon', 22.8046, 86.2029, 40),

        -- Odisha
        ('Bhubaneswar', 'bhubaneswar', 'coming_soon', 20.2961, 85.8245, 50),
        ('Cuttack', 'cuttack', 'coming_soon', 20.4625, 85.8830, 40),

        -- Chhattisgarh
        ('Raipur', 'raipur', 'coming_soon', 21.2514, 81.6296, 50),

        -- Punjab & Haryana
        ('Ludhiana', 'ludhiana', 'coming_soon', 30.9010, 75.8573, 50),
        ('Amritsar', 'amritsar', 'coming_soon', 31.6340, 74.8723, 50),
        ('Jalandhar', 'jalandhar', 'coming_soon', 31.3260, 75.5762, 40),
        ('Chandigarh', 'chandigarh', 'coming_soon', 30.7333, 76.7794, 50),
        ('Panchkula', 'panchkula', 'coming_soon', 30.6942, 76.8606, 30),

        -- Uttarakhand
        ('Dehradun', 'dehradun', 'coming_soon', 30.3165, 78.0322, 50),

        -- Goa
        ('Goa', 'goa', 'coming_soon', 15.2993, 74.1240, 50),

        -- Assam & Northeast
        ('Guwahati', 'guwahati', 'coming_soon', 26.1445, 91.7362, 50),
        ('Imphal', 'imphal', 'coming_soon', 24.8170, 93.9368, 40),
        ('Shillong', 'shillong', 'coming_soon', 25.5788, 91.8933, 40),

        -- J&K
        ('Srinagar', 'srinagar', 'coming_soon', 34.0837, 74.7973, 50),
        ('Jammu', 'jammu', 'coming_soon', 32.7266, 74.8570, 50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "city_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "serviceable_cities"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "serviceable_city_status_enum"`);
  }
}
