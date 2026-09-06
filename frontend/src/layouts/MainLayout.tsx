import { Outlet, Link, useLocation } from 'react-router-dom';
import { Heart, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const MainLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    window.location.replace('/');
  };

  const isBloodBank = user?.role === 'blood_bank';
  const isHospital = user?.role === 'hospital';
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');

  const isInventoryActive = isBloodBank && location.pathname === '/blood-bank/dashboard' && (!currentTab || currentTab === 'inventory');
  const isAppointmentsActive = isBloodBank && location.pathname === '/blood-bank/dashboard' && currentTab === 'appointments';
  const isRequestsActive = isBloodBank && location.pathname === '/blood-bank/dashboard' && currentTab === 'requests';
  const isProfileActive = isBloodBank && location.pathname.startsWith('/blood-bank/profile');

  const isHospitalDashActive = isHospital && location.pathname === '/hospital/dashboard';
  const isHospitalFindActive = isHospital && location.pathname === '/hospital/find-blood';
  const isHospitalReqsActive = isHospital && location.pathname.startsWith('/hospital/requests');
  const isHospitalProfActive = isHospital && location.pathname.startsWith('/hospital/profile');

  return (
    <div className="layout-container">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <Heart size={24} />
            <span>LifeFlow</span>
          </Link>
          <nav>
            <ul className="nav-links">
              {isAuthenticated ? (
                <>
                  {isHospital ? (
                    <>
                      <li>
                        <Link
                          to="/hospital/dashboard"
                          className={`nav-link-item ${isHospitalDashActive ? 'nav-link-active' : ''}`}
                          id="nav-hospital-dashboard"
                        >
                          Dashboard
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/hospital/find-blood"
                          className={`nav-link-item ${isHospitalFindActive ? 'nav-link-active' : ''}`}
                          id="nav-hospital-find-blood"
                        >
                          Find Blood
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/hospital/requests"
                          className={`nav-link-item ${isHospitalReqsActive ? 'nav-link-active' : ''}`}
                          id="nav-hospital-requests"
                        >
                          My Requests
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/hospital/profile"
                          className={`nav-link-item ${isHospitalProfActive ? 'nav-link-active' : ''}`}
                          id="nav-hospital-profile"
                        >
                          Profile
                        </Link>
                      </li>
                    </>
                  ) : isBloodBank ? (
                    <>
                      <li>
                        <Link
                          to="/blood-bank/dashboard?tab=inventory"
                          className={`nav-link-item ${isInventoryActive ? 'nav-link-active' : ''}`}
                        >
                          Inventory
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/blood-bank/dashboard?tab=appointments"
                          className={`nav-link-item ${isAppointmentsActive ? 'nav-link-active' : ''}`}
                        >
                          Donor Appointments
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/blood-bank/dashboard?tab=requests"
                          className={`nav-link-item ${isRequestsActive ? 'nav-link-active' : ''}`}
                          id="nav-bb-requests"
                        >
                          Hospital Requests
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/blood-bank/profile"
                          className={`nav-link-item ${isProfileActive ? 'nav-link-active' : ''}`}
                        >
                          Profile
                        </Link>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link to="/dashboard">Dashboard</Link>
                      </li>
                      <li>
                        <Link to="/profile" className="nav-profile-link">
                          <UserIcon size={16} />
                          <span>Profile</span>
                        </Link>
                      </li>
                    </>
                  )}
                  <li>
                    <button
                      onClick={handleLogout}
                      className="btn-register"
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                      id="btn-logout"
                    >
                      <LogOut size={14} />
                      <span>Logout</span>
                    </button>
                  </li>
                </>
              ) : null}
            </ul>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} LifeFlow — Blood Bank Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
