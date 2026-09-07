import { query } from '../config/database';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UserRole = 'donor' | 'hospital' | 'staff' | 'admin' | 'blood_bank';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  blood_group: BloodGroup | null;
  city: string | null;
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
  city?: string | null;
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
 * Find a user or facility by phone number across users, blood_banks, and hospitals.
 * Compares both exact trimmed phone and normalized digits to prevent duplicates.
 */
export const findUserByPhone = async (phone: string, excludeUserId?: string): Promise<User | null> => {
  const trimmed = phone ? phone.trim() : '';
  if (!trimmed) return null;
  const digitsOnly = trimmed.replace(/\D/g, '');
  const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

  // 1. Check users table
  let sqlUsers = `
    SELECT * FROM users
    WHERE phone IS NOT NULL AND phone != ''
      AND (
        phone = $1
        OR regexp_replace(phone, '\\D', '', 'g') = $2
        ${last10.length >= 7 ? "OR regexp_replace(phone, '\\D', '', 'g') LIKE '%' || $3" : ''}
      )
  `;
  const paramsUsers: unknown[] = [trimmed, digitsOnly];
  if (last10.length >= 7) {
    paramsUsers.push(last10);
  }
  if (excludeUserId) {
    sqlUsers += ` AND id != $${paramsUsers.length + 1}`;
    paramsUsers.push(excludeUserId);
  }
  sqlUsers += ' LIMIT 1';

  const userResult = await query(sqlUsers, paramsUsers);
  if (userResult.rows[0]) {
    return userResult.rows[0];
  }

  // 2. Check blood_banks table
  let sqlBB = `
    SELECT id, user_id, name, phone FROM blood_banks
    WHERE phone IS NOT NULL AND phone != ''
      AND (
        phone = $1
        OR regexp_replace(phone, '\\D', '', 'g') = $2
        ${last10.length >= 7 ? "OR regexp_replace(phone, '\\D', '', 'g') LIKE '%' || $3" : ''}
      )
  `;
  const paramsBB: unknown[] = [trimmed, digitsOnly];
  if (last10.length >= 7) {
    paramsBB.push(last10);
  }
  if (excludeUserId) {
    sqlBB += ` AND (user_id IS NULL OR user_id != $${paramsBB.length + 1})`;
    paramsBB.push(excludeUserId);
  }
  sqlBB += ' LIMIT 1';

  const bbResult = await query(sqlBB, paramsBB);
  if (bbResult.rows[0]) {
    return {
      id: bbResult.rows[0].user_id || bbResult.rows[0].id,
      name: bbResult.rows[0].name,
      phone: bbResult.rows[0].phone,
      role: 'blood_bank'
    } as User;
  }

  // 3. Check hospitals table
  let sqlHosp = `
    SELECT id, user_id, name, phone FROM hospitals
    WHERE phone IS NOT NULL AND phone != ''
      AND (
        phone = $1
        OR regexp_replace(phone, '\\D', '', 'g') = $2
        ${last10.length >= 7 ? "OR regexp_replace(phone, '\\D', '', 'g') LIKE '%' || $3" : ''}
      )
  `;
  const paramsHosp: unknown[] = [trimmed, digitsOnly];
  if (last10.length >= 7) {
    paramsHosp.push(last10);
  }
  if (excludeUserId) {
    sqlHosp += ` AND (user_id IS NULL OR user_id != $${paramsHosp.length + 1})`;
    paramsHosp.push(excludeUserId);
  }
  sqlHosp += ' LIMIT 1';

  const hospResult = await query(sqlHosp, paramsHosp);
  if (hospResult.rows[0]) {
    return {
      id: hospResult.rows[0].user_id || hospResult.rows[0].id,
      name: hospResult.rows[0].name,
      phone: hospResult.rows[0].phone,
      role: 'hospital'
    } as User;
  }

  return null;
};

/**
 * Insert a new user row and return the created record.
 */
export const createUser = async (input: CreateUserInput): Promise<User> => {
  const result = await query(
    `INSERT INTO users (name, email, password_hash, phone, blood_group, city, role)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'donor'))
     RETURNING *`,
    [
      input.name,
      input.email.toLowerCase(),
      input.passwordHash,
      input.phone ?? null,
      input.bloodGroup ?? null,
      input.city ? input.city.trim() : null,
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

export interface UpdateUserProfileInput {
  name?: string;
  phone?: string | null;
  bloodGroup?: BloodGroup | null;
  city?: string | null;
}

/**
 * Update a user's editable profile fields (name, phone, blood group, city).
 */
export const updateUserProfile = async (id: string, input: UpdateUserProfileInput): Promise<User | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(input.name.trim());
  }
  if (input.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(input.phone ? input.phone.trim() : null);
  }
  if (input.bloodGroup !== undefined) {
    fields.push(`blood_group = $${paramIndex++}`);
    values.push(input.bloodGroup ?? null);
  }
  if (input.city !== undefined) {
    fields.push(`city = $${paramIndex++}`);
    values.push(input.city ? input.city.trim() : null);
  }

  if (fields.length === 0) {
    return findUserById(id);
  }

  fields.push(`updated_at = now()`);
  values.push(id);

  const sql = `
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0] ?? null;
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
  city: user.city,
  role: user.role,
  createdAt: user.created_at
});

