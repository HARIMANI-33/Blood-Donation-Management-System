import { query } from '../config/database';
import { PoolClient } from 'pg';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: string;
  donor_id: string;
  blood_bank_id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string | null;
  blood_group?: string | null;
  created_at: string;
  updated_at: string;
  blood_bank_name?: string;
  blood_bank_address?: string;
  blood_bank_city?: string;
  blood_bank_phone?: string;
  blood_bank_operating_hours?: string | null;
  blood_bank_type?: string | null;
}

export interface BloodBankAppointmentItem {
  id: string;
  donor_id: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string | null;
  donor_blood_group: string | null;
  donor_city: string | null;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string | null;
  blood_group?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentInput {
  donorId: string;
  bloodBankId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // e.g. "10:30 AM" or "10:30"
  notes?: string | null;
  bloodGroup?: string | null;
}

/**
 * Check if the donor already has a non-cancelled appointment at the exact same date & time.
 */
export const findConflictingAppointment = async (
  donorId: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<Appointment | null> => {
  const result = await query(
    `SELECT * FROM appointments
     WHERE donor_id = $1
       AND appointment_date = $2
       AND appointment_time = $3
       AND status IN ('PENDING', 'CONFIRMED')
     LIMIT 1`,
    [donorId, appointmentDate, appointmentTime]
  );
  return result.rows[0] ?? null;
};

/**
 * Check if donor has any upcoming active appointment (PENDING or CONFIRMED for today or later).
 * Guarantees TO_CHAR YYYY-MM-DD formatting, joins blood bank details, and returns the earliest upcoming appointment.
 */
export const findUpcomingAppointmentForDonor = async (donorId: string): Promise<Appointment | null> => {
  const result = await query(
    `SELECT a.id, a.donor_id, a.blood_bank_id,
            TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
            a.appointment_time, a.status, a.notes, a.blood_group, a.created_at, a.updated_at,
            b.name AS blood_bank_name, b.address AS blood_bank_address,
            b.city AS blood_bank_city, b.phone AS blood_bank_phone,
            b.operating_hours AS blood_bank_operating_hours, b.type AS blood_bank_type
     FROM appointments a
     JOIN blood_banks b ON a.blood_bank_id = b.id
     WHERE a.donor_id = $1
       AND a.appointment_date >= CURRENT_DATE
       AND a.status IN ('PENDING', 'CONFIRMED')
     ORDER BY a.appointment_date ASC, a.appointment_time ASC
     LIMIT 1`,
    [donorId]
  );
  return result.rows[0] ?? null;
};

/**
 * Create a new donation appointment (starts in PENDING state awaiting blood bank review).
 * Formats appointment_date as YYYY-MM-DD string on RETURNING.
 */
export const createAppointment = async (input: CreateAppointmentInput): Promise<Appointment> => {
  const result = await query(
    `INSERT INTO appointments (donor_id, blood_bank_id, appointment_date, appointment_time, status, notes, blood_group)
     VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)
     RETURNING id, donor_id, blood_bank_id,
               TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
               appointment_time, status, notes, blood_group, created_at, updated_at`,
    [
      input.donorId,
      input.bloodBankId,
      input.appointmentDate,
      input.appointmentTime,
      input.notes ?? null,
      input.bloodGroup ?? null
    ]
  );
  return result.rows[0];
};

/**
 * List all appointments for a specific donor, joined with blood bank details.
 */
export const findAppointmentsByDonor = async (donorId: string): Promise<Appointment[]> => {
  const result = await query(
    `SELECT a.id, a.donor_id, a.blood_bank_id,
            TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
            a.appointment_time, a.status, a.notes, a.blood_group, a.created_at, a.updated_at,
            b.name AS blood_bank_name, b.address AS blood_bank_address,
            b.city AS blood_bank_city, b.phone AS blood_bank_phone,
            b.operating_hours AS blood_bank_operating_hours, b.type AS blood_bank_type
     FROM appointments a
     JOIN blood_banks b ON a.blood_bank_id = b.id
     WHERE a.donor_id = $1
     ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
    [donorId]
  );
  return result.rows;
};

/**
 * Find single appointment by ID for a specific donor.
 */
export const findAppointmentById = async (id: string, donorId: string): Promise<Appointment | null> => {
  const result = await query(
    `SELECT a.id, a.donor_id, a.blood_bank_id,
            TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
            a.appointment_time, a.status, a.notes, a.blood_group, a.created_at, a.updated_at,
            b.name AS blood_bank_name, b.address AS blood_bank_address,
            b.city AS blood_bank_city, b.phone AS blood_bank_phone,
            b.operating_hours AS blood_bank_operating_hours, b.type AS blood_bank_type
     FROM appointments a
     JOIN blood_banks b ON a.blood_bank_id = b.id
     WHERE a.id = $1 AND a.donor_id = $2
     LIMIT 1`,
    [id, donorId]
  );
  return result.rows[0] ?? null;
};

/**
 * Cancel an appointment (only if it belongs to the donor and is PENDING or CONFIRMED).
 */
export const cancelAppointment = async (id: string, donorId: string): Promise<Appointment | null> => {
  const result = await query(
    `UPDATE appointments
     SET status = 'CANCELLED', updated_at = now()
     WHERE id = $1 AND donor_id = $2 AND status IN ('PENDING', 'CONFIRMED')
     RETURNING id, donor_id, blood_bank_id,
               TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
               appointment_time, status, notes, blood_group, created_at, updated_at`,
    [id, donorId]
  );
  return result.rows[0] ?? null;
};

/**
 * List all appointments belonging to a specific blood bank, with non-sensitive donor details.
 */
export const findAppointmentsByBloodBank = async (
  bloodBankId: string,
  statusFilter?: string
): Promise<BloodBankAppointmentItem[]> => {
  let whereClause = 'WHERE a.blood_bank_id = $1';
  const params: unknown[] = [bloodBankId];

  if (statusFilter && statusFilter.trim()) {
    params.push(statusFilter.trim().toUpperCase());
    whereClause += ` AND a.status = $2`;
  }

  const sql = `
    SELECT
      a.id,
      a.donor_id,
      u.name AS donor_name,
      u.email AS donor_email,
      u.phone AS donor_phone,
      COALESCE(a.blood_group, u.blood_group) AS donor_blood_group,
      a.blood_group,
      u.city AS donor_city,
      TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
      a.appointment_time,
      a.status,
      a.notes,
      a.created_at,
      a.updated_at
    FROM appointments a
    JOIN users u ON a.donor_id = u.id
    ${whereClause}
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `;

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Find single appointment by ID belonging to a specific blood bank.
 */
export const findAppointmentByIdForBloodBank = async (
  appointmentId: string,
  bloodBankId: string,
  client?: PoolClient
): Promise<BloodBankAppointmentItem | null> => {
  const runner = client ? client.query.bind(client) : query;
  const sql = `
    SELECT
      a.id,
      a.donor_id,
      u.name AS donor_name,
      u.email AS donor_email,
      u.phone AS donor_phone,
      COALESCE(a.blood_group, u.blood_group) AS donor_blood_group,
      a.blood_group,
      u.city AS donor_city,
      TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
      a.appointment_time,
      a.status,
      a.notes,
      a.created_at,
      a.updated_at
    FROM appointments a
    JOIN users u ON a.donor_id = u.id
    WHERE a.id = $1 AND a.blood_bank_id = $2
    LIMIT 1
  `;
  const result = await runner(sql, [appointmentId, bloodBankId]);
  return result.rows[0] ?? null;
};

/**
 * Update appointment status (only if it belongs to the authenticated blood bank).
 */
export const updateAppointmentStatus = async (
  appointmentId: string,
  bloodBankId: string,
  status: AppointmentStatus,
  client?: PoolClient
): Promise<Appointment | null> => {
  const runner = client ? client.query.bind(client) : query;
  const result = await runner(
    `UPDATE appointments
     SET status = $1, updated_at = now()
     WHERE id = $2 AND blood_bank_id = $3
     RETURNING *`,
    [status, appointmentId, bloodBankId]
  );
  return result.rows[0] ?? null;
};
