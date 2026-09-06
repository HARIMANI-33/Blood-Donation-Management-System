import { query } from '../config/database';
import { PoolClient } from 'pg';

export interface BloodBank {
  id: string;
  user_id?: string | null;
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

export interface CreateBloodBankInput {
  userId: string;
  name: string;
  address: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  operatingHours?: string | null;
  type?: string;
  isDonationCapable?: boolean;
}

export interface UpdateBloodBankInput {
  name?: string;
  address?: string;
  city?: string;
  phone?: string | null;
  email?: string | null;
  operatingHours?: string | null;
}

/**
 * Retrieve active blood bank/donation facilities, optionally filtered by search keyword or city.
 * Returns latest registered blood banks first.
 */
export const findAllBloodBanks = async (searchOrCity?: string): Promise<BloodBank[]> => {
  if (searchOrCity && searchOrCity.trim()) {
    const term = `%${searchOrCity.trim()}%`;
    const result = await query(
      `SELECT id, user_id, name, address, city, phone, email, operating_hours, type, is_donation_capable, created_at, updated_at
       FROM blood_banks
       WHERE (is_donation_capable IS TRUE OR is_donation_capable IS NULL)
         AND (
           city ILIKE $1
           OR name ILIKE $1
           OR address ILIKE $1
         )
       ORDER BY created_at DESC, name ASC`,
      [term]
    );
    return result.rows;
  }

  const result = await query(
    `SELECT id, user_id, name, address, city, phone, email, operating_hours, type, is_donation_capable, created_at, updated_at
     FROM blood_banks
     WHERE (is_donation_capable IS TRUE OR is_donation_capable IS NULL)
     ORDER BY created_at DESC, name ASC`
  );
  return result.rows;
};

/**
 * Find a specific blood bank facility by ID.
 */
export const findBloodBankById = async (id: string): Promise<BloodBank | null> => {
  const result = await query(
    `SELECT id, user_id, name, address, city, phone, email, operating_hours, type, is_donation_capable, created_at, updated_at
     FROM blood_banks
     WHERE id = $1 OR user_id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
};

/**
 * Find a blood bank associated with a registered user ID.
 */
export const findBloodBankByUserId = async (userId: string): Promise<BloodBank | null> => {
  const result = await query(
    `SELECT id, user_id, name, address, city, phone, email, operating_hours, type, is_donation_capable, created_at, updated_at
     FROM blood_banks
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
};

/**
 * Create a new blood bank facility linked to an authenticated user ID.
 */
export const createBloodBankFacility = async (
  input: CreateBloodBankInput,
  client?: PoolClient
): Promise<BloodBank> => {
  const runner = client ? client.query.bind(client) : query;
  const result = await runner(
    `INSERT INTO blood_banks (user_id, name, address, city, phone, email, operating_hours, type, is_donation_capable)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, '08:00 AM - 08:00 PM'), COALESCE($8, 'BLOOD_BANK'), COALESCE($9, TRUE))
     RETURNING id, user_id, name, address, city, phone, email, operating_hours, type, is_donation_capable, created_at, updated_at`,
    [
      input.userId,
      input.name.trim(),
      input.address.trim(),
      input.city.trim(),
      input.phone ? input.phone.trim() : null,
      input.email ? input.email.trim().toLowerCase() : null,
      input.operatingHours ? input.operatingHours.trim() : null,
      input.type ?? 'BLOOD_BANK',
      input.isDonationCapable ?? true
    ]
  );
  return result.rows[0];
};

/**
 * Update an existing blood bank facility's profile fields.
 */
export const updateBloodBankProfile = async (
  id: string,
  input: UpdateBloodBankInput
): Promise<BloodBank | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(input.name.trim());
  }
  if (input.address !== undefined) {
    fields.push(`address = $${paramIndex++}`);
    values.push(input.address.trim());
  }
  if (input.city !== undefined) {
    fields.push(`city = $${paramIndex++}`);
    values.push(input.city.trim());
  }
  if (input.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(input.phone ? input.phone.trim() : null);
  }
  if (input.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(input.email ? input.email.trim().toLowerCase() : null);
  }
  if (input.operatingHours !== undefined) {
    fields.push(`operating_hours = $${paramIndex++}`);
    values.push(input.operatingHours ? input.operatingHours.trim() : null);
  }

  if (fields.length === 0) {
    return findBloodBankById(id);
  }

  fields.push(`updated_at = now()`);
  values.push(id);

  const sql = `
    UPDATE blood_banks
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, user_id, name, address, city, phone, email, operating_hours, type, is_donation_capable, created_at, updated_at
  `;

  const result = await query(sql, values);
  return result.rows[0] ?? null;
};

/**
 * Public search for registered blood banks in a requested city with their complete blood inventory.
 */
export const searchBloodBanksWithInventory = async (city?: string): Promise<any[]> => {
  let whereClause = 'WHERE b.is_donation_capable = TRUE';
  const params: unknown[] = [];

  if (city && city.trim()) {
    params.push(city.trim());
    whereClause += ` AND (LOWER(b.city) = LOWER($1) OR b.city ILIKE '%' || $1 || '%')`;
  }

  const sql = `
    SELECT
      b.id,
      b.name,
      b.address,
      b.city,
      b.phone,
      b.email,
      b.operating_hours,
      b.type,
      COALESCE(
        json_agg(
          json_build_object(
            'bloodGroup', bi.blood_group,
            'quantity', bi.quantity,
            'updatedAt', bi.updated_at
          ) ORDER BY bi.blood_group
        ) FILTER (WHERE bi.id IS NOT NULL),
        '[]'
      ) AS inventory
    FROM blood_banks b
    LEFT JOIN blood_inventory bi ON b.id = bi.blood_bank_id
    ${whereClause}
    GROUP BY b.id
    ORDER BY b.city ASC, b.name ASC
  `;

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Search blood availability matching city, blood group, and required quantity.
 */
export const searchBloodAvailability = async (
  city?: string,
  bloodGroup?: string,
  minQuantity: number = 1
): Promise<any[]> => {
  const conditions: string[] = ['b.is_donation_capable = TRUE'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (city && city.trim()) {
    params.push(city.trim());
    conditions.push(`(LOWER(b.city) = LOWER($${paramIdx}) OR b.city ILIKE '%' || $${paramIdx} || '%')`);
    paramIdx++;
  }

  if (bloodGroup && bloodGroup.trim()) {
    params.push(bloodGroup.trim());
    conditions.push(`bi.blood_group = $${paramIdx}`);
    paramIdx++;
  }

  params.push(minQuantity);
  conditions.push(`bi.quantity >= $${paramIdx}`);
  paramIdx++;

  const sql = `
    SELECT
      b.id AS "bloodBankId",
      b.name AS "bloodBankName",
      b.city,
      b.address,
      b.phone,
      b.email,
      b.operating_hours AS "operatingHours",
      bi.blood_group AS "bloodGroup",
      bi.quantity AS "availableQuantity",
      bi.updated_at AS "updatedAt"
    FROM blood_banks b
    JOIN blood_inventory bi ON b.id = bi.blood_bank_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY bi.quantity DESC, b.name ASC
  `;

  const result = await query(sql, params);
  return result.rows;
};
