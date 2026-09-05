import { Router } from 'express';
import { authenticate, requireDonor } from '../middleware/auth';
import {
  getProfile,
  updateProfile,
  getBloodBanks,
  bookAppointment,
  getAppointments,
  getAppointmentDetails,
  cancelAppointmentHandler,
  getDonations,
  getDonationCount,
  getEligibilityStatus
} from '../controllers/donor.controller';

const router = Router();

// Apply authentication & donor role guard to all donor endpoints
router.use(authenticate, requireDonor);

// 1. Profile management
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// 2. Blood bank facilities listing
router.get('/blood-banks', getBloodBanks);

// 3. Appointments
router.post('/appointments', bookAppointment);
router.get('/appointments', getAppointments);
router.get('/appointments/:id', getAppointmentDetails);
router.patch('/appointments/:id/cancel', cancelAppointmentHandler);

// 4. Donation history & count
router.get('/donations', getDonations);
router.get('/donations/count', getDonationCount);

// 5. Eligibility & donation readiness
router.get('/eligibility', getEligibilityStatus);

export default router;
