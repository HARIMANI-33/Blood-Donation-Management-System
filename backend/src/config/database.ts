import { Pool } from 'pg';
import { config } from './environment';

/**
 * PostgreSQL connection pool.
 * Uses environment variables loaded via config for all connection parameters.
 */
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 20,               // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Log pool errors so they don't crash the process
pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client', err);
});

/**
 * Execute a query against the PostgreSQL pool.
 * Thin wrapper so callers don't import Pool directly.
 */
export const query = (text: string, params?: unknown[]) => {
  return pool.query(text, params);
};

/**
 * Health check – runs a trivial query (`SELECT 1`) and returns true/false.
 */
export const checkConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

export default pool;
