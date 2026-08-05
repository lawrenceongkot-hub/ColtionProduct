import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

export const ewalletRouter = Router();

// Get user's e-wallets
ewalletRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const wallets = await prisma.eWallet.findMany({
      where: { userId: req.user!.id },
      select: { id: true, userId: true, provider: true, walletNumber: true },
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
    if (!provider || !walletNumber) return res.status(400).json({ error: 'Required' });

    // Check if wallet number already exists for this user
    const existing = await prisma.eWallet.findFirst({ where: { walletNumber, userId: req.user!.id } });
    if (existing) return res.status(400).json({ error: 'Wallet number already registered' });

    // withdrawalPassword is only required for the FIRST wallet
    // For additional wallets, reuse the existing password hash from the first wallet
    let passwordHash = '';
    if (withdrawalPassword) {
      passwordHash = await bcrypt.hash(String(withdrawalPassword), 12);
    } else {
      // Get the first wallet's password hash to reuse
      const firstWallet = await prisma.eWallet.findFirst({
        where: { userId: req.user!.id },
      });
      if (firstWallet) {
        passwordHash = firstWallet.withdrawalPassword;
      } else {
        return res.status(400).json({ error: 'Withdrawal password is required for the first wallet' });
      }
    }

    const wallet = await prisma.eWallet.create({
      data: {
        userId: req.user!.id,
        provider,
        walletNumber,
        withdrawalPassword: passwordHash,
      },
    });

    res.status(201).json({ id: wallet.id, userId: wallet.userId, provider: wallet.provider, walletNumber: wallet.walletNumber });
  } catch (e: any) {
    console.error('Add ewallet error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed to add e-wallet' });
  }
});

// Verify withdrawal password
ewalletRouter.post('/verify-password', async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const wallets = await prisma.eWallet.findMany({ where: { userId: req.user!.id } });
    if (!wallets || wallets.length === 0) return res.json({ valid: true, hasPassword: false });

    let valid = false;
    for (const w of wallets) {
      if (await bcrypt.compare(String(password), w.withdrawalPassword)) { valid = true; break; }
    }
    return res.json({ valid, hasPassword: true });
  } catch (e: any) {
    console.error('Verify password error:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Failed' });
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