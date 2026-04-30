const {Client}=require('pg');
const c=new Client({connectionString:'postgresql://postgres.uisrqgvmwnswishxelou:pronttera%402024@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'});
c.connect().then(async()=>{
  await c.query(`
    CREATE TABLE IF NOT EXISTS provider_warnings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      warning_type VARCHAR(50) NOT NULL DEFAULT 'report_warning',
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      report_id UUID REFERENCES reports(id),
      issued_by UUID NOT NULL REFERENCES users(id),
      is_read BOOLEAN NOT NULL DEFAULT false,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await c.query(`CREATE INDEX IF NOT EXISTS idx_provider_warnings_provider ON provider_warnings (provider_id, created_at)`);
  await c.query(`CREATE INDEX IF NOT EXISTS idx_provider_warnings_read ON provider_warnings (is_read)`);
  console.log('provider_warnings created successfully');
  c.end();
}).catch(e=>{console.error(e.message);c.end()});
