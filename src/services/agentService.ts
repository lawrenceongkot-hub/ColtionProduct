import type { AgentProfile, AgentReferral, AgentCommission } from '../types';
import { walletService } from './walletService';

const AGENT_KEY = 'coltion_agents';
const AGENT_REFERRALS_KEY = 'coltion_agent_referrals';
const AGENT_COMMISSIONS_KEY = 'coltion_agent_commissions';
const COMMISSION_RATE = 0.30; // 30%

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
        agentLink: `https://coltionproduct.com/register?ref=${finalCode}`,
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

  /** Process commission when a user makes their first deposit. */
  processFirstDeposit(userId: string, depositAmount: number): void {
    const referrals = getReferrals();
    const referral = referrals.find(r => r.userId === userId);
    if (!referral) return;
    if (referral.status === 'commission_paid') return;
    if (referral.firstDeposit !== null) return;

    // Find the agent
    const agents = getAgents();
    const users = JSON.parse(localStorage.getItem('coltion_users') || '[]');
    const user = users.find((u: any) => u.id === userId);
    if (!user || !user.referrerAgentId) return;

    const agent = agents.find(a => a.id === user.referrerAgentId);
    if (!agent) return;

    const commissionAmount = Math.round(depositAmount * COMMISSION_RATE);

    // Update referral
    referral.firstDeposit = depositAmount;
    referral.commission = commissionAmount;
    referral.status = 'commission_paid';
    saveReferrals(referrals);

    // Create commission record
    const commissions = getCommissions();
    commissions.push({
      id: 'com_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      agentId: agent.id,
      referredUserId: userId,
      referredName: user.fullName,
      depositAmount,
      commissionRate: COMMISSION_RATE,
      commissionAmount,
      createdAt: new Date().toISOString(),
    });
    saveCommissions(commissions);

    // Update agent stats
    agent.totalCommission += commissionAmount;
    agent.qualifiedDeposits += 1;
    agent.availableBalance += commissionAmount;
    saveAgents(agents);

    // Credit agent wallet (main wallet)
    walletService.deposit(agent.userId, commissionAmount);

    // Record agent commission transaction
    try {
      const TX_KEY = 'coltion_transactions';
      const txs = JSON.parse(localStorage.getItem(TX_KEY) || '[]');
      txs.push({
        id: 'txn_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        userId: agent.userId,
        type: 'agent_commission',
        amount: commissionAmount,
        method: `Agent Commission - ${user.fullName}`,
        reference: 'AGCOM-' + referral.id.slice(-8).toUpperCase(),
        status: 'success',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      localStorage.setItem(TX_KEY, JSON.stringify(txs));
    } catch { /* silent */ }
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