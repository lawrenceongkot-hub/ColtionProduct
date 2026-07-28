import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const ewalletRouter = Router();

// Get user's e-wallets
ewalletRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const wallets = await prisma.eWallet.findMany({
      where: { userId: req.user!.id },
    });
    res.json(wallets);
  } catch {
    res.status(500).json({ error: 'Failed to get e-wallets' });
  }
});

// Add e-wallet
ewalletRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { provider, walletNumber, withdrawalPassword } = req.body;

    // Check if wallet number already exists
    const existing = await prisma.eWallet.findFirst({ where: { walletNumber: walletNumber } });
    if (existing) {
      return res.status(400).json({ error: 'Wallet number already registered' });
    }

    const wallet = await prisma.eWallet.create({
      data: {
        userId: req.user!.id,
        provider,
        walletNumber,
        withdrawalPassword,
      },
    });

    res.status(201).json(wallet);
  } catch {
    res.status(500).json({ error: 'Failed to add e-wallet' });
  }
});

// Delete e-wallet
ewalletRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ewalletId = req.params.id as string;
    await prisma.eWallet.deleteMany({
      where: { id: ewalletId, userId: req.user!.id },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete e-wallet' });
  }
});

// Verify withdrawal password
ewalletRouter.post('/verify-password', async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    const wallet = await prisma.eWallet.findFirst({
      where: { userId: req.user!.id, withdrawalPassword: password },
    });
    res.json({ valid: !!wallet });
  } catch {
    res.status(500).json({ error: 'Failed to verify password' });
  }
});