require('dotenv').config();
const { query } = require('./dist/config/database');

async function check() {
  const res = await query(
    "SELECT id, name, city, type, is_donation_capable FROM blood_banks WHERE name ILIKE '%SIMS%' OR name ILIKE '%Neuro%' OR name ILIKE '%Apex%' OR name ILIKE '%Bengaluru%'"
  );
  console.table(res.rows);
  process.exit(0);
}
check();
