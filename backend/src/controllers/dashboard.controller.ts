import { Response } from 'express';
import { getDonorCountsByBloodGroup, getTotalUserCount } from '../models/user.model';
import { AuthenticatedRequest } from '../middleware/auth';

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * GET /api/dashboard/stats
 * Requires authentication. Returns donor totals and a per-blood-group breakdown.
 */
export const getStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [rows, totalUsers] = await Promise.all([getDonorCountsByBloodGroup(), getTotalUserCount()]);

    const countsByGroup: Record<string, number> = Object.fromEntries(
      ALL_BLOOD_GROUPS.map((group) => [group, 0])
    );
    let totalDonors = 0;
    for (const row of rows) {
      const count = parseInt(row.count, 10);
      countsByGroup[row.blood_group] = count;
      totalDonors += count;
    }

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalDonors,
        byBloodGroup: countsByGroup
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, message: 'Failed to load dashboard stats', error: message });
  }
};
