import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const settingsRouter = Router();

// Get public settings (no auth required)
settingsRouter.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.platformSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.platformSettings.create({ data: { id: 'default' } });
    }
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});