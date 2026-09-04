import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchDashboardStats } from '../services/auth.service';
import { ApiError } from '../services/api';
import type { DashboardStats } from '../types/auth';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setIsLoading(true);
    fetchDashboardStats(token)
      .then((res) => {
        if (!cancelled) setStats(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load stats');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p>Welcome{user ? `, ${user.name}` : ''} — here's the current donor inventory snapshot.</p>
      </div>

      {isLoading && <p style={{ textAlign: 'center', marginTop: '2rem' }}>Loading stats...</p>}

      {error && (
        <p style={{ color: '#dc2626', textAlign: 'center', marginTop: '2rem' }}>{error}</p>
      )}

      {stats && !isLoading && !error && (
        <>
          <div className="features-section" style={{ marginTop: '1rem' }}>
            <div className="feature-card">
              <h3>Total Registered Users</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>{stats.totalUsers}</p>
            </div>
            <div className="feature-card">
              <h3>Total Donors</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>{stats.totalDonors}</p>
            </div>
          </div>

          <div
            className="feature-card"
            style={{ maxWidth: '700px', margin: '2rem auto 0', alignItems: 'stretch' }}
          >
            <h3 style={{ marginBottom: '1rem' }}>Donors by Blood Group</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(stats.byBloodGroup).map(([group, count]) => (
                <div
                  key={group}
                  style={{
                    background: '#fef2f2',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#dc2626' }}>{group}</div>
                  <div>{count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
