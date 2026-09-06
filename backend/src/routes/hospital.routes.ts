import { Router } from 'express';
import { authenticate, requireHospital } from '../middleware/auth';
import {
  registerHospital,
  loginHospital,
  getHospitalProfile,
  updateHospitalProfileHandler,
  searchBloodForHospital,
  getHospitalOrganizations,
  createBloodRequestHandler,
  getHospitalRequests,
  getHospitalRequestById,
  cancelHospitalRequest
} from '../controllers/hospital.controller';

const router = Router();

// 1. Authentication endpoints
router.post('/register', registerHospital);
router.post('/login', loginHospital);

// 2. Public / semi-public blood search & organization discovery for hospitals
router.get('/blood/search', searchBloodForHospital);
router.get('/organizations', getHospitalOrganizations);

// 3. Authenticated Hospital Management Endpoints (requires role: 'hospital' or 'admin')
router.use(authenticate, requireHospital);

// Profile
router.get('/profile', getHospitalProfile);
router.put('/profile', updateHospitalProfileHandler);
router.patch('/profile', updateHospitalProfileHandler);

// Blood Requests
router.post('/requests', createBloodRequestHandler);
router.get('/requests', getHospitalRequests);
router.get('/requests/:id', getHospitalRequestById);
router.patch('/requests/:id/cancel', cancelHospitalRequest);

export default router;
