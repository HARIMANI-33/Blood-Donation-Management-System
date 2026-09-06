require('dotenv').config();
const { query } = require('./dist/config/database');

async function inspect() {
  const hospCols = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'hospitals'
    ORDER BY ordinal_position
  `);
  console.log('HOSPITALS COLUMNS:');
  console.table(hospCols.rows);

  const bbCols = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'blood_banks'
    ORDER BY ordinal_position
  `);
  console.log('BLOOD_BANKS COLUMNS:');
  console.table(bbCols.rows);

  const beng = await query("SELECT * FROM blood_banks WHERE LOWER(city) = 'bengaluru'");
  console.log('Bengaluru blood banks in blood_banks:', beng.rows.length);

  const allTypes = await query("SELECT DISTINCT type, is_donation_capable FROM blood_banks");
  console.log('DISTINCT types in blood_banks:');
  console.table(allTypes.rows);

  process.exit(0);
}

inspect().catch(e => { console.error(e); process.exit(1); });
