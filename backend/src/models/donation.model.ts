import { query } from '../config/database';
import { BloodGroup } from './user.model';

export type DonationStatus = 'COMPLETED' | 'REJECTED' | 'TESTING_PENDING';

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
