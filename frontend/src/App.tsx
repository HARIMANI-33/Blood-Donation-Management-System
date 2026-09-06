import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import BloodBankRegister from './pages/BloodBankRegister';
import BloodBankLogin from './pages/BloodBankLogin';
import BloodBankDashboard from './pages/BloodBankDashboard';
import BloodBankProfilePage from './pages/BloodBankProfilePage';
import HospitalLogin from './pages/HospitalLogin';
import HospitalRegister from './pages/HospitalRegister';
import HospitalDashboard from './pages/HospitalDashboard';
import HospitalProfilePage from './pages/HospitalProfile';
import HospitalFindBlood from './pages/HospitalFindBlood';
import HospitalRequests from './pages/HospitalRequests';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />

            {/* Donor Protected Routes */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute requiredRole="donor">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute requiredRole="donor">
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Blood Bank Module Routes */}
            <Route path="blood-bank/login" element={<BloodBankLogin />} />
            <Route path="blood-bank/register" element={<BloodBankRegister />} />
            <Route
              path="blood-bank/dashboard"
              element={
                <ProtectedRoute requiredRole="blood_bank">
                  <BloodBankDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="blood-bank/profile"
              element={
                <ProtectedRoute requiredRole="blood_bank">
                  <BloodBankProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Hospital Module Routes */}
            <Route path="hospital/login" element={<HospitalLogin />} />
            <Route path="hospital/register" element={<HospitalRegister />} />
            <Route
              path="hospital/dashboard"
              element={
                <ProtectedRoute requiredRole="hospital">
                  <HospitalDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="hospital/profile"
              element={
                <ProtectedRoute requiredRole="hospital">
                  <HospitalProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="hospital/find-blood"
              element={
                <ProtectedRoute requiredRole="hospital">
                  <HospitalFindBlood />
                </ProtectedRoute>
              }
            />
            <Route
              path="hospital/requests"
              element={
                <ProtectedRoute requiredRole="hospital">
                  <HospitalRequests />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
