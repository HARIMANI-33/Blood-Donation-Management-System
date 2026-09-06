import { query } from '../config/database';
import { BloodGroup } from './user.model';
import { PoolClient } from 'pg';

export interface BloodInventoryItem {
  id: string;
  blood_bank_id: string;
  blood_group: BloodGroup;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export const ALL_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Retrieve all 8 blood group inventory items for a given blood bank.
 */
export const findInventoryByBloodBank = async (bloodBankId: string): Promise<BloodInventoryItem[]> => {
  const result = await query(
    `SELECT id, blood_bank_id, blood_group, quantity, created_at, updated_at
     FROM blood_inventory
     WHERE blood_bank_id = $1
     ORDER BY
       CASE blood_group
         WHEN 'A+' THEN 1
         WHEN 'A-' THEN 2
         WHEN 'B+' THEN 3
         WHEN 'B-' THEN 4
         WHEN 'AB+' THEN 5
         WHEN 'AB-' THEN 6
         WHEN 'O+' THEN 7
         WHEN 'O-' THEN 8
         ELSE 9
       END`,
    [bloodBankId]
  );
  return result.rows;
};

/**
 * Initialize 8 blood groups at a default quantity for a newly registered blood bank.
 */
export const initializeInventoryForBloodBank = async (
  bloodBankId: string,
  initialQuantity: number = 0,
  client?: PoolClient
): Promise<void> => {
  const runner = client ? client.query.bind(client) : query;
  for (const group of ALL_BLOOD_GROUPS) {
    await runner(
      `INSERT INTO blood_inventory (blood_bank_id, blood_group, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (blood_bank_id, blood_group) DO NOTHING`,
      [bloodBankId, group, initialQuantity]
    );
  }
};

/**
 * Update inventory quantity for a specific blood group.
 * Strictly prevents negative quantities.
 */
export const updateInventoryQuantity = async (
  bloodBankId: string,
  bloodGroup: BloodGroup,
  quantity: number
): Promise<BloodInventoryItem> => {
  if (quantity < 0) {
    throw new Error('Inventory quantity cannot be negative');
  }

  const result = await query(
    `INSERT INTO blood_inventory (blood_bank_id, blood_group, quantity, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (blood_bank_id, blood_group)
     DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()
     RETURNING id, blood_bank_id, blood_group, quantity, created_at, updated_at`,
    [bloodBankId, bloodGroup, quantity]
  );
  return result.rows[0];
};

/**
 * Increment inventory quantity for a specific blood group inside a database transaction client.
 */
export const incrementInventoryQuantity = async (
  client: PoolClient,
  bloodBankId: string,
  bloodGroup: BloodGroup,
  amount: number = 1
): Promise<BloodInventoryItem> => {
  const result = await client.query(
    `INSERT INTO blood_inventory (blood_bank_id, blood_group, quantity, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (blood_bank_id, blood_group)
     DO UPDATE SET quantity = blood_inventory.quantity + EXCLUDED.quantity, updated_at = now()
     RETURNING id, blood_bank_id, blood_group, quantity, created_at, updated_at`,
    [bloodBankId, bloodGroup, amount]
  );
  return result.rows[0];
};
