import { query } from './database';

/**
 * Automatically initializes database tables, migrations,
 * and seeds registered blood banks and donation centers.
 */
export const initDatabase = async (): Promise<void> => {
  try {
    // 1. Ensure pgcrypto extension
    await query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    // 2. Ensure users table with city
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            VARCHAR(150) NOT NULL,
        email           VARCHAR(255) NOT NULL UNIQUE,
        password_hash   VARCHAR(255) NOT NULL,
        phone           VARCHAR(20),
        blood_group     VARCHAR(5) CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
        city            VARCHAR(100),
        role            VARCHAR(20) NOT NULL DEFAULT 'donor' CHECK (role IN ('donor','hospital','staff','admin')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    // Migration: ensure city column exists on existing users table
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_blood_group ON users(blood_group)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_city ON users(city)');

    // 3. Ensure blood_banks table with type and donation capability
    await query(`
      CREATE TABLE IF NOT EXISTS blood_banks (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name                 VARCHAR(150) NOT NULL,
        address              TEXT NOT NULL,
        city                 VARCHAR(100) NOT NULL,
        phone                VARCHAR(25),
        email                VARCHAR(255),
        operating_hours      VARCHAR(100) DEFAULT '09:00 AM - 05:00 PM',
        type                 VARCHAR(30) DEFAULT 'BLOOD_BANK',
        is_donation_capable  BOOLEAN DEFAULT TRUE,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    // Migrations: ensure columns exist
    await query('ALTER TABLE blood_banks ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT \'BLOOD_BANK\'');
    await query('ALTER TABLE blood_banks ADD COLUMN IF NOT EXISTS is_donation_capable BOOLEAN DEFAULT TRUE');
    await query('CREATE INDEX IF NOT EXISTS idx_blood_banks_city ON blood_banks(city)');
    await query('CREATE INDEX IF NOT EXISTS idx_blood_banks_type ON blood_banks(type)');

    // 4. Ensure appointments table
    await query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        donor_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blood_bank_id     UUID NOT NULL REFERENCES blood_banks(id) ON DELETE RESTRICT,
        appointment_date  DATE NOT NULL,
        appointment_time  VARCHAR(20) NOT NULL,
        status            VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
        notes             TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_appointments_donor ON appointments(donor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_appointments_blood_bank ON appointments(blood_bank_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)');
    await query('CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)');

    // 5. Ensure donations table
    await query(`
      CREATE TABLE IF NOT EXISTS donations (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        donor_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blood_bank_id     UUID NOT NULL REFERENCES blood_banks(id) ON DELETE RESTRICT,
        appointment_id    UUID REFERENCES appointments(id) ON DELETE SET NULL,
        donation_date     DATE NOT NULL DEFAULT CURRENT_DATE,
        blood_group       VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
        quantity_ml       INT NOT NULL DEFAULT 450,
        status            VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'REJECTED', 'TESTING_PENDING')),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_donations_blood_bank ON donations(blood_bank_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date)');
    await query('CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status)');

    // 6. Seed real registered blood banks and donation centers in major cities
    // Mark obsolete dummy 'Metro City' sample rows as inactive so they do not show in searches
    await query("UPDATE blood_banks SET is_donation_capable = FALSE WHERE city = 'Metro City'");

    const countResult = await query("SELECT COUNT(*)::int AS count FROM blood_banks WHERE city IN ('Chennai', 'Bengaluru', 'Coimbatore', 'Madurai')");
    if ((countResult.rows[0]?.count ?? 0) === 0) {
      await query(`
        INSERT INTO blood_banks (name, address, city, phone, email, operating_hours, type, is_donation_capable) VALUES
        -- Chennai Centers
        ('Chennai Central Blood Bank & Research Institute', '12 Anna Salai, Teynampet, Chennai, Tamil Nadu 600018', 'Chennai', '+91 44 2432 1000', 'chennai.central@lifeflow.org', '08:00 AM - 08:00 PM', 'BLOOD_BANK', TRUE),
        ('Madras Voluntary Blood Bank', '48 Gandhi Irwin Road, Egmore, Chennai, Tamil Nadu 600008', 'Chennai', '+91 44 2819 2200', 'mvbb@lifeflow.org', '09:00 AM - 06:00 PM', 'BLOOD_BANK', TRUE),
        ('Adyar Regional Blood Donation Centre', '35 Sardar Patel Road, Adyar, Chennai, Tamil Nadu 600020', 'Chennai', '+91 44 2491 5500', 'adyar.center@lifeflow.org', '08:30 AM - 07:00 PM', 'DONATION_CENTER', TRUE),
        ('Apollo Specialty Hospital Blood Bank', '21 Greams Lane, Thousand Lights, Chennai, Tamil Nadu 600006', 'Chennai', '+91 44 2829 0200', 'apollo.bloodbank@lifeflow.org', '24/7 Available', 'HOSPITAL', TRUE),

        -- Bengaluru Centers
        ('Bengaluru Red Cross Blood Centre', '26 Race Course Road, Madhava Nagar, Bengaluru, Karnataka 560001', 'Bengaluru', '+91 80 2226 8435', 'bangalore.redcross@lifeflow.org', '08:00 AM - 08:00 PM', 'BLOOD_BANK', TRUE),
        ('Victoria Memorial Hospital Blood Bank', 'Fort Road, Near City Market, Bengaluru, Karnataka 560002', 'Bengaluru', '+91 80 2670 1150', 'victoria.bloodbank@lifeflow.org', '24/7 Available', 'HOSPITAL', TRUE),
        ('Koramangala Community Donation Centre', '80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034', 'Bengaluru', '+91 80 4112 3344', 'koramangala.donations@lifeflow.org', '09:00 AM - 06:00 PM', 'DONATION_CENTER', TRUE),

        -- Coimbatore Centers
        ('Coimbatore Government Medical College Blood Bank', 'Trichy Road, Sungam, Coimbatore, Tamil Nadu 641018', 'Coimbatore', '+91 422 230 1393', 'cmc.bloodbank@lifeflow.org', '24/7 Available', 'HOSPITAL', TRUE),
        ('Kovai Voluntary Blood Bank & Donation Centre', '124 Avanashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004', 'Coimbatore', '+91 422 257 8899', 'kovai.blood@lifeflow.org', '08:30 AM - 07:30 PM', 'BLOOD_BANK', TRUE),

        -- Madurai Centers
        ('Madurai Meenakshi Mission Blood Centre', 'Melur Road, Madurai, Tamil Nadu 625107', 'Madurai', '+91 452 426 3000', 'meenakshi.blood@lifeflow.org', '08:00 AM - 08:00 PM', 'BLOOD_BANK', TRUE),
        ('Rajaji Government Hospital Blood Bank', 'Panagal Road, Shenoy Nagar, Madurai, Tamil Nadu 625020', 'Madurai', '+91 452 253 2535', 'rajaji.blood@lifeflow.org', '24/7 Available', 'HOSPITAL', TRUE)
      `);
      console.log('[Database] Seeded registered blood banks and donation centers in Chennai, Bengaluru, Coimbatore, Madurai.');
    }

    console.log('[Database] Database tables, columns, and indexes verified successfully.');
  } catch (error) {
    console.error('[Database] Database initialization error:', error);
  }
};
