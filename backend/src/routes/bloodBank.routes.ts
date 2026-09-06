import { Router } from 'express';
import { authenticate, requireBloodBank } from '../middleware/auth';
import {
  registerBloodBank,
  getProfile,
  updateProfile,
  getInventory,
  updateInventory,
  getAppointments,
  approveAppointment,
  rejectAppointment,
  completeDonation,
  getPublicBloodBanks,
  searchBloodAvailability,
  getBloodBankById,
  getIncomingRequests,
  getRequestDetails,
  acceptRequest,
  rejectRequest,
  fulfillRequest
} from '../controllers/bloodBank.controller';

const router = Router();

// 1. Public registration endpoint
router.post('/register', registerBloodBank);

// 2. Public discovery & blood availability search
router.get('/search', searchBloodAvailability);
router.get('/', getPublicBloodBanks);
router.get('/:id', getBloodBankById);

// 3. Authenticated Blood Bank Management Endpoints (requires role: 'blood_bank' or 'admin')
router.use('/me', authenticate, requireBloodBank);

// Profile
router.get('/me/profile', getProfile);
router.put('/me/profile', updateProfile);
router.patch('/me/profile', updateProfile);

// Inventory
router.get('/me/inventory', getInventory);
router.put('/me/inventory/:bloodGroup', updateInventory);
router.patch('/me/inventory/:bloodGroup', updateInventory);

// Donor Appointments & Review Flow
router.get('/me/appointments', getAppointments);
router.patch('/me/appointments/:appointmentId/approve', approveAppointment);
router.patch('/me/appointments/:appointmentId/reject', rejectAppointment);

// Complete Donation & Increment Inventory
router.post('/me/appointments/:appointmentId/complete', completeDonation);

// Hospital requests compatibility (/me/requests and /requests)
router.get('/me/requests', getIncomingRequests);
router.get('/me/requests/:requestId', getRequestDetails);
router.patch('/me/requests/:requestId/accept', acceptRequest);
router.patch('/me/requests/:requestId/reject', rejectRequest);
router.patch('/me/requests/:requestId/fulfill', fulfillRequest);

// Standard /requests endpoints
router.get('/requests', authenticate, requireBloodBank, getIncomingRequests);
router.get('/requests/:requestId', authenticate, requireBloodBank, getRequestDetails);
router.patch('/requests/:requestId/accept', authenticate, requireBloodBank, acceptRequest);
router.patch('/requests/:requestId/reject', authenticate, requireBloodBank, rejectRequest);
router.patch('/requests/:requestId/fulfill', authenticate, requireBloodBank, fulfillRequest);

export default router;
