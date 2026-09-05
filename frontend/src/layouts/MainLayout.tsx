import { Outlet, Link } from 'react-router-dom';
import { Heart, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const MainLayout = () => {
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.replace('/');
  };

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
              {isAuthenticated && (
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
              )}
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
