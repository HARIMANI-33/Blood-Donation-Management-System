import pool, { query } from '../config/database';
import { BloodGroup } from './user.model';
import { PoolClient } from 'pg';
import { incrementInventoryQuantity } from './bloodInventory.model';
import { findAppointmentByIdForBloodBank, updateAppointmentStatus } from './appointment.model';

export type DonationStatus = 'COMPLETED' | 'REJECTED' | 'TESTING_PENDING' | 'APPROVED' | 'PENDING';

export interface Donation {
  id: string;
  donor_id: string;
  blood_bank_id: string;
  appointment_id: string | null;
  donation_date: string;
  blood_group: BloodGroup;
  quantity_ml: number;
  status: DonationStatus;
  created_at: string;
  updated_at: string;
  blood_bank_name?: string;
  blood_bank_city?: string;
}

export interface CreateDonationInput {
  donorId: string;
  bloodBankId: string;
  appointmentId?: string | null;
  donationDate?: string;
  bloodGroup: BloodGroup;
  quantityMl?: number;
  status?: DonationStatus;
}

export interface CompleteDonationResult {
  donation: Donation;
  appointment: any;
  inventoryItem: any;
}

/**
 * List all donation records for a specific donor.
 */
export const findDonationsByDonor = async (donorId: string): Promise<Donation[]> => {
  const result = await query(
    `SELECT d.id, d.donor_id, d.blood_bank_id, d.appointment_id,
            TO_CHAR(d.donation_date, 'YYYY-MM-DD') AS donation_date,
            d.blood_group, d.quantity_ml, d.status, d.created_at, d.updated_at,
            b.name AS blood_bank_name, b.city AS blood_bank_city
     FROM donations d
     JOIN blood_banks b ON d.blood_bank_id = b.id
     WHERE d.donor_id = $1
     ORDER BY d.donation_date DESC, d.created_at DESC`,
    [donorId]
  );
  return result.rows;
};

/**
 * Calculate dynamic total of completed donations for a donor.
 */
export const countCompletedDonationsByDonor = async (donorId: string): Promise<number> => {
  const result = await query(
    `SELECT COUNT(*)::int AS count
     FROM donations
     WHERE donor_id = $1 AND status = 'COMPLETED'`,
    [donorId]
  );
  return result.rows[0]?.count ?? 0;
};

/**
 * Get the most recent completed donation for a donor (used for eligibility calculation).
 */
export const getLatestCompletedDonation = async (donorId: string): Promise<Donation | null> => {
  const result = await query(
    `SELECT d.id, d.donor_id, d.blood_bank_id, d.appointment_id,
            TO_CHAR(d.donation_date, 'YYYY-MM-DD') AS donation_date,
            d.blood_group, d.quantity_ml, d.status, d.created_at, d.updated_at,
            b.name AS blood_bank_name
     FROM donations d
     JOIN blood_banks b ON d.blood_bank_id = b.id
     WHERE d.donor_id = $1 AND d.status = 'COMPLETED'
     ORDER BY d.donation_date DESC
     LIMIT 1`,
    [donorId]
  );
  return result.rows[0] ?? null;
};

/**
 * Record a new donation (used when a donation is completed/processed).
 */
export const createDonationRecord = async (input: CreateDonationInput): Promise<Donation> => {
  const result = await query(
    `INSERT INTO donations (donor_id, blood_bank_id, appointment_id, donation_date, blood_group, quantity_ml, status)
     VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, COALESCE($6, 450), COALESCE($7, 'COMPLETED'))
     RETURNING *`,
    [
      input.donorId,
      input.bloodBankId,
      input.appointmentId ?? null,
      input.donationDate ?? null,
      input.bloodGroup,
      input.quantityMl ?? 450,
      input.status ?? 'COMPLETED'
    ]
  );
  return result.rows[0];
};

/**
 * Check if a donation has already been recorded for a specific appointment ID.
 */
export const findDonationByAppointmentId = async (
  appointmentId: string,
  client?: PoolClient
): Promise<Donation | null> => {
  const runner = client ? client.query.bind(client) : query;
  const result = await runner(
    `SELECT * FROM donations WHERE appointment_id = $1 LIMIT 1`,
    [appointmentId]
  );
  return result.rows[0] ?? null;
};

/**
 * Atomically completes a donor appointment, creates the donation record,
 * and increments the blood bank's inventory inside a transaction.
 * Strictly prevents duplicate increments.
 */
export const completeDonationAndIncrementInventory = async (
  appointmentId: string,
  bloodBankId: string,
  quantityMl: number = 450,
  unitsToAdd: number = 1
): Promise<CompleteDonationResult> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch appointment with exclusive lock to prevent concurrent races
    const appointmentRes = await client.query(
      `SELECT a.*, u.name as donor_name, u.blood_group as donor_blood_group
       FROM appointments a
       JOIN users u ON a.donor_id = u.id
       WHERE a.id = $1 AND a.blood_bank_id = $2
       FOR UPDATE`,
      [appointmentId, bloodBankId]
    );

    const appointment = appointmentRes.rows[0];
    if (!appointment) {
      throw new Error('Appointment not found for this blood bank');
    }

    if (appointment.status === 'COMPLETED') {
      throw new Error('This appointment has already been completed and recorded');
    }

    if (appointment.status === 'CANCELLED' || appointment.status === 'REJECTED') {
      throw new Error(`Cannot complete an appointment with status '${appointment.status}'`);
    }

    // 2. Check deduplication: make sure no donation record exists for this appointment
    const existingDonation = await findDonationByAppointmentId(appointmentId, client);
    if (existingDonation) {
      throw new Error('A donation record has already been credited for this appointment');
    }

    const bloodGroup = appointment.donor_blood_group as BloodGroup;
    if (!bloodGroup) {
      throw new Error('Donor does not have a valid blood group on file');
    }

    // 3. Create donation record
    const donationRes = await client.query(
      `INSERT INTO donations (donor_id, blood_bank_id, appointment_id, donation_date, blood_group, quantity_ml, status)
       VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, 'COMPLETED')
       RETURNING *`,
      [appointment.donor_id, bloodBankId, appointmentId, bloodGroup, quantityMl]
    );
    const donation = donationRes.rows[0];

    // 4. Update appointment status to COMPLETED
    const updatedAppt = await updateAppointmentStatus(appointmentId, bloodBankId, 'COMPLETED', client);

    // 5. Increment inventory for this blood group
    const inventoryItem = await incrementInventoryQuantity(client, bloodBankId, bloodGroup, unitsToAdd);

    await client.query('COMMIT');

    return {
      donation,
      appointment: updatedAppt,
      inventoryItem
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
