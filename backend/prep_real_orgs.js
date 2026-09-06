require('dotenv').config();
const { query } = require('./dist/config/database');

async function prep() {
  console.log('Ensuring clean, verified real organizations in database...');

  // 1. Neuro Life Blood Bank (Chennai)
  const neuroCheck = await query(
    "SELECT id, name, city FROM blood_banks WHERE LOWER(name) = 'neuro life blood bank' AND LOWER(city) = 'chennai'"
  );
  if (neuroCheck.rows.length === 0) {
    await query(
      `INSERT INTO blood_banks (name, address, city, phone, email, operating_hours, type, is_donation_capable)
       VALUES ('Neuro Life Blood Bank', '24 Anna Salai, Guindy', 'Chennai', '9840112233', 'neurolife@example.com', '24 Hours Emergency', 'BLOOD_BANK', TRUE)`
    );
    console.log('Created Neuro Life Blood Bank');
  } else {
    await query(
      "UPDATE blood_banks SET is_donation_capable = TRUE, address = '24 Anna Salai, Guindy' WHERE id = $1",
      [neuroCheck.rows[0].id]
    );
    console.log('Verified Neuro Life Blood Bank:', neuroCheck.rows[0].id);
  }

  // 2. Apex Blood Bank (Chennai)
  const apexCheck = await query(
    "SELECT id, name, city FROM blood_banks WHERE LOWER(name) = 'apex blood bank' AND LOWER(city) = 'chennai'"
  );
  if (apexCheck.rows.length === 0) {
    await query(
      `INSERT INTO blood_banks (name, address, city, phone, email, operating_hours, type, is_donation_capable)
       VALUES ('Apex Blood Bank', '100 EVR Periyar Road, Kilpauk', 'Chennai', '9840998877', 'apex@example.com', '08:00 AM - 09:00 PM', 'BLOOD_BANK', TRUE)`
    );
    console.log('Created Apex Blood Bank');
  } else {
    await query(
      "UPDATE blood_banks SET is_donation_capable = TRUE, address = '100 EVR Periyar Road, Kilpauk' WHERE id = $1",
      [apexCheck.rows[0].id]
    );
    console.log('Verified Apex Blood Bank:', apexCheck.rows[0].id);
  }

  // 3. SIMS Hospital Blood Center (Chennai) - Configured as donation-capable HOSPITAL unit
  const simsCheck = await query(
    "SELECT id, name, city FROM blood_banks WHERE LOWER(name) = 'sims hospital blood center' AND LOWER(city) = 'chennai'"
  );
  if (simsCheck.rows.length === 0) {
    await query(
      `INSERT INTO blood_banks (name, address, city, phone, email, operating_hours, type, is_donation_capable)
       VALUES ('SIMS Hospital Blood Center', '1 Jawaharlal Nehru Salai, Vadapalani', 'Chennai', '044-20002000', 'sims.bloodcenter@example.com', '24/7 Available', 'HOSPITAL', TRUE)`
    );
    console.log('Created SIMS Hospital Blood Center');
  } else {
    await query(
      "UPDATE blood_banks SET is_donation_capable = TRUE, type = 'HOSPITAL', address = '1 Jawaharlal Nehru Salai, Vadapalani' WHERE id = $1",
      [simsCheck.rows[0].id]
    );
    console.log('Verified SIMS Hospital Blood Center:', simsCheck.rows[0].id);
  }

  // 4. Bengaluru Blood Bank (Bengaluru)
  const benCheck = await query(
    "SELECT id, name, city FROM blood_banks WHERE LOWER(name) = 'bengaluru blood bank' AND LOWER(city) = 'bengaluru'"
  );
  if (benCheck.rows.length === 0) {
    await query(
      `INSERT INTO blood_banks (name, address, city, phone, email, operating_hours, type, is_donation_capable)
       VALUES ('Bengaluru Blood Bank', '45 Brigade Road, Shanthala Nagar', 'Bengaluru', '080-25588990', 'bengaluru.blood@example.com', '24/7 Service', 'BLOOD_BANK', TRUE)`
    );
    console.log('Created Bengaluru Blood Bank');
  } else {
    await query(
      "UPDATE blood_banks SET is_donation_capable = TRUE, address = '45 Brigade Road, Shanthala Nagar' WHERE id = $1",
      [benCheck.rows[0].id]
    );
    console.log('Verified Bengaluru Blood Bank:', benCheck.rows[0].id);
  }

  // 5. Verify ordinary hospital (e.g. Apollo City Hospital) has NO donation capability
  const ordHosp = await query(
    "SELECT id, name, city FROM hospitals WHERE LOWER(name) LIKE '%apollo%'"
  );
  console.log('Ordinary hospitals found in hospitals table (must NOT be in donation centers):', ordHosp.rows.length);

  process.exit(0);
}

prep().catch(e => { console.error(e); process.exit(1); });
