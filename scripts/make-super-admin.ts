/**
 * CLI script to create or promote a user to super_admin.
 *
 * Usage:
 *   npx ts-node scripts/make-super-admin.ts <mobile_number> [name]
 *
 * Examples:
 *   npx ts-node scripts/make-super-admin.ts 9876543210 "Adeeb Admin"
 *   npx ts-node scripts/make-super-admin.ts 9876543210
 *
 * If the user already exists, they are promoted to super_admin.
 * If not, a new user is created with role super_admin.
 *
 * Requires: .env file with DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME
 *           or DATABASE_URL set.
 */
import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const mobile = process.argv[2];
  const name = process.argv[3] || 'Super Admin';

  if (!mobile) {
    console.error('Usage: npx ts-node scripts/make-super-admin.ts <mobile_number> [name]');
    process.exit(1);
  }

  // Build connection config from env
  const dbUrl = process.env.DATABASE_URL;
  const clientConfig = dbUrl
    ? { connectionString: dbUrl, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT ?? '6543', 10),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME ?? 'postgres',
        ssl: { rejectUnauthorized: false },
      };

  const client = new Client(clientConfig);
  await client.connect();

  try {
    // Check if user exists
    const existing = await client.query(
      'SELECT id, name, role, status FROM users WHERE mobile_number = $1',
      [mobile],
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.role === 'super_admin') {
        console.log(`✓ User "${user.name}" (${mobile}) is already super_admin.`);
        return;
      }
      // Promote
      await client.query(
        "UPDATE users SET role = 'super_admin' WHERE id = $1",
        [user.id],
      );
      console.log(`✓ Promoted "${user.name}" (${mobile}) from "${user.role}" → super_admin`);
    } else {
      // Create new user
      const result = await client.query(
        `INSERT INTO users (mobile_number, name, role, status, gender, created_at, updated_at)
         VALUES ($1, $2, 'super_admin', 'active', 'other', NOW(), NOW())
         RETURNING id, name`,
        [mobile, name],
      );
      console.log(`✓ Created super_admin "${result.rows[0].name}" (${mobile}) with id: ${result.rows[0].id}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
