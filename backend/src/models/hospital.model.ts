import { query } from '../config/database';
import { PoolClient } from 'pg';

export interface Hospital {
  id: string;
  user_id?: string | null;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  operating_hours: string | null;
  emergency_contact?: string | null;
  hospital_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHospitalInput {
  userId: string;
  name: string;
  address: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  operatingHours?: string | null;
  emergencyContact?: string | null;
  hospitalType?: string | null;
}

export interface UpdateHospitalInput {
  name?: string;
  address?: string;
  city?: string;
  phone?: string | null;
  email?: string | null;
  operatingHours?: string | null;
  emergencyContact?: string | null;
  hospitalType?: string | null;
}

/**
 * Find a hospital facility by its ID or associated User ID.
 */
export const findHospitalById = async (id: string): Promise<Hospital | null> => {
  const result = await query(
    `SELECT id, user_id, name, address, city, phone, email, operating_hours, emergency_contact, hospital_type, created_at, updated_at
     FROM hospitals
     WHERE id = $1 OR user_id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
};

/**
 * Find a hospital associated with a user ID.
 */
export const findHospitalByUserId = async (userId: string): Promise<Hospital | null> => {
  const result = await query(
    `SELECT id, user_id, name, address, city, phone, email, operating_hours, emergency_contact, hospital_type, created_at, updated_at
     FROM hospitals
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
};

/**
 * Create a new hospital organization record.
 */
export const createHospitalRecord = async (
  input: CreateHospitalInput,
  client?: PoolClient
): Promise<Hospital> => {
  const runner = client ? client.query.bind(client) : query;
  const result = await runner(
    `INSERT INTO hospitals (user_id, name, address, city, phone, email, operating_hours, emergency_contact, hospital_type)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, '24/7 Available'), $8, COALESCE($9, 'GENERAL'))
     RETURNING id, user_id, name, address, city, phone, email, operating_hours, emergency_contact, hospital_type, created_at, updated_at`,
    [
      input.userId,
      input.name.trim(),
      input.address.trim(),
      input.city.trim(),
      input.phone ? input.phone.trim() : null,
      input.email ? input.email.trim().toLowerCase() : null,
      input.operatingHours ? input.operatingHours.trim() : null,
      input.emergencyContact ? input.emergencyContact.trim() : null,
      input.hospitalType ? input.hospitalType.trim() : null
    ]
  );
  return result.rows[0];
};

/**
 * Update an existing hospital's profile fields.
 */
export const updateHospitalProfile = async (
  idOrUserId: string,
  input: UpdateHospitalInput
): Promise<Hospital | null> => {
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
  if (input.emergencyContact !== undefined) {
    fields.push(`emergency_contact = $${paramIndex++}`);
    values.push(input.emergencyContact ? input.emergencyContact.trim() : null);
  }
  if (input.hospitalType !== undefined) {
    fields.push(`hospital_type = $${paramIndex++}`);
    values.push(input.hospitalType ? input.hospitalType.trim() : null);
  }

  if (fields.length === 0) {
    return findHospitalById(idOrUserId);
  }

  fields.push(`updated_at = now()`);
  values.push(idOrUserId);

  const sql = `
    UPDATE hospitals
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex} OR user_id = $${paramIndex}
    RETURNING id, user_id, name, address, city, phone, email, operating_hours, emergency_contact, hospital_type, created_at, updated_at
  `;

  const result = await query(sql, values);
  return result.rows[0] ?? null;
};
