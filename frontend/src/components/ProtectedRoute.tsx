import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredRole?: UserRole;
}

const ProtectedRoute = ({ children, allowedRoles, requiredRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <p style={{ textAlign: 'center', padding: '3rem' }}>Loading...</p>;
  }

  if (!isAuthenticated || !user) {
    if (requiredRole === 'hospital' || (allowedRoles && allowedRoles.includes('hospital') && !allowedRoles.includes('donor'))) {
      return <Navigate to="/hospital/login" replace />;
    }
    if (requiredRole === 'blood_bank' || (allowedRoles && allowedRoles.includes('blood_bank') && !allowedRoles.includes('donor'))) {
      return <Navigate to="/blood-bank/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  const effectiveAllowedRoles = allowedRoles ?? (requiredRole ? [requiredRole] : null);

  if (effectiveAllowedRoles && !effectiveAllowedRoles.includes(user.role)) {
    // If authenticated user is a hospital trying to access another role's route
    if (user.role === 'hospital') {
      return <Navigate to="/hospital/dashboard" replace />;
    }
    // If authenticated user is a blood bank trying to access donor route
    if (user.role === 'blood_bank') {
      return <Navigate to="/blood-bank/dashboard" replace />;
    }
    // If authenticated user is a donor trying to access blood bank route
    if (user.role === 'donor') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
