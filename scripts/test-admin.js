const jwt = require('jsonwebtoken');
const http = require('http');
const { Client } = require('pg');

const SECRET = 'bohri-connect-super-secret-key-change-in-uat';

async function findProviderUser() {
  const c = new Client({
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.tffkwihoedtbziezrfae',
    password: 'r#GhLjvY,Ac45k2',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const res = await c.query(
    "SELECT u.id, u.name, u.role, p.id as provider_id FROM users u JOIN providers p ON p.user_id = u.id WHERE u.status = 'active' LIMIT 1"
  );
  await c.end();
  return res.rows[0];
}

async function testEndpoint(method, path, token, body) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: 3001, path, method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => {
        const short = data.length > 200 ? data.substring(0, 200) + '...' : data;
        console.log(`${res.statusCode} ${method} ${path} => ${short}`);
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', (e) => { console.log(`ERR ${path} => ${e.message}`); resolve(null); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const user = await findProviderUser();
  if (!user) { console.log('No provider user found!'); return; }
  console.log('Provider user:', JSON.stringify(user));
  
  const token = jwt.sign({ sub: user.id, mobile: '0000' }, SECRET, { expiresIn: '1h' });
  console.log('Token:', token.substring(0, 50) + '...\n');

  // Test auth on a simple GET endpoint
  await testEndpoint('GET', '/api/providers/my-status', token);
  
  // Test checkout
  const checkoutBody = {
    type: 'carousel',
    budgetAmount: 999,
    startsAt: '2026-06-01T00:00:00Z',
    endsAt: '2026-06-30T00:00:00Z',
  };
  await testEndpoint('POST', '/api/payments/sponsorship/checkout', token, checkoutBody);
}

main();
