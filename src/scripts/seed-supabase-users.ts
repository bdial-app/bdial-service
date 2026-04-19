/**
 * Seed Supabase Auth users to match the seed.sql database users.
 *
 * Usage:
 *   npx ts-node src/scripts/seed-supabase-users.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: string;
}

// Must match the UUIDs in seed.sql
const SEED_USERS: SeedUser[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', email: 'adeeb@tijarahconnect.com',   phone: '+919876543210', name: 'Adeeb Shah',          role: 'admin' },
  { id: 'a0000000-0000-0000-0000-000000000002', email: 'fatema.b@example.com',        phone: '+919876543211', name: 'Fatema Bohra',        role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000003', email: 'sakina.r@example.com',        phone: '+919876543212', name: 'Sakina Rangwala',     role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000004', email: 'murtaza.k@example.com',       phone: '+919876543213', name: 'Murtaza Kanchwala',   role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000005', email: 'taher.s@example.com',         phone: '+919876543214', name: 'Taher Saifee',        role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000006', email: 'zahra.m@example.com',         phone: '+919876543215', name: 'Zahra Mithawala',     role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000007', email: 'ayman.d@example.com',         phone: '+919876543216', name: 'Ayman Dahodwala',     role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000008', email: 'nafisa.t@example.com',        phone: '+919876543217', name: 'Nafisa Tawawala',     role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000009', email: 'husain.j@example.com',        phone: '+919876543218', name: 'Husain Jamali',       role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000010', email: 'ruqaiya.p@example.com',       phone: '+919876543219', name: 'Ruqaiya Poonawala',   role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000011', email: 'abbas.c@example.com',         phone: '+919876543220', name: 'Abbas Chitalwala',    role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000012', email: 'munira.b@example.com',        phone: '+919876543221', name: 'Munira Badri',        role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000013', email: 'qaid.l@example.com',          phone: '+919876543222', name: 'Qaid Lokhandwala',    role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000014', email: 'jumana.v@example.com',        phone: '+919876543223', name: 'Jumana Vahora',       role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000015', email: 'mustafa.g@example.com',       phone: '+919876543224', name: 'Mustafa Gallawala',   role: 'customer' },
  { id: 'a0000000-0000-0000-0000-000000000016', email: 'maryam.h@example.com',        phone: '+919876543225', name: 'Maryam Hakimuddin',   role: 'provider' },
  { id: 'a0000000-0000-0000-0000-000000000017', email: 'insiya.k@example.com',        phone: '+919876543226', name: 'Insiya Kothawala',    role: 'provider' },
  { id: 'a0000000-0000-0000-0000-000000000018', email: 'rashida.s@example.com',       phone: '+919876543227', name: 'Rashida Shakir',      role: 'provider' },
  { id: 'a0000000-0000-0000-0000-000000000019', email: 'tasneem.m@example.com',       phone: '+919876543228', name: 'Tasneem Motiwala',    role: 'provider' },
  { id: 'a0000000-0000-0000-0000-000000000020', email: 'alifiya.d@example.com',       phone: '+919876543229', name: 'Alifiya Dawoodi',     role: 'provider' },
];

async function seedSupabaseUsers() {
  console.log('🔄 Seeding Supabase Auth users...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of SEED_USERS) {
    // Try to create user with the same UUID as in the DB
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      phone: user.phone,
      password: 'TestPassword123!', // Dev-only default password
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        name: user.name,
        role: user.role,
        db_user_id: user.id,
      },
    });

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        console.log(`  ⏭  ${user.name} (${user.email}) — already exists, skipping`);
        skipped++;
      } else {
        console.error(`  ❌ ${user.name} (${user.email}) — ${error.message}`);
        errors++;
      }
    } else {
      console.log(`  ✅ ${user.name} (${user.email}) — created (supabase_id: ${data.user.id})`);
      created++;
    }
  }

  console.log(`\n📊 Results: ${created} created, ${skipped} skipped, ${errors} errors`);

  if (created > 0) {
    console.log('\n⚠️  NOTE: Supabase Auth user IDs won\'t match the DB UUIDs (Supabase generates its own).');
    console.log('   To link them, update the users table supabase_id column:');
    console.log('\n   Run this SQL after seeding:\n');

    // Print SQL to link Supabase Auth IDs to DB users
    console.log('   -- Run in Supabase SQL Editor to link auth users to DB users:');
    console.log('   UPDATE users SET supabase_id = auth_user.id');
    console.log('   FROM auth.users AS auth_user');
    console.log('   WHERE users.email = auth_user.email;');
  }
}

seedSupabaseUsers().catch(console.error);
