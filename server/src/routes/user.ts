import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const userRouter = Router();

userRouter.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { fullName, phone },
      select: { id: true, fullName: true, email: true, phone: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

userRouter.put('/password', async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to change password' });
  }
});