import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool, { query } from '../config/database';
import { createUser, findUserByEmail, findUserByPhone, findUserById, BloodGroup } from '../models/user.model';
import {
  findBloodBankByUserId,
  findBloodBankById,
  createBloodBankFacility,
  updateBloodBankProfile,
  searchBloodBanksWithInventory,
  searchBloodAvailability as searchAvailabilityQuery
} from '../models/bloodBank.model';
import {
  ALL_BLOOD_GROUPS,
  findInventoryByBloodBank,
  updateInventoryQuantity,
  initializeInventoryForBloodBank
} from '../models/bloodInventory.model';
import {
  findAppointmentsByBloodBank,
  findAppointmentByIdForBloodBank,
  updateAppointmentStatus,
  AppointmentStatus
} from '../models/appointment.model';
import { completeDonationAndIncrementInventory } from '../models/donation.model';
import {
  findBloodRequestsByBloodBank,
  findBloodRequestById,
  updateBloodRequestStatus,
  fulfillBloodRequestAndDeductInventory
} from '../models/bloodRequest.model';
import { signToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const paramToString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] ?? '';
  return param ?? '';
};

/**
 * POST /api/blood-banks/register
 * Register a new Blood Bank organization and authenticated account.
 */
export const registerBloodBank = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const {
      organizationName,
      name,
      email,
      password,
      phone,
      city,
      address,
      fullAddress,
      operatingHours,
      openingHours
    } = req.body ?? {};

    const orgName = (organizationName ?? name)?.trim();
    const orgAddress = (address ?? fullAddress)?.trim();
    const orgHours = (operatingHours ?? openingHours)?.trim() || '08:00 AM - 08:00 PM';
    const orgPhone = phone ? String(phone).trim() : null;
    const orgCity = city ? String(city).trim() : '';

    if (!orgName || orgName.length < 2) {
      res.status(400).json({ success: false, message: 'Organization name is required (at least 2 characters)' });
      return;
    }
    if (!orgCity || orgCity.length < 2) {
      res.status(400).json({ success: false, message: 'City is required (at least 2 characters)' });
      return;
    }
    if (!orgAddress || orgAddress.length < 5) {
      res.status(400).json({ success: false, message: 'Complete address is required (at least 5 characters)' });
      return;
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      res.status(400).json({ success: false, message: 'A valid email address is required' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }
    if (!orgPhone || orgPhone.length < 7) {
      res.status(400).json({ success: false, message: 'A valid phone number is required' });
      return;
    }

    const existingPhone = await findUserByPhone(orgPhone);
    if (existingPhone) {
      res.status(409).json({ success: false, message: 'This phone number is already in use. Please use a different phone number.' });
      return;
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    await client.query('BEGIN');

    // 1. Hash password & create user in users table
    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, phone, city, role)
       VALUES ($1, $2, $3, $4, $5, 'blood_bank')
       RETURNING *`,
      [orgName, email.toLowerCase().trim(), passwordHash, orgPhone, orgCity]
    );
    const createdUser = userRes.rows[0];

    // 2. Create blood_banks facility record
    const bloodBankRes = await client.query(
      `INSERT INTO blood_banks (user_id, name, address, city, phone, email, operating_hours, type, is_donation_capable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'BLOOD_BANK', TRUE)
       RETURNING *`,
      [createdUser.id, orgName, orgAddress, orgCity, orgPhone, email.toLowerCase().trim(), orgHours]
    );
    const createdBloodBank = bloodBankRes.rows[0];

    // 3. Initialize all 8 blood groups in blood_inventory
    await initializeInventoryForBloodBank(createdBloodBank.id, 0, client);

    await client.query('COMMIT');

    const token = signToken({ userId: createdUser.id, role: 'blood_bank' });

    res.status(201).json({
      success: true,
      message: 'Blood bank registered successfully',
      data: {
        bloodBank: {
          id: createdBloodBank.id,
          name: createdBloodBank.name,
          email: createdBloodBank.email,
          phone: createdBloodBank.phone,
          city: createdBloodBank.city,
          address: createdBloodBank.address,
          operatingHours: createdBloodBank.operating_hours,
          role: 'blood_bank',
          createdAt: createdBloodBank.created_at
        },
        token
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Blood bank registration failed', error: message });
  } finally {
    client.release();
  }
};

/**
 * Helper to get the blood bank entity associated with the authenticated request.
 */
const getAuthenticatedBloodBank = async (req: AuthenticatedRequest) => {
  const userId = req.user?.userId;
  if (!userId) return null;
  return findBloodBankByUserId(userId);
};

/**
 * GET /api/blood-banks/me/profile
 * Get authenticated blood bank profile.
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found for this account' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        profile: {
          id: bloodBank.id,
          organizationName: bloodBank.name,
          name: bloodBank.name,
          email: bloodBank.email,
          phone: bloodBank.phone,
          city: bloodBank.city,
          fullAddress: bloodBank.address,
          address: bloodBank.address,
          openingHours: bloodBank.operating_hours,
          operatingHours: bloodBank.operating_hours,
          role: 'blood_bank',
          createdAt: bloodBank.created_at,
          updatedAt: bloodBank.updated_at
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to retrieve profile', error: message });
  }
};

/**
 * PUT/PATCH /api/blood-banks/me/profile
 * Update authenticated blood bank profile.
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found for this account' });
      return;
    }

    const {
      organizationName,
      name,
      phone,
      city,
      address,
      fullAddress,
      operatingHours,
      openingHours,
      email
    } = req.body ?? {};

    if (phone && typeof phone === 'string' && phone.trim().length > 0) {
      const existingPhone = await findUserByPhone(phone.trim(), req.user?.userId);
      if (existingPhone) {
        res.status(409).json({ success: false, message: 'This phone number is already in use. Please use a different phone number.' });
        return;
      }
    }

    const updated = await updateBloodBankProfile(bloodBank.id, {
      name: organizationName ?? name,
      phone,
      city,
      address: address ?? fullAddress,
      operatingHours: operatingHours ?? openingHours,
      email
    });

    // Also sync users table name, phone, city if provided
    if (req.user?.userId) {
      await query(
        `UPDATE users
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             city = COALESCE($3, city),
             updated_at = now()
         WHERE id = $4`,
        [organizationName ?? name ?? null, phone ?? null, city ?? null, req.user.userId]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Blood bank profile updated successfully',
      data: {
        profile: {
          id: updated?.id,
          organizationName: updated?.name,
          name: updated?.name,
          email: updated?.email,
          phone: updated?.phone,
          city: updated?.city,
          fullAddress: updated?.address,
          address: updated?.address,
          openingHours: updated?.operating_hours,
          operatingHours: updated?.operating_hours,
          role: 'blood_bank',
          createdAt: updated?.created_at,
          updatedAt: updated?.updated_at
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to update profile', error: message });
  }
};

/**
 * GET /api/blood-banks/me/inventory
 * Return the complete 8-group inventory for the authenticated blood bank.
 */
export const getInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const inventory = await findInventoryByBloodBank(bloodBank.id);
    res.status(200).json({
      success: true,
      data: {
        bloodBankId: bloodBank.id,
        bloodBankName: bloodBank.name,
        inventory: inventory.map((item) => ({
          id: item.id,
          bloodGroup: item.blood_group,
          quantity: item.quantity,
          updatedAt: item.updated_at
        }))
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to retrieve inventory', error: message });
  }
};

/**
 * PUT/PATCH /api/blood-banks/me/inventory/:bloodGroup
 * Update the quantity for a specific blood group.
 */
export const updateInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const rawGroup = paramToString(req.params.bloodGroup).trim().toUpperCase();
    const bloodGroup = rawGroup as BloodGroup;

    if (!ALL_BLOOD_GROUPS.includes(bloodGroup)) {
      res.status(400).json({
        success: false,
        message: `Invalid blood group. Allowed: ${ALL_BLOOD_GROUPS.join(', ')}`
      });
      return;
    }

    const { quantity } = req.body ?? {};
    const parsedQuantity = Number(quantity);

    if (isNaN(parsedQuantity) || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      res.status(400).json({
        success: false,
        message: 'Quantity must be a non-negative integer'
      });
      return;
    }

    const updatedItem = await updateInventoryQuantity(bloodBank.id, bloodGroup, parsedQuantity);

    res.status(200).json({
      success: true,
      message: `Inventory for ${bloodGroup} updated to ${parsedQuantity} units`,
      data: {
        item: {
          id: updatedItem.id,
          bloodBankId: updatedItem.blood_bank_id,
          bloodGroup: updatedItem.blood_group,
          quantity: updatedItem.quantity,
          updatedAt: updatedItem.updated_at
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to update inventory', error: message });
  }
};

/**
 * GET /api/blood-banks/me/appointments
 * View donor appointments booked with this blood bank.
 */
export const getAppointments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
    const appointments = await findAppointmentsByBloodBank(bloodBank.id, statusFilter);

    res.status(200).json({
      success: true,
      data: {
        appointments: appointments.map((a) => ({
          appointmentId: a.id,
          id: a.id,
          donorId: a.donor_id,
          donorName: a.donor_name,
          donorEmail: a.donor_email,
          donorPhone: a.donor_phone,
          donorBloodGroup: a.donor_blood_group,
          donorCity: a.donor_city,
          appointmentDate: a.appointment_date,
          appointmentTime: a.appointment_time,
          status: a.status,
          notes: a.notes,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        }))
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to retrieve appointments', error: message });
  }
};

/**
 * PATCH /api/blood-banks/me/appointments/:appointmentId/approve
 * Approve an appointment (moves status from PENDING to CONFIRMED).
 * Note: Does NOT increase inventory.
 */
export const approveAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const appointmentId = paramToString(req.params.appointmentId);
    const appointment = await findAppointmentByIdForBloodBank(appointmentId, bloodBank.id);

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found for this blood bank' });
      return;
    }

    if (appointment.status === 'CONFIRMED') {
      res.status(400).json({ success: false, message: 'Appointment is already confirmed' });
      return;
    }

    if (appointment.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Cannot modify an already completed appointment' });
      return;
    }

    if (appointment.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Cannot approve a cancelled appointment' });
      return;
    }

    const updated = await updateAppointmentStatus(appointmentId, bloodBank.id, 'CONFIRMED');

    res.status(200).json({
      success: true,
      message: 'Appointment approved successfully',
      data: { appointment: updated }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to approve appointment', error: message });
  }
};

/**
 * PATCH /api/blood-banks/me/appointments/:appointmentId/reject
 * Reject a donor appointment (moves status to REJECTED).
 */
export const rejectAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const appointmentId = paramToString(req.params.appointmentId);
    const appointment = await findAppointmentByIdForBloodBank(appointmentId, bloodBank.id);

    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found for this blood bank' });
      return;
    }

    if (appointment.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Cannot reject an already completed appointment' });
      return;
    }

    if (appointment.status === 'REJECTED') {
      res.status(400).json({ success: false, message: 'Appointment is already rejected' });
      return;
    }

    const updated = await updateAppointmentStatus(appointmentId, bloodBank.id, 'REJECTED');

    res.status(200).json({
      success: true,
      message: 'Appointment rejected',
      data: { appointment: updated }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to reject appointment', error: message });
  }
};

/**
 * POST /api/blood-banks/me/appointments/:appointmentId/complete
 * Mark appointment as COMPLETED, create donation record, and atomically increment blood inventory.
 * Protected against duplicate requests.
 */
export const completeDonation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const appointmentId = paramToString(req.params.appointmentId);
    const { quantityMl = 450, unitsToAdd = 1 } = req.body ?? {};

    const result = await completeDonationAndIncrementInventory(
      appointmentId,
      bloodBank.id,
      Number(quantityMl) || 450,
      Number(unitsToAdd) || 1
    );

    res.status(200).json({
      success: true,
      message: 'Donation recorded as COMPLETED and blood inventory updated successfully',
      data: {
        donation: {
          id: result.donation.id,
          donorId: result.donation.donor_id,
          bloodBankId: result.donation.blood_bank_id,
          appointmentId: result.donation.appointment_id,
          bloodGroup: result.donation.blood_group,
          quantityMl: result.donation.quantity_ml,
          status: result.donation.status,
          donationDate: result.donation.donation_date
        },
        appointment: result.appointment,
        updatedInventory: {
          bloodGroup: result.inventoryItem.blood_group,
          newQuantity: result.inventoryItem.quantity,
          updatedAt: result.inventoryItem.updated_at
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Return 409 Conflict if already completed or duplicate
    if (message.includes('already been completed') || message.includes('already been credited')) {
      res.status(409).json({ success: false, message });
      return;
    }
    if (message.includes('not found')) {
      res.status(404).json({ success: false, message });
      return;
    }
    res.status(400).json({ success: false, message });
  }
};

/**
 * GET /api/blood-banks
 * Public read-only listing of registered blood banks with inventory.
 * Supports optional ?city= filter.
 */
export const getPublicBloodBanks = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const bloodBanks = await searchBloodBanksWithInventory(city);

    res.status(200).json({
      success: true,
      data: { bloodBanks }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to fetch blood banks', error: message });
  }
};

/**
 * GET /api/blood-banks/search
 * Public read-only search for blood availability (by city, bloodGroup, required quantity).
 */
export const searchBloodAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    let rawBloodGroup = typeof req.query.bloodGroup === 'string' ? req.query.bloodGroup.trim().toUpperCase() : undefined;
    if (rawBloodGroup) {
      rawBloodGroup = rawBloodGroup.replace(/\s+/g, '+');
    }
    const quantity = Number(req.query.quantity) || 1;

    if (rawBloodGroup && !ALL_BLOOD_GROUPS.includes(rawBloodGroup as BloodGroup)) {
      res.status(400).json({
        success: false,
        message: `Invalid blood group. Supported: ${ALL_BLOOD_GROUPS.join(', ')}`
      });
      return;
    }

    const results = await searchAvailabilityQuery(city, rawBloodGroup, quantity);

    res.status(200).json({
      success: true,
      data: {
        count: results.length,
        results
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to search blood availability', error: message });
  }
};

/**
 * GET /api/blood-banks/:id
 * Public read-only detail of single blood bank with inventory.
 */
export const getBloodBankById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = paramToString(req.params.id);
    const bloodBank = await findBloodBankById(id);

    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank not found' });
      return;
    }

    const inventory = await findInventoryByBloodBank(bloodBank.id);

    res.status(200).json({
      success: true,
      data: {
        bloodBank: {
          id: bloodBank.id,
          name: bloodBank.name,
          address: bloodBank.address,
          city: bloodBank.city,
          phone: bloodBank.phone,
          email: bloodBank.email,
          operatingHours: bloodBank.operating_hours,
          type: bloodBank.type,
          inventory: inventory.map((item) => ({
            bloodGroup: item.blood_group,
            quantity: item.quantity,
            updatedAt: item.updated_at
          }))
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to fetch blood bank details', error: message });
  }
};

/**
 * GET /api/blood-banks/me/requests
 * View incoming blood requests from hospitals.
 */
export const getIncomingRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const requests = await findBloodRequestsByBloodBank(bloodBank.id);

    res.status(200).json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to retrieve hospital requests', error: message });
  }
};

/**
 * GET /api/blood-banks/me/requests/:id
 * View details of a specific incoming blood request.
 */
export const getRequestDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const requestId = paramToString(req.params.requestId || req.params.id);
    const request = await findBloodRequestById(requestId);
    if (!request) {
      res.status(404).json({ success: false, message: 'Blood request not found' });
      return;
    }

    if (request.blood_bank_id !== bloodBank.id && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view requests for another blood bank'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { request }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to retrieve request details', error: message });
  }
};

/**
 * PATCH /api/blood-banks/me/requests/:id/accept
 * Accept an incoming hospital blood request.
 */
export const acceptRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const requestId = paramToString(req.params.requestId || req.params.id);
    const result = await updateBloodRequestStatus(requestId, 'ACCEPTED', bloodBank.id);

    if (!result.success) {
      res.status(result.statusCode ?? 400).json({ success: false, message: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Blood request accepted successfully',
      data: { request: result.request }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to accept blood request', error: message });
  }
};

/**
 * PATCH /api/blood-banks/me/requests/:id/reject
 * Reject an incoming hospital blood request.
 */
export const rejectRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const requestId = paramToString(req.params.requestId || req.params.id);
    const result = await updateBloodRequestStatus(requestId, 'REJECTED', bloodBank.id);

    if (!result.success) {
      res.status(result.statusCode ?? 400).json({ success: false, message: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Blood request rejected',
      data: { request: result.request }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to reject blood request', error: message });
  }
};

/**
 * PATCH /api/blood-banks/me/requests/:id/fulfill
 * Safely fulfill an incoming hospital blood request and deduct inventory.
 * Uses atomic transactions to prevent double-fulfillment and negative inventory.
 */
export const fulfillRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bloodBank = await getAuthenticatedBloodBank(req);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Blood bank profile not found' });
      return;
    }

    const requestId = paramToString(req.params.requestId || req.params.id);
    const result = await fulfillBloodRequestAndDeductInventory(requestId, bloodBank.id);

    if (!result.success) {
      res.status(result.statusCode ?? 400).json({ success: false, message: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Blood request fulfilled and inventory deducted successfully',
      data: {
        request: result.request,
        remainingInventory: result.remainingInventory
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to fulfill blood request', error: message });
  }
};
