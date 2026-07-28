import type { AgentProfile, AgentReferral, AgentCommission } from '../types';
import { walletService } from './walletService';
import { getReferralLink } from '../utils/domain';

const AGENT_KEY = 'coltion_agents';
const AGENT_REFERRALS_KEY = 'coltion_agent_referrals';
const AGENT_COMMISSIONS_KEY = 'coltion_agent_commissions';
const COMMISSION_RATE_KEY = 'coltion_settings';

function getAgents(): AgentProfile[] {
  try { return JSON.parse(localStorage.getItem(AGENT_KEY) || '[]'); } catch { return []; }
}
function saveAgents(a: AgentProfile[]): void { localStorage.setItem(AGENT_KEY, JSON.stringify(a)); }

function getReferrals(): AgentReferral[] {
  try { return JSON.parse(localStorage.getItem(AGENT_REFERRALS_KEY) || '[]'); } catch { return []; }
}
function saveReferrals(r: AgentReferral[]): void { localStorage.setItem(AGENT_REFERRALS_KEY, JSON.stringify(r)); }

function getCommissions(): AgentCommission[] {
  try { return JSON.parse(localStorage.getItem(AGENT_COMMISSIONS_KEY) || '[]'); } catch { return []; }
}
function saveCommissions(c: AgentCommission[]): void { localStorage.setItem(AGENT_COMMISSIONS_KEY, JSON.stringify(c)); }

function generateAgentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'AGT';
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const agentService = {
  /** Get or create agent profile for a user. */
  getOrCreateAgent(userId: string, _fullName: string): AgentProfile {
    const agents = getAgents();
    let agent = agents.find(a => a.userId === userId);
    if (!agent) {
      const code = generateAgentCode();
      // Ensure uniqueness
      const existingCodes = agents.map(a => a.agentCode);
      let finalCode = code;
      while (existingCodes.includes(finalCode)) {
        finalCode = generateAgentCode();
      }
      agent = {
        id: 'agt_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        userId,
        agentCode: finalCode,
        agentLink: getReferralLink(finalCode),
        totalCommission: 0,
        totalReferrals: 0,
        qualifiedDeposits: 0,
        availableBalance: 0,
      };
      agents.push(agent);
      saveAgents(agents);
    }
    return agent;
  },

  /** Get agent profile. */
  getProfile(userId: string): AgentProfile | null {
    const agents = getAgents();
    return agents.find(a => a.userId === userId) || null;
  },

  /** Find agent by invitation code. */
  findAgentByCode(code: string): AgentProfile | null {
    const agents = getAgents();
    return agents.find(a => a.agentCode === code) || null;
  },

  /** Record a referral when user registers with agent code. */
  recordReferral(agentCode: string, referredUserId: string, fullName: string, email: string): void {
    const agent = this.findAgentByCode(agentCode);
    if (!agent) return;

    const referrals = getReferrals();
    // Avoid duplicates
    if (referrals.some(r => r.userId === referredUserId)) return;

    referrals.push({
      id: 'aref_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      userId: referredUserId,
      fullName,
      email,
      registeredDate: new Date().toISOString(),
      firstDeposit: null,
      commission: null,
      status: 'waiting_deposit',
    });
    saveReferrals(referrals);

    // Update agent stats
    const agents = getAgents();
    const a = agents.find(x => x.id === agent.id);
    if (a) {
      a.totalReferrals = referrals.filter(() => {
        const ag = agents.find(x => x.id === agent.id);
        return ag && ag.userId === agent.userId;
      }).length;
      saveAgents(agents);
    }

    // Link user to agent
    try {
      const users = JSON.parse(localStorage.getItem('coltion_users') || '[]');
      const user = users.find((u: any) => u.id === referredUserId);
      if (user) {
        user.referrerAgentId = agent.id;
        localStorage.setItem('coltion_users', JSON.stringify(users));

        // Update session if exists
        const session = localStorage.getItem('coltion_session');
        if (session) {
          const s = JSON.parse(session);
          if (s.id === referredUserId) {
            s.referrerAgentId = agent.id;
            localStorage.setItem('coltion_session', JSON.stringify(s));
          }
        }
      }
    } catch { /* silent */ }
  },

  /**
   * Get the current commission rate from Website Control settings.
   * Defaults to 30% (0.30) if not configured.
   */
  getCommissionRate(): number {
    try {
      const settings = JSON.parse(localStorage.getItem(COMMISSION_RATE_KEY) || '{}');
      if (settings.referralCommissionPercent) {
        return settings.referralCommissionPercent / 100;
      }
    } catch {}
    return 0.30; // 30% default
  },

  /** Get agent referrals. */
  getReferrals(agentId: string): AgentReferral[] {
    const agents = getAgents();
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return [];
    const referrals = getReferrals();
    // Find all referrals linked to this agent via userId
    const users = JSON.parse(localStorage.getItem('coltion_users') || '[]');
    const referredIds = users
      .filter((u: any) => u.referrerAgentId === agentId)
      .map((u: any) => u.id);
    return referrals.filter(r => referredIds.includes(r.userId))
      .sort((a, b) => new Date(b.registeredDate).getTime() - new Date(a.registeredDate).getTime());
  },

  /** Get agent commissions. */
  getCommissions(agentId: string): AgentCommission[] {
    const commissions = getCommissions();
    return commissions.filter(c => c.agentId === agentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};