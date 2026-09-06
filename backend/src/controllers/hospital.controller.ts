import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool, { query } from '../config/database';
import { findUserByEmail, findUserById, BloodGroup } from '../models/user.model';
import {
  findHospitalById,
  findHospitalByUserId,
  createHospitalRecord,
  updateHospitalProfile
} from '../models/hospital.model';
import {
  createBloodRequest,
  findActiveBloodRequest,
  findBloodRequestsByHospital,
  findBloodRequestById,
  updateBloodRequestStatus,
  BloodRequestUrgency
} from '../models/bloodRequest.model';
import { findBloodBankById } from '../models/bloodBank.model';
import { ALL_BLOOD_GROUPS } from '../models/bloodInventory.model';
import { signToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

const paramToString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] ?? '';
  return param ?? '';
};

/**
 * Helper to retrieve the authenticated hospital entity.
 */
export const getAuthenticatedHospital = async (req: AuthenticatedRequest) => {
  const userId = req.user?.userId;
  if (!userId) return null;
  return findHospitalByUserId(userId);
};

/**
 * POST /api/hospital/register
 * Register a new Hospital organization and authenticated user.
 */
export const registerHospital = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const {
      hospitalName,
      name,
      officialEmail,
      email,
      password,
      phone,
      city,
      address,
      fullAddress,
      openingHours,
      operatingHours,
      emergencyContact,
      hospitalType
    } = req.body ?? {};

    const orgName = (hospitalName ?? name)?.trim();
    const orgEmail = (officialEmail ?? email)?.trim().toLowerCase();
    const orgAddress = (address ?? fullAddress)?.trim();
    const orgCity = city ? String(city).trim() : '';
    const orgPhone = phone ? String(phone).trim() : '';
    const orgHours = (openingHours ?? operatingHours)?.trim() || '24/7 Available';
    const orgEmergency = emergencyContact ? String(emergencyContact).trim() : null;
    const orgType = hospitalType ? String(hospitalType).trim() : 'GENERAL';

    // 1. Validation
    if (!orgName || orgName.length < 2) {
      res.status(400).json({ success: false, message: 'Hospital Name is required and cannot be empty' });
      return;
    }
    if (!orgEmail || !EMAIL_REGEX.test(orgEmail)) {
      res.status(400).json({ success: false, message: 'A valid official email is required' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }
    if (!SPECIAL_CHAR_REGEX.test(password)) {
      res.status(400).json({
        success: false,
        message: 'Password must contain at least one special character (!@#$%^&* etc.)'
      });
      return;
    }
    if (!orgPhone || orgPhone.length < 7) {
      res.status(400).json({ success: false, message: 'A valid phone number is required' });
      return;
    }
    if (!orgCity || orgCity.length < 2) {
      res.status(400).json({ success: false, message: 'City is required' });
      return;
    }
    if (!orgAddress || orgAddress.length < 5) {
      res.status(400).json({ success: false, message: 'Full Address is required' });
      return;
    }

    // 2. Check existing email
    const existingUser = await findUserByEmail(orgEmail);
    if (existingUser) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    await client.query('BEGIN');

    // 3. Create user record with role 'hospital'
    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, phone, city, role)
       VALUES ($1, $2, $3, $4, $5, 'hospital')
       RETURNING id, name, email, phone, city, role, created_at`,
      [orgName, orgEmail, passwordHash, orgPhone, orgCity]
    );
    const createdUser = userRes.rows[0];

    // 4. Create hospital record
    const hospitalRes = await client.query(
      `INSERT INTO hospitals (user_id, name, address, city, phone, email, operating_hours, emergency_contact, hospital_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [createdUser.id, orgName, orgAddress, orgCity, orgPhone, orgEmail, orgHours, orgEmergency, orgType]
    );
    const createdHospital = hospitalRes.rows[0];

    await client.query('COMMIT');

    const token = signToken({ userId: createdUser.id, role: 'hospital' });

    res.status(201).json({
      success: true,
      message: 'Hospital registered successfully',
      token,
      data: {
        hospital: {
          id: createdHospital.id,
          userId: createdUser.id,
          name: createdHospital.name,
          email: createdHospital.email,
          phone: createdHospital.phone,
          city: createdHospital.city,
          address: createdHospital.address,
          openingHours: createdHospital.operating_hours,
          emergencyContact: createdHospital.emergency_contact,
          hospitalType: createdHospital.hospital_type,
          role: 'hospital',
          createdAt: createdHospital.created_at
        },
        user: {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          role: 'hospital'
        },
        token
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Hospital registration failed', error: message });
  } finally {
    client.release();
  }
};

/**
 * POST /api/hospital/login
 * Authenticate hospital account using existing auth system.
 */
export const loginHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (user.role !== 'hospital' && user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Access denied: Hospital account required' });
      return;
    }

    const hospital = await findHospitalByUserId(user.id);
    const token = signToken({ userId: user.id, role: user.role });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        hospitalId: hospital?.id ?? user.id,
        name: hospital?.name ?? user.name,
        email: user.email,
        role: user.role
      },
      data: {
        user: {
          id: user.id,
          name: hospital?.name ?? user.name,
          email: user.email,
          role: user.role
        },
        hospital: hospital
          ? {
              id: hospital.id,
              userId: user.id,
              name: hospital.name,
              email: hospital.email,
              phone: hospital.phone,
              city: hospital.city,
              address: hospital.address,
              openingHours: hospital.operating_hours,
              emergencyContact: hospital.emergency_contact,
              hospitalType: hospital.hospital_type
            }
          : null,
        token
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Login failed', error: message });
  }
};

/**
 * GET /api/hospital/profile
 * Retrieve authenticated hospital's own profile.
 */
export const getHospitalProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const hospital = await getAuthenticatedHospital(req);
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found for this account' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: hospital.id,
        hospitalId: hospital.id,
        userId: hospital.user_id,
        name: hospital.name,
        email: hospital.email,
        phone: hospital.phone,
        city: hospital.city,
        address: hospital.address,
        openingHours: hospital.operating_hours,
        emergencyContact: hospital.emergency_contact,
        hospitalType: hospital.hospital_type,
        createdAt: hospital.created_at,
        updatedAt: hospital.updated_at
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to retrieve profile', error: message });
  }
};

/**
 * PUT/PATCH /api/hospital/profile
 * Update authenticated hospital's editable profile fields.
 */
export const updateHospitalProfileHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const hospital = await getAuthenticatedHospital(req);
    if (!hospital) {
      res.status(404).json({ success: false, message: 'Hospital profile not found' });
      return;
    }

    const {
      name,
      hospitalName,
      phone,
      city,
      address,
      fullAddress,
      openingHours,
      operatingHours,
      emergencyContact,
      hospitalType
    } = req.body ?? {};

    const updated = await updateHospitalProfile(hospital.id, {
      name: (hospitalName ?? name)?.trim(),
      phone: phone ? String(phone).trim() : undefined,
      city: city ? String(city).trim() : undefined,
      address: (fullAddress ?? address)?.trim(),
      operatingHours: (openingHours ?? operatingHours)?.trim(),
      emergencyContact: emergencyContact ? String(emergencyContact).trim() : undefined,
      hospitalType: hospitalType ? String(hospitalType).trim() : undefined
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updated?.id,
        hospitalId: updated?.id,
        name: updated?.name,
        email: updated?.email,
        phone: updated?.phone,
        city: updated?.city,
        address: updated?.address,
        openingHours: updated?.operating_hours,
        emergencyContact: updated?.emergency_contact,
        hospitalType: updated?.hospital_type,
        updatedAt: updated?.updated_at
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to update profile', error: message });
  }
};

/**
 * GET /api/hospital/blood/search
 * Read-only search for available blood in registered blood banks.
 * Only returns blood banks that have sufficient inventory (canFulfill = true).
 */
export const searchBloodForHospital = async (req: Request, res: Response): Promise<void> => {
  try {
    let rawBloodGroup = typeof req.query.bloodGroup === 'string' ? req.query.bloodGroup.trim().toUpperCase() : undefined;
    if (rawBloodGroup) {
      rawBloodGroup = rawBloodGroup.replace(/\s+/g, '+');
    }

    const rawQty = req.query.quantity;
    const quantity = rawQty !== undefined && rawQty !== '' ? Number(rawQty) : 1;

    if (isNaN(quantity) || quantity <= 0) {
      res.status(400).json({
        success: false,
        message: 'Quantity must be a positive numeric value greater than 0'
      });
      return;
    }

    if (rawBloodGroup && !ALL_BLOOD_GROUPS.includes(rawBloodGroup as BloodGroup)) {
      res.status(400).json({
        success: false,
        message: `Invalid blood group. Supported: ${ALL_BLOOD_GROUPS.join(', ')}`
      });
      return;
    }

    const city = typeof req.query.city === 'string' ? req.query.city.trim() : undefined;
    const urgency = typeof req.query.urgency === 'string' ? req.query.urgency.trim().toUpperCase() : undefined;
    const facilityName = typeof req.query.facilityName === 'string' ? req.query.facilityName.trim() :
                         typeof req.query.query === 'string' ? req.query.query.trim() : undefined;

    const conditions: string[] = [
      'b.is_donation_capable = TRUE',
      "NOT (b.name ~ '[0-9]{4,}' OR b.name ILIKE 'LifeFlow Center%' OR b.name ILIKE '%Test Blood Bank%' OR b.name ILIKE 'Apollo Blood Bank Chennai')"
    ];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (city) {
      params.push(city);
      conditions.push(`(LOWER(b.city) = LOWER($${paramIdx}) OR b.city ILIKE '%' || $${paramIdx} || '%')`);
      paramIdx++;
    }

    if (facilityName) {
      params.push(facilityName);
      conditions.push(`b.name ILIKE '%' || $${paramIdx} || '%'`);
      paramIdx++;
    }

    if (rawBloodGroup) {
      params.push(rawBloodGroup);
      conditions.push(`bi.blood_group = $${paramIdx}`);
      paramIdx++;
    }

    // Only return blood banks that have sufficient inventory (bi.quantity >= quantity)
    params.push(quantity);
    conditions.push(`bi.quantity >= $${paramIdx}`);
    paramIdx++;

    const sql = `
      SELECT
        b.id AS "bloodBankId",
        b.name,
        b.city,
        b.address,
        b.phone,
        b.operating_hours AS "openingHours",
        bi.blood_group AS "bloodGroup",
        bi.quantity AS "availableQuantity",
        TRUE AS "canFulfill"
      FROM blood_banks b
      JOIN blood_inventory bi ON b.id = bi.blood_bank_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY bi.quantity DESC, b.name ASC
    `;

    const result = await query(sql, params);

    // Rule 10: Deduplicate by normalized name and ID so each facility appears ONLY ONCE
    const seen = new Set<string>();
    const deduplicatedRows = [];
    for (const row of result.rows) {
      const normKey = row.name.trim().toLowerCase();
      if (!seen.has(normKey) && !seen.has(row.bloodBankId)) {
        seen.add(normKey);
        seen.add(row.bloodBankId);
        deduplicatedRows.push({
          ...row,
          isLive: true,
          source: 'LIVE'
        });
      }
    }

    res.status(200).json({
      success: true,
      count: deduplicatedRows.length,
      requestedQuantity: quantity,
      requestedBloodGroup: rawBloodGroup ?? null,
      city: city ?? null,
      urgency: urgency ?? 'NORMAL',
      data: deduplicatedRows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Search failed', error: message });
  }
};

/**
 * GET /api/hospital/organizations
 * Retrieve registered Real Database Organizations (Blood Banks and Hospitals)
 * for autocomplete and manual search.
 */
export const getHospitalOrganizations = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : undefined;
    const search = typeof req.query.query === 'string' ? req.query.query.trim() : undefined;

    const conditionsBB: string[] = [
      'b.is_donation_capable = TRUE',
      "NOT (b.name ~ '[0-9]{4,}' OR b.name ILIKE 'LifeFlow Center%' OR b.name ILIKE '%Test Blood Bank%' OR b.name ILIKE 'Apollo Blood Bank Chennai')"
    ];
    const paramsBB: unknown[] = [];
    let pIdx = 1;

    if (city) {
      conditionsBB.push(`(LOWER(b.city) = LOWER($${pIdx}) OR b.city ILIKE '%' || $${pIdx} || '%')`);
      paramsBB.push(city);
      pIdx++;
    }
    if (search) {
      conditionsBB.push(`b.name ILIKE '%' || $${pIdx} || '%'`);
      paramsBB.push(search);
      pIdx++;
    }

    const bbSql = `
      SELECT id, name, city, address, phone, operating_hours AS "openingHours", 'Blood Bank' AS type, TRUE AS "isLive"
      FROM blood_banks b
      WHERE ${conditionsBB.join(' AND ')}
      ORDER BY b.name ASC
    `;
    const bbRes = await query(bbSql, paramsBB);

    const conditionsHosp: string[] = [
      "NOT (h.name ~ '[0-9]{4,}' OR h.name ILIKE '%Test Hosp%')"
    ];
    const paramsHosp: unknown[] = [];
    let hIdx = 1;

    if (city) {
      conditionsHosp.push(`(LOWER(h.city) = LOWER($${hIdx}) OR h.city ILIKE '%' || $${hIdx} || '%')`);
      paramsHosp.push(city);
      hIdx++;
    }
    if (search) {
      conditionsHosp.push(`h.name ILIKE '%' || $${hIdx} || '%'`);
      paramsHosp.push(search);
      hIdx++;
    }

    const hospSql = `
      SELECT id, name, city, address, phone, operating_hours AS "openingHours", 'Hospital' AS type, TRUE AS "isLive"
      FROM hospitals h
      WHERE ${conditionsHosp.join(' AND ')}
      ORDER BY h.name ASC
    `;
    const hospRes = await query(hospSql, paramsHosp);

    // Deduplicate by normalized name
    const seen = new Set<string>();
    const allOrgs: Array<{
      id: string;
      name: string;
      city: string;
      address: string;
      phone: string;
      openingHours?: string;
      type: string;
      isLive: boolean;
    }> = [];

    for (const r of [...bbRes.rows, ...hospRes.rows]) {
      const key = `${r.type}:${r.name.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        allOrgs.push(r);
      }
    }

    res.status(200).json({
      success: true,
      count: allOrgs.length,
      data: allOrgs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to fetch organizations', error: message });
  }
};

/**
 * POST /api/hospital/requests
 * Create a new blood request from the authenticated hospital to a specific Blood Bank.
 * IMPORTANT: Creating a request does NOT decrease inventory.
 */
export const createBloodRequestHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const hospital = await getAuthenticatedHospital(req);
    const hospitalId = hospital?.id ?? req.user?.userId;

    if (!hospitalId) {
      res.status(403).json({ success: false, message: 'Hospital identification required' });
      return;
    }

    const {
      bloodBankId,
      bloodGroup,
      quantity,
      urgency,
      message,
      notes,
      requiredDate,
      patientName
    } = req.body ?? {};

    // 1. Validate bloodBankId
    if (!bloodBankId || typeof bloodBankId !== 'string') {
      res.status(400).json({ success: false, message: 'A specific Blood Bank ID is required' });
      return;
    }

    const bloodBank = await findBloodBankById(bloodBankId);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'The selected Blood Bank was not found' });
      return;
    }

    // 2. Validate bloodGroup
    let formattedBloodGroup = typeof bloodGroup === 'string' ? bloodGroup.trim().toUpperCase() : '';
    formattedBloodGroup = formattedBloodGroup.replace(/\s+/g, '+');

    if (!formattedBloodGroup || !ALL_BLOOD_GROUPS.includes(formattedBloodGroup as BloodGroup)) {
      res.status(400).json({
        success: false,
        message: `Invalid blood group. Supported: ${ALL_BLOOD_GROUPS.join(', ')}`
      });
      return;
    }

    // 3. Validate quantity
    const parsedQuantity = Number(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      res.status(400).json({ success: false, message: 'Quantity must be a positive number greater than 0' });
      return;
    }

    // 4. Validate urgency
    const validUrgencies: BloodRequestUrgency[] = ['LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'];
    let formattedUrgency: BloodRequestUrgency = 'NORMAL';
    if (urgency && typeof urgency === 'string') {
      const upperUrgency = urgency.trim().toUpperCase() as BloodRequestUrgency;
      if (validUrgencies.includes(upperUrgency)) {
        formattedUrgency = upperUrgency;
      }
    }

    // 4b. Active Request Duplicate Prevention (Rule 1):
    // For the same hospital and same blood bank, only ONE active request (PENDING or ACCEPTED) is allowed.
    const existingActive = await findActiveBloodRequest(hospitalId, bloodBank.id, req.user?.userId);
    if (existingActive) {
      res.status(409).json({
        success: false,
        message: 'An active blood request already exists with this blood bank.',
        data: {
          existingRequest: {
            id: existingActive.id,
            bloodBankId: existingActive.blood_bank_id,
            bloodBankName: existingActive.blood_bank_name || bloodBank.name,
            bloodGroup: existingActive.blood_group,
            quantity: existingActive.quantity,
            urgency: existingActive.urgency,
            status: existingActive.status,
            createdAt: existingActive.created_at
          }
        }
      });
      return;
    }

    // 5. Create blood request (does NOT decrease inventory)
    const newRequest = await createBloodRequest({
      hospitalId,
      bloodBankId: bloodBank.id,
      bloodGroup: formattedBloodGroup as BloodGroup,
      quantity: parsedQuantity,
      urgency: formattedUrgency,
      message: message ?? notes ?? null,
      notes: notes ?? null,
      requiredDate: requiredDate ?? null,
      patientName: patientName ?? null
    });

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully',
      data: {
        request: {
          id: newRequest.id,
          requestId: newRequest.id,
          hospitalId: newRequest.hospital_id,
          bloodBankId: newRequest.blood_bank_id,
          bloodBankName: bloodBank.name,
          bloodGroup: newRequest.blood_group,
          quantity: newRequest.quantity,
          urgency: newRequest.urgency,
          message: newRequest.message,
          status: newRequest.status,
          createdAt: newRequest.created_at,
          updatedAt: newRequest.updated_at
        }
      }
    });
  } catch (error) {
    if ((error as { code?: string })?.code === '23505') {
      res.status(409).json({
        success: false,
        message: 'An active blood request already exists with this blood bank.'
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to create blood request', error: message });
  }
};

/**
 * GET /api/hospital/requests
 * View blood requests created by the authenticated hospital.
 */
export const getHospitalRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const hospital = await getAuthenticatedHospital(req);
    const hospitalId = hospital?.id ?? req.user?.userId;
    const userId = req.user?.userId;

    if (!hospitalId) {
      res.status(403).json({ success: false, message: 'Hospital identification required' });
      return;
    }

    const requests = await findBloodRequestsByHospital(hospitalId, userId);

    res.status(200).json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to retrieve blood requests', error: message });
  }
};

/**
 * GET /api/hospital/requests/:id
 * Retrieve details of a specific blood request owned by the authenticated hospital.
 */
export const getHospitalRequestById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requestId = paramToString(req.params.id);
    const hospital = await getAuthenticatedHospital(req);
    const hospitalId = hospital?.id ?? req.user?.userId;
    const userId = req.user?.userId;

    const request = await findBloodRequestById(requestId);
    if (!request) {
      res.status(404).json({ success: false, message: 'Blood request not found' });
      return;
    }

    // Ownership check
    const isOwner = request.hospital_id === hospitalId || request.hospital_id === userId;
    if (!isOwner && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view requests belonging to another hospital'
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
 * PATCH /api/hospital/requests/:id/cancel
 * Hospital cancels its own pending request.
 */
export const cancelHospitalRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requestId = paramToString(req.params.id);
    const hospital = await getAuthenticatedHospital(req);
    const hospitalId = hospital?.id ?? req.user?.userId;
    const userId = req.user?.userId;

    const result = await updateBloodRequestStatus(
      requestId,
      'CANCELLED',
      undefined,
      hospitalId,
      userId
    );

    if (!result.success) {
      res.status(result.statusCode ?? 400).json({ success: false, message: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Blood request cancelled successfully',
      data: { request: result.request }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to cancel blood request', error: message });
  }
};
