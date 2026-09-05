import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { findUserById, updateUserProfile, toPublicUser, BloodGroup } from '../models/user.model';
import { findAllBloodBanks, findBloodBankById } from '../models/bloodBank.model';
import {
  createAppointment,
  findAppointmentsByDonor,
  findAppointmentById,
  cancelAppointment as cancelAppointmentModel,
  findConflictingAppointment,
  findUpcomingAppointmentForDonor
} from '../models/appointment.model';
import {
  findDonationsByDonor,
  countCompletedDonationsByDonor,
  getLatestCompletedDonation
} from '../models/donation.model';

const VALID_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const WHOLE_BLOOD_WAITING_PERIOD_DAYS = 90;

/**
 * GET /api/donor/profile
 * Get authenticated donor's own profile.
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Donor profile not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user: toPublicUser(user) }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to retrieve profile', error: message });
  }
};

/**
 * PUT /api/donor/profile
 * Update authenticated donor's own profile fields (name, phone, bloodGroup).
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { name, phone, bloodGroup, city } = req.body ?? {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
        return;
      }
    }

    if (phone !== undefined && phone !== null && phone !== '') {
      const digitsOnly = String(phone).replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        res.status(400).json({ success: false, message: 'Phone number must be at least 10 digits' });
        return;
      }
    }

    if (bloodGroup !== undefined && bloodGroup !== null && bloodGroup !== '') {
      if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
        res.status(400).json({ success: false, message: 'Invalid blood group specified' });
        return;
      }
    }

    if (city !== undefined && city !== null && city !== '') {
      if (typeof city !== 'string' || city.trim().length < 2) {
        res.status(400).json({ success: false, message: 'City must be at least 2 characters' });
        return;
      }
    }

    const updatedUser = await updateUserProfile(userId, {
      name,
      phone: phone || null,
      bloodGroup: bloodGroup || null,
      city: city ? city.trim() : city === null ? null : undefined
    });

    if (!updatedUser) {
      res.status(404).json({ success: false, message: 'Donor profile not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: toPublicUser(updatedUser) }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to update profile', error: message });
  }
};

/**
 * GET /api/donor/blood-banks
 * List certified blood bank facilities so the donor can choose one when booking.
 * Supports optional ?city= filter.
 */
export const getBloodBanks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const bloodBanks = await findAllBloodBanks(city);
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
 * POST /api/donor/appointments
 * Book a new donation appointment with a selected blood bank.
 */
export const bookAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const donorId = req.user?.userId;
    if (!donorId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { bloodBankId, appointmentDate, appointmentTime, notes } = req.body ?? {};

    // 1. Validate blood bank
    if (!bloodBankId || typeof bloodBankId !== 'string') {
      res.status(400).json({ success: false, message: 'Please select a donation center / blood bank' });
      return;
    }
    const bloodBank = await findBloodBankById(bloodBankId);
    if (!bloodBank) {
      res.status(404).json({ success: false, message: 'Selected blood bank does not exist' });
      return;
    }

    // 2. Validate date format and ensure it's not in the past
    if (!appointmentDate || typeof appointmentDate !== 'string') {
      res.status(400).json({ success: false, message: 'Appointment date is required (YYYY-MM-DD)' });
      return;
    }
    const parsedDate = new Date(appointmentDate);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid appointment date format' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDateObj = new Date(appointmentDate);
    appointmentDateObj.setHours(0, 0, 0, 0);

    if (appointmentDateObj < today) {
      res.status(400).json({ success: false, message: 'Appointment date cannot be in the past' });
      return;
    }

    // 3. Validate appointment time
    if (!appointmentTime || typeof appointmentTime !== 'string' || !appointmentTime.trim()) {
      res.status(400).json({ success: false, message: 'Appointment time is required (e.g. 10:00 AM)' });
      return;
    }

    // 4. Check for conflicting appointment
    const conflicting = await findConflictingAppointment(donorId, appointmentDate, appointmentTime.trim());
    if (conflicting) {
      res.status(409).json({
        success: false,
        message: 'You already have an active appointment scheduled on this date at the same time.'
      });
      return;
    }

    // 5. Create appointment
    const appointment = await createAppointment({
      donorId,
      bloodBankId,
      appointmentDate,
      appointmentTime: appointmentTime.trim(),
      notes: notes ? String(notes).trim() : null
    });

    res.status(201).json({
      success: true,
      message: 'Donation appointment scheduled successfully.',
      data: {
        appointment: {
          ...appointment,
          bloodBankName: bloodBank.name,
          bloodBankAddress: bloodBank.address,
          bloodBankCity: bloodBank.city
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to book appointment', error: message });
  }
};

/**
 * GET /api/donor/appointments
 * List all appointments booked by the authenticated donor.
 */
export const getAppointments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const donorId = req.user?.userId;
    if (!donorId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const appointments = await findAppointmentsByDonor(donorId);
    res.status(200).json({
      success: true,
      data: { appointments }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to fetch appointments', error: message });
  }
};

/**
 * GET /api/donor/appointments/:id
 * Retrieve a specific appointment for the authenticated donor.
 */
export const getAppointmentDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const donorId = req.user?.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!donorId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!id) {
      res.status(400).json({ success: false, message: 'Appointment ID is required' });
      return;
    }

    const appointment = await findAppointmentById(id, donorId);
    if (!appointment) {
      res.status(404).json({ success: false, message: 'Appointment not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { appointment }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to fetch appointment details', error: message });
  }
};

/**
 * PATCH /api/donor/appointments/:id/cancel
 * Cancel an upcoming appointment.
 */
export const cancelAppointmentHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const donorId = req.user?.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!donorId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (!id) {
      res.status(400).json({ success: false, message: 'Appointment ID is required' });
      return;
    }

    const cancelled = await cancelAppointmentModel(id, donorId);
    if (!cancelled) {
      res.status(400).json({
        success: false,
        message: 'Appointment could not be cancelled. It may have already been cancelled or completed.'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
      data: { appointment: cancelled }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to cancel appointment', error: message });
  }
};

/**
 * GET /api/donor/donations
 * View donor's historical completed donations.
 */
export const getDonations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const donorId = req.user?.userId;
    if (!donorId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const donations = await findDonationsByDonor(donorId);
    res.status(200).json({
      success: true,
      data: { donations }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to fetch donations', error: message });
  }
};

/**
 * GET /api/donor/donations/count
 * Retrieve total number of completed donations (calculated dynamically).
 */
export const getDonationCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const donorId = req.user?.userId;
    if (!donorId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const totalDonations = await countCompletedDonationsByDonor(donorId);
    res.status(200).json({
      success: true,
      data: { totalDonations }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to calculate donation count', error: message });
  }
};

/**
 * GET /api/donor/eligibility
 * Determine donor's current eligibility status based on:
 * 1. 90-day waiting period since most recent completed donation.
 * 2. Any active upcoming scheduled appointment.
 */
export const getEligibilityStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const donorId = req.user?.userId;
    if (!donorId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const latestDonation = await getLatestCompletedDonation(donorId);
    const upcomingAppointment = await findUpcomingAppointmentForDonor(donorId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let isEligible = true;
    let nextEligibleDate = today.toISOString().split('T')[0];
    let daysRemaining = 0;
    let statusMessage = 'You are eligible to donate blood.';

    if (latestDonation?.donation_date) {
      const lastDonationDate = new Date(latestDonation.donation_date);
      lastDonationDate.setHours(0, 0, 0, 0);

      const eligibleDate = new Date(lastDonationDate);
      eligibleDate.setDate(eligibleDate.getDate() + WHOLE_BLOOD_WAITING_PERIOD_DAYS);

      nextEligibleDate = eligibleDate.toISOString().split('T')[0];

      const diffMs = eligibleDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        isEligible = false;
        daysRemaining = diffDays;
        statusMessage = `Please wait ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} before your next donation. Next eligible date is ${nextEligibleDate}.`;
      } else {
        isEligible = true;
        daysRemaining = 0;
        statusMessage = 'You have completed the required waiting period and are eligible to donate.';
      }
    }

    res.status(200).json({
      success: true,
      data: {
        isEligible,
        nextEligibleDate,
        daysRemaining,
        statusMessage,
        lastDonationDate: latestDonation?.donation_date ?? null,
        hasUpcomingAppointment: !!upcomingAppointment,
        upcomingAppointment: upcomingAppointment ?? null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to calculate eligibility', error: message });
  }
};
