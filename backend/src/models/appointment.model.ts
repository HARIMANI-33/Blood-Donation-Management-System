import { query } from '../config/database';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: string;
  donor_id: string;
  blood_bank_id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  blood_bank_name?: string;
  blood_bank_address?: string;
  blood_bank_city?: string;
  blood_bank_phone?: string;
}

export interface CreateAppointmentInput {
  donorId: string;
  bloodBankId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // e.g. "10:30 AM" or "10:30"
  notes?: string | null;
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
 */
export const findUpcomingAppointmentForDonor = async (donorId: string): Promise<Appointment | null> => {
  const result = await query(
    `SELECT a.*, b.name as blood_bank_name, b.address as blood_bank_address, b.city as blood_bank_city, b.phone as blood_bank_phone
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
 * Create a new donation appointment.
 */
export const createAppointment = async (input: CreateAppointmentInput): Promise<Appointment> => {
  const result = await query(
    `INSERT INTO appointments (donor_id, blood_bank_id, appointment_date, appointment_time, status, notes)
     VALUES ($1, $2, $3, $4, 'CONFIRMED', $5)
     RETURNING *`,
    [input.donorId, input.bloodBankId, input.appointmentDate, input.appointmentTime, input.notes ?? null]
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
            a.appointment_time, a.status, a.notes, a.created_at, a.updated_at,
            b.name AS blood_bank_name, b.address AS blood_bank_address,
            b.city AS blood_bank_city, b.phone AS blood_bank_phone
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
            a.appointment_time, a.status, a.notes, a.created_at, a.updated_at,
            b.name AS blood_bank_name, b.address AS blood_bank_address,
            b.city AS blood_bank_city, b.phone AS blood_bank_phone
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
     RETURNING *`,
    [id, donorId]
  );
  return result.rows[0] ?? null;
};
