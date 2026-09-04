import { query } from '../config/database';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UserRole = 'donor' | 'hospital' | 'staff' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  blood_group: BloodGroup | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
  bloodGroup?: BloodGroup | null;
  role?: UserRole;
}

/**
 * Find a single user by email. Returns null if no match.
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
  return result.rows[0] ?? null;
};

/**
 * Find a single user by id. Returns null if no match.
 */
export const findUserById = async (id: string): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] ?? null;
};

/**
 * Insert a new user row and return the created record.
 */
export const createUser = async (input: CreateUserInput): Promise<User> => {
  const result = await query(
    `INSERT INTO users (name, email, password_hash, phone, blood_group, role)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'donor'))
     RETURNING *`,
    [
      input.name,
      input.email.toLowerCase(),
      input.passwordHash,
      input.phone ?? null,
      input.bloodGroup ?? null,
      input.role ?? null
    ]
  );
  return result.rows[0];
};

/**
 * Count donors grouped by blood group, for dashboard stats.
 */
export const getDonorCountsByBloodGroup = async (): Promise<{ blood_group: string; count: string }[]> => {
  const result = await query(
    `SELECT blood_group, COUNT(*) AS count
     FROM users
     WHERE role = 'donor' AND blood_group IS NOT NULL
     GROUP BY blood_group
     ORDER BY blood_group`
  );
  return result.rows;
};

/**
 * Total number of registered users, for dashboard stats.
 */
export const getTotalUserCount = async (): Promise<number> => {
  const result = await query('SELECT COUNT(*)::int AS count FROM users');
  return result.rows[0]?.count ?? 0;
};

/**
 * Strip the password hash before sending a user object to the client.
 */
export const toPublicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  bloodGroup: user.blood_group,
  role: user.role,
  createdAt: user.created_at
});
