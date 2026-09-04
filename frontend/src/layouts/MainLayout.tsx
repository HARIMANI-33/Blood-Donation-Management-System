import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const MainLayout = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="layout-container">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <Activity size={24} />
            <span>BloodBank Admin</span>
          </Link>
          <nav>
            <ul className="nav-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/dashboard">Dashboard</Link>
              </li>
              {isAuthenticated ? (
                <>
                  <li>{user?.name}</li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="btn-register"
                      style={{ border: 'none', cursor: 'pointer' }}
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login">Login</Link>
                  </li>
                  <li>
                    <Link to="/register" className="btn-register">Register</Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Blood Bank Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
