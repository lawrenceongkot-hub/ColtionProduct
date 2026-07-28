import type { AgentProfile, AgentReferral, AgentCommission } from '../types';
import { apiService } from './api';

/**
 * Agent service - all operations go through backend API.
 * No localStorage used.
 */

export const agentService = {
  async getOrCreateAgent(): Promise<AgentProfile | null> {
    try {
      return await apiService.get<AgentProfile>('/agents/profile');
    } catch {
      return null;
    }
  },

  async getReferrals(): Promise<AgentReferral[]> {
    try {
      return await apiService.get<AgentReferral[]>('/agents/referrals');
    } catch {
      return [];
    }
  },

  async getCommissions(): Promise<AgentCommission[]> {
    try {
      return await apiService.get<AgentCommission[]>('/agents/commissions');
    } catch {
      return [];
    }
  },

  async findAgentByCode(code: string): Promise<AgentProfile | null> {
    try {
      // Server validates agent codes during registration
      return null;
    } catch {
      return null;
    }
  },
};