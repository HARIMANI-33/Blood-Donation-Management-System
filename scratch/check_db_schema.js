const { query } = require('../backend/dist/config/database');

async function check() {
  const cols = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'blood_requests'
    ORDER BY ordinal_position
  `);
  console.log('Columns in blood_requests:', cols.rows);

  const tables = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('Public tables:', tables.rows.map(r => r.table_name));

  const hospitalCols = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
    ORDER BY ordinal_position
  `);
  console.log('Columns in hospitals (if exists):', hospitalCols.rows);

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
