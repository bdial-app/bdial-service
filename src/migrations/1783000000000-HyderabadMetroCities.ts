import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Secunderabad and the rest of the Hyderabad metro, by name.
 *
 * Hyderabad was already active with a 50 km radius, and checkServiceability
 * falls back to a Haversine check, so every one of these places already passed
 * on GPS. What they could not do is match by name: a client that sends
 * `city=Secunderabad` with no coordinates got "not serviceable", and none of
 * them appeared in the city list people pick from. These rows fix both.
 *
 * All eleven sit inside Hyderabad's existing radius (6–29 km from its centre),
 * so this widens no geography — it only puts the names people actually use on
 * the map. Radii are small for that reason, and overlap on purpose: the check
 * takes the first active city within range, whichever that is.
 *
 * Written so it can run twice: a slug that is already there is switched to
 * active and left otherwise alone.
 */
export class HyderabadMetroCities1783000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "serviceable_cities" ("name", "slug", "status", "lat", "lng", "radius_km") VALUES
        ('Secunderabad', 'secunderabad', 'active', 17.439900, 78.498300, 25),
        ('Kukatpally',   'kukatpally',   'active', 17.484900, 78.413800, 15),
        ('Madhapur',     'madhapur',     'active', 17.443500, 78.377200, 15),
        ('Gachibowli',   'gachibowli',   'active', 17.440100, 78.348900, 15),
        ('Uppal',        'uppal',        'active', 17.405600, 78.558900, 15),
        ('LB Nagar',     'lb-nagar',     'active', 17.345700, 78.552200, 15),
        ('Alwal',        'alwal',        'active', 17.502100, 78.510000, 15),
        ('Medchal',      'medchal',      'active', 17.628800, 78.481400, 20),
        ('Shamshabad',   'shamshabad',   'active', 17.240300, 78.429400, 20),
        ('Ghatkesar',    'ghatkesar',    'active', 17.450600, 78.683300, 20),
        ('Patancheru',   'patancheru',   'active', 17.530000, 78.264400, 20)
      ON CONFLICT ("slug") DO UPDATE SET "status" = 'active', "updated_at" = now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "serviceable_cities" WHERE "slug" IN (
        'secunderabad', 'kukatpally', 'madhapur', 'gachibowli', 'uppal',
        'lb-nagar', 'alwal', 'medchal', 'shamshabad', 'ghatkesar', 'patancheru'
      )
    `);
  }
}
