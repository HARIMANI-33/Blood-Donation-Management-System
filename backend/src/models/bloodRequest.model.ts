import pool, { query } from '../config/database';
import { BloodGroup } from './user.model';

export type BloodRequestUrgency = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type BloodRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';

export interface BloodRequest {
  id: string;
  hospital_id: string;
  blood_bank_id: string;
  blood_group: BloodGroup;
  quantity: number;
  urgency: BloodRequestUrgency;
  message?: string | null;
  notes?: string | null;
  required_date?: string | null;
  patient_name?: string | null;
  status: BloodRequestStatus;
  created_at: string;
  updated_at: string;

  // Joined fields
  hospital_name?: string;
  hospital_city?: string;
  hospital_phone?: string;
  hospital_address?: string;
  blood_bank_name?: string;
  blood_bank_city?: string;
  blood_bank_phone?: string;
  blood_bank_address?: string;
}

export interface CreateBloodRequestInput {
  hospitalId: string;
  bloodBankId: string;
  bloodGroup: BloodGroup;
  quantity: number;
  urgency?: BloodRequestUrgency;
  message?: string | null;
  notes?: string | null;
  requiredDate?: string | null;
  patientName?: string | null;
}

/**
 * Create a new blood request from a hospital to a specific blood bank.
 * Note: Creating a request does NOT decrease inventory.
 */
export const createBloodRequest = async (input: CreateBloodRequestInput): Promise<BloodRequest> => {
  const result = await query(
    `INSERT INTO blood_requests (
       hospital_id, blood_bank_id, blood_group, quantity, urgency,
       message, notes, required_date, patient_name, status
     )
     VALUES ($1, $2, $3, $4, COALESCE($5, 'NORMAL'), $6, $7, $8, $9, 'PENDING')
     RETURNING *`,
    [
      input.hospitalId,
      input.bloodBankId,
      input.bloodGroup,
      input.quantity,
      input.urgency ?? 'NORMAL',
      input.message ? input.message.trim() : null,
      input.notes ? input.notes.trim() : null,
      input.requiredDate ? input.requiredDate : null,
      input.patientName ? input.patientName.trim() : null
    ]
  );
  return result.rows[0];
};

/**
 * Retrieve all blood requests created by a specific hospital.
 */
export const findBloodRequestsByHospital = async (
  hospitalId: string,
  userId?: string
): Promise<BloodRequest[]> => {
  const result = await query(
    `SELECT
       r.id,
       r.hospital_id,
       r.blood_bank_id,
       r.blood_group,
       r.quantity,
       r.urgency,
       r.message,
       r.notes,
       r.required_date,
       r.patient_name,
       r.status,
       r.created_at,
       r.updated_at,
       bb.name AS blood_bank_name,
       bb.city AS blood_bank_city,
       bb.phone AS blood_bank_phone,
       bb.address AS blood_bank_address
     FROM blood_requests r
     LEFT JOIN blood_banks bb ON r.blood_bank_id = bb.id
     WHERE r.hospital_id = $1 OR ($2::uuid IS NOT NULL AND r.hospital_id = $2::uuid)
     ORDER BY r.created_at DESC`,
    [hospitalId, userId ?? null]
  );
  return result.rows;
};

/**
 * Retrieve all blood requests received by a specific blood bank.
 */
export const findBloodRequestsByBloodBank = async (
  bloodBankId: string
): Promise<BloodRequest[]> => {
  const result = await query(
    `SELECT
       r.id,
       r.hospital_id,
       r.blood_bank_id,
       r.blood_group,
       r.quantity,
       r.urgency,
       r.message,
       r.notes,
       r.required_date,
       r.patient_name,
       r.status,
       r.created_at,
       r.updated_at,
       COALESCE(h.name, u.name) AS hospital_name,
       COALESCE(h.city, u.city) AS hospital_city,
       COALESCE(h.phone, u.phone) AS hospital_phone,
       h.address AS hospital_address
     FROM blood_requests r
     LEFT JOIN hospitals h ON (r.hospital_id = h.id OR r.hospital_id = h.user_id)
     LEFT JOIN users u ON r.hospital_id = u.id
     WHERE r.blood_bank_id = $1
     ORDER BY r.created_at DESC`,
    [bloodBankId]
  );
  return result.rows;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Find a specific blood request by ID with joined details.
 */
export const findBloodRequestById = async (requestId: string): Promise<BloodRequest | null> => {
  if (!requestId || !UUID_REGEX.test(requestId)) {
    return null;
  }
  const result = await query(
    `SELECT
       r.id,
       r.hospital_id,
       r.blood_bank_id,
       r.blood_group,
       r.quantity,
       r.urgency,
       r.message,
       r.notes,
       r.required_date,
       r.patient_name,
       r.status,
       r.created_at,
       r.updated_at,
       COALESCE(h.name, u.name) AS hospital_name,
       COALESCE(h.city, u.city) AS hospital_city,
       COALESCE(h.phone, u.phone) AS hospital_phone,
       h.address AS hospital_address,
       bb.name AS blood_bank_name,
       bb.city AS blood_bank_city,
       bb.phone AS blood_bank_phone,
       bb.address AS blood_bank_address
     FROM blood_requests r
     LEFT JOIN hospitals h ON (r.hospital_id = h.id OR r.hospital_id = h.user_id)
     LEFT JOIN users u ON r.hospital_id = u.id
     LEFT JOIN blood_banks bb ON r.blood_bank_id = bb.id
     WHERE r.id = $1
     LIMIT 1`,
    [requestId]
  );
  return result.rows[0] ?? null;
};

/**
 * Update the status of a blood request (e.g. ACCEPTED, REJECTED, CANCELLED).
 */
export const updateBloodRequestStatus = async (
  requestId: string,
  newStatus: BloodRequestStatus,
  expectedBloodBankId?: string,
  expectedHospitalId?: string,
  expectedHospitalUserId?: string
): Promise<{ success: boolean; request?: BloodRequest; error?: string; statusCode?: number }> => {
  const request = await findBloodRequestById(requestId);
  if (!request) {
    return { success: false, error: 'Blood request not found', statusCode: 404 };
  }

  // Ownership validation for Blood Bank
  if (expectedBloodBankId && request.blood_bank_id !== expectedBloodBankId) {
    return {
      success: false,
      error: 'You do not have permission to manage requests for another blood bank',
      statusCode: 403
    };
  }

  // Ownership validation for Hospital
  if (expectedHospitalId) {
    const isOwner =
      request.hospital_id === expectedHospitalId ||
      (expectedHospitalUserId && request.hospital_id === expectedHospitalUserId);
    if (!isOwner) {
      return {
        success: false,
        error: 'You do not have permission to modify this request',
        statusCode: 403
      };
    }
  }

  // Prevent modifying already fulfilled or cancelled requests
  if (request.status === 'FULFILLED') {
    return {
      success: false,
      error: 'Cannot update status of an already fulfilled request',
      statusCode: 409
    };
  }

  if (request.status === 'CANCELLED') {
    return {
      success: false,
      error: 'Cannot update status of a cancelled request',
      statusCode: 400
    };
  }

  const result = await query(
    `UPDATE blood_requests
     SET status = $1, updated_at = now()
     WHERE id = $2
     RETURNING *`,
    [newStatus, requestId]
  );

  return { success: true, request: result.rows[0] };
};

/**
 * Safely fulfill a blood request and deduct inventory using an atomic database transaction.
 * Prevents race conditions, duplicate deductions, and negative inventory.
 */
export const fulfillBloodRequestAndDeductInventory = async (
  requestId: string,
  bloodBankId: string
): Promise<{
  success: boolean;
  request?: BloodRequest;
  remainingInventory?: number;
  error?: string;
  statusCode?: number;
}> => {
  if (!requestId || !UUID_REGEX.test(requestId)) {
    return { success: false, error: 'Blood request not found', statusCode: 404 };
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch request with row-level lock
    const reqResult = await client.query(
      `SELECT * FROM blood_requests WHERE id = $1 FOR UPDATE`,
      [requestId]
    );

    if (reqResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Blood request not found', statusCode: 404 };
    }

    const request: BloodRequest = reqResult.rows[0];

    // 2. Ownership check
    if (request.blood_bank_id !== bloodBankId) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'You do not have permission to fulfill requests for another blood bank',
        statusCode: 403
      };
    }

    // 3. Status validation
    if (request.status === 'FULFILLED') {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Blood request has already been fulfilled',
        statusCode: 409
      };
    }

    if (request.status === 'REJECTED' || request.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Cannot fulfill a request with status ${request.status}`,
        statusCode: 400
      };
    }

    // 4. Lock and check inventory
    const invResult = await client.query(
      `SELECT id, quantity FROM blood_inventory
       WHERE blood_bank_id = $1 AND blood_group = $2
       FOR UPDATE`,
      [request.blood_bank_id, request.blood_group]
    );

    if (invResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `No inventory record found for blood group ${request.blood_group}`,
        statusCode: 400
      };
    }

    const currentQty: number = invResult.rows[0].quantity;
    if (currentQty < request.quantity) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Insufficient inventory. Available: ${currentQty}, Requested: ${request.quantity}`,
        statusCode: 400
      };
    }

    // 5. Deduct inventory
    const newQty = currentQty - request.quantity;
    await client.query(
      `UPDATE blood_inventory
       SET quantity = $1, updated_at = now()
       WHERE id = $2`,
      [newQty, invResult.rows[0].id]
    );

    // 6. Update request status to FULFILLED
    const updatedReqRes = await client.query(
      `UPDATE blood_requests
       SET status = 'FULFILLED', updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [requestId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      request: updatedReqRes.rows[0],
      remainingInventory: newQty
    };
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return { success: false, error: message, statusCode: 500 };
  } finally {
    client.release();
  }
};
