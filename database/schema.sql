-- Blood Bank Management System - Schema
-- Database: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users Table (Donors, Hospitals, Staff, Admins)
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
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_blood_group ON users(blood_group);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);

-- 2. Blood Banks & Donation Centers Table (Organizations)
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
);

CREATE INDEX IF NOT EXISTS idx_blood_banks_city ON blood_banks(city);
CREATE INDEX IF NOT EXISTS idx_blood_banks_type ON blood_banks(type);

-- 3. Donation Appointments Table
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
);

CREATE INDEX IF NOT EXISTS idx_appointments_donor ON appointments(donor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_blood_bank ON appointments(blood_bank_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- 4. Donations Table (Actual completed blood donation records)
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
);

CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_blood_bank ON donations(blood_bank_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
