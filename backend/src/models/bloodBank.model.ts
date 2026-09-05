import { query } from '../config/database';

export interface BloodBank {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  operating_hours: string | null;
  type?: string;
  is_donation_capable?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieve active blood bank/donation facilities, optionally filtered by city.
 */
export const findAllBloodBanks = async (city?: string): Promise<BloodBank[]> => {
  if (city && city.trim()) {
    const trimmed = city.trim();
    const result = await query(
      `SELECT id, name, address, city, phone, email, operating_hours, type, is_donation_capable, created_at, updated_at
       FROM blood_banks
       WHERE is_donation_capable = TRUE
         AND (LOWER(city) = LOWER($1) OR city ILIKE '%' || $1 || '%')
       ORDER BY city ASC, name ASC`,
      [trimmed]
    );
    return result.rows;
  }

  const result = await query(
    `SELECT id, name, address, city, phone, email, operating_hours, type, is_donation_capable, created_at, updated_at
     FROM blood_banks
     WHERE is_donation_capable = TRUE
     ORDER BY city ASC, name ASC`
  );
  return result.rows;
};

/**
 * Find a specific blood bank facility by ID.
 */
export const findBloodBankById = async (id: string): Promise<BloodBank | null> => {
  const result = await query(
    `SELECT id, name, address, city, phone, email, operating_hours, type, is_donation_capable, created_at, updated_at
     FROM blood_banks
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
};
