import { createClient, chains, createAccount } from 'genlayer-js';
import { Protocol, ExploitReport, ValidatorConsensusStep } from './types';
import deployment from './deployment.json';

export const NETWORKS = {
  studionext: {
    name: 'GenLayer Studio Next (61997)',
    chainId: 61997,
    rpcUrl: 'https://studio-dev.genlayer.com/api',
    explorer: 'https://explorer-studio.genlayer.com',
    currency: 'GEN',
    chainConfig: {
      ...chains.studionet,
      id: 61997,
      name: 'Studio Next',
      rpcUrls: { default: { http: ['https://studio.genlayer.com/api'] } }
    }
  },
  studionet: {
    name: 'GenLayer StudioNet (61999)',
    chainId: 61999,
    rpcUrl: 'https://studio.genlayer.com/api',
    explorer: 'https://explorer-studio.genlayer.com',
    currency: 'GEN',
    chainConfig: chains.studionet
  }
};

// Written by scripts/deploy.mjs after each deployment
export const DEFAULT_CONTRACT_ADDRESS: string = deployment.address;

const DEMO_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const account = createAccount(DEMO_PK);
export const DEMO_ACCOUNT_ADDRESS = account.address;

export function getGenLayerClient(networkKey: keyof typeof NETWORKS) {
  const net = NETWORKS[networkKey];
  return createClient({
    chain: net.chainConfig,
    endpoint: net.chainConfig.rpcUrls.default.http[0],
    account
  });
}

const WEI_PER_GEN = 10n ** 18n;

export function formatGen(wei: string | bigint | number | undefined): string {
  if (wei === undefined || wei === null || wei === '') return '0 GEN';
  const value = BigInt(wei);
  const whole = value / WEI_PER_GEN;
  const frac = value % WEI_PER_GEN;
  const fracStr = frac === 0n ? '' : '.' + frac.toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '');
  return `${whole.toLocaleString('en-US')}${fracStr} GEN`;
}

export function parseGen(text: string): bigint {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0n;
  const [whole, frac = ''] = cleaned.split('.');
  return BigInt(whole || '0') * WEI_PER_GEN + BigInt((frac + '0'.repeat(18)).slice(0, 18));
}

// Display-only metadata for the demo protocols seeded by scripts/deploy.mjs
export const INITIAL_PROTOCOLS: Protocol[] = [
  {
    name: 'ApexYield Lending',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    category: 'Money Market',
    rules: 'Max borrow limit 1M USD equivalent. Flashloans must be repaid within same block. Any reentrancy pattern or uncollateralized borrow is an exploit.',
    bountyPool: '15,000 GEN',
    bountyPoolWei: (15_000n * WEI_PER_GEN).toString(),
    tvl: '$4.2M',
    isHalted: false,
    haltReason: '',
    reportsCount: 0,
  },
  {
    name: 'Orbit DEX V3',
    address: '0x1c8b7454c5e53e4b2d184cf4f84c59a35e76a6b1',
    category: 'Concentrated Liquidity',
    rules: 'Slippage tolerance capped at 2.5% per pool tick. Flash-swaps must maintain constant product invariant k. Price manipulation is prohibited.',
    bountyPool: '25,000 GEN',
    bountyPoolWei: (25_000n * WEI_PER_GEN).toString(),
    tvl: '$12.8M',
    isHalted: false,
    haltReason: '',
    reportsCount: 0,
  },
  {
    name: 'LiquidStake Bridge',
    address: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    category: 'Cross-Chain Bridge',
    rules: 'Validator signature threshold 3-of-5 required. Single transaction withdrawal cap: 100 ETH equivalent. Unauthorized mint is an exploit.',
    bountyPool: '50,000 GEN',
    bountyPoolWei: (50_000n * WEI_PER_GEN).toString(),
    tvl: '$8.5M',
    isHalted: false,
    haltReason: '',
    reportsCount: 0,
  },
];

const EVIDENCE_BASE = 'https://raw.githubusercontent.com/olasmi02/genlayer-sentinel/main/evidence';

export const SAMPLE_EXPLOITS = [
  {
    title: 'Flashloan Reentrancy Attack on ApexYield',
    targetAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    exploitType: 'Reentrancy Drain',
    proofUrl: `${EVIDENCE_BASE}/apexyield-reentrancy-incident.md`,
    expectedVerdict: 'HALT' as const,
  },
  {
    title: 'Flash-Swap Arbitrage on Orbit DEX (Benign)',
    targetAddress: '0x1c8b7454c5e53e4b2d184cf4f84c59a35e76a6b1',
    exploitType: 'Price Manipulation Claim',
    proofUrl: `${EVIDENCE_BASE}/orbit-dex-arbitrage-trace.md`,
    expectedVerdict: 'REJECT' as const,
  },
  {
    title: 'Forged Multi-sig Mint on LiquidStake',
    targetAddress: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    exploitType: 'Bridge Mint Exploit',
    proofUrl: `${EVIDENCE_BASE}/liquidstake-forged-mint.md`,
    expectedVerdict: 'HALT' as const,
  },
  {
    title: 'Nonexistent Etherscan Tx (No Evidence)',
    targetAddress: '0x1c8b7454c5e53e4b2d184cf4f84c59a35e76a6b1',
    exploitType: 'Price Manipulation Claim',
    proofUrl: 'https://etherscan.io/tx/0xa1b2c3d4e5f67890',
    expectedVerdict: 'REJECT' as const,
  },
  {
    title: 'Spoofed Alert Site (Stake Slashed)',
    targetAddress: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    exploitType: 'Bridge Mint Exploit',
    proofUrl: 'https://liquidstake-security-alerts.xyz/exploit-drained',
    expectedVerdict: 'REJECT' as const,
  },
];

// genlayer-js returns contract dicts as Map instances; normalise to plain objects
function toPlain(value: any): any {
  if (value instanceof Map) return Object.fromEntries([...value].map(([k, v]) => [k, toPlain(v)]));
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === 'bigint') return value.toString();
  return value;
}

async function readView(client: any, contractAddress: string, functionName: string, args: any[] = []) {
  return toPlain(await client.readContract({ address: contractAddress, functionName, args }));
}

/** Throws if the contract is not deployed at this address on the selected network. */
export async function fetchProtocols(client: any, contractAddress: string): Promise<Protocol[]> {
  const data: any[] = (await readView(client, contractAddress, 'get_all_protocols')) || [];
  return data.map((p) => {
    const meta = INITIAL_PROTOCOLS.find((m) => m.address.toLowerCase() === p.target_address);
    return {
      name: p.protocol_name,
      address: p.target_address,
      category: meta?.category || 'Registered Protocol',
      rules: p.rules,
      bountyPool: formatGen(p.bounty_pool),
      bountyPoolWei: String(p.bounty_pool ?? '0'),
      tvl: meta?.tvl || '—',
      isHalted: Boolean(p.is_halted),
      haltReason: p.halt_reason || '',
      reportsCount: Number(p.reports_count)
    };
  });
}

export function describeStake(r: { action: string; stake: string; stake_slashed: boolean }): string {
  if (BigInt(r.stake || '0') === 0n) return 'No stake';
  if (r.stake_slashed) return `Stake slashed: -${formatGen(r.stake)}`;
  return `Stake refunded: ${formatGen(r.stake)}`;
}

/** Returns reports newest first. Throws if the contract is unreachable. */
export async function fetchReports(client: any, contractAddress: string, protocols: Protocol[] = []): Promise<ExploitReport[]> {
  const data: any[] = (await readView(client, contractAddress, 'get_all_reports')) || [];
  return data
    .map((r) => ({
      id: Number(r.id),
      reporter: r.reporter,
      targetAddress: r.target_address,
      targetName: protocols.find((p) => p.address.toLowerCase() === r.target_address)?.name || r.target_address,
      proofUrl: r.proof_url,
      exploitType: r.exploit_type,
      action: r.action,
      isExploit: Boolean(r.is_exploit),
      confidence: Number(r.confidence),
      reasoning: r.reasoning,
      bountyAwarded: formatGen(r.bounty_awarded),
      stakeOutcome: describeStake(r),
      timestamp: `Report #${Number(r.id)}`
    }))
    .sort((a, b) => b.id - a.id);
}

export async function fetchReportStake(client: any, contractAddress: string): Promise<bigint> {
  return BigInt(await readView(client, contractAddress, 'get_report_stake'));
}

/**
 * Sends a write transaction, waits for consensus and throws with the contract's error message
 * if execution failed (e.g. "Protocol not registered").
 */
async function writeAndWait(client: any, contractAddress: string, functionName: string, args: any[], value: bigint) {
  const startTime = Date.now();
  const txHash = await client.writeContract({ address: contractAddress, functionName, args, value });
  const tx = await client.waitForTransactionReceipt({
    hash: txHash,
    status: 'ACCEPTED',
    fullTransaction: true,
    retries: 120,
    interval: 3000
  });
  const consensus = tx?.consensus_data || {};
  const leaderReceipt = consensus.leader_receipt?.[0] || {};
  if (leaderReceipt.execution_result && leaderReceipt.execution_result !== 'SUCCESS') {
    const stderr: string = leaderReceipt.genvm_result?.stderr || '';
    const userError = stderr.match(/UserError:\s*(.*)/)?.[1] || leaderReceipt.result?.payload?.readable || '';
    throw new Error(`Contract rejected ${functionName}${userError ? ': ' + userError : ''}`);
  }
  return { txHash, tx, consensus, leaderReceipt, durationMs: Date.now() - startTime };
}

export async function registerProtocol(
  client: any,
  contractAddress: string,
  targetAddress: string,
  protocolName: string,
  rules: string,
  bountyWei: bigint = 0n
): Promise<string> {
  const { txHash } = await writeAndWait(client, contractAddress, 'register_protocol', [targetAddress, protocolName, rules], bountyWei);
  return txHash;
}

export async function resetCircuitBreaker(client: any, contractAddress: string, targetAddress: string): Promise<string> {
  const { txHash } = await writeAndWait(client, contractAddress, 'reset_circuit_breaker', [targetAddress], 0n);
  return txHash;
}

export async function submitExploitReport(
  client: any,
  contractAddress: string,
  targetAddress: string,
  proofUrl: string,
  exploitType: string
): Promise<{
  txHash: string;
  status: string;
  steps: ValidatorConsensusStep[];
  durationMs: number;
}> {
  const stake = await fetchReportStake(client, contractAddress);
  const { txHash, tx, consensus, leaderReceipt, durationMs } = await writeAndWait(
    client, contractAddress, 'report_exploit', [targetAddress, proofUrl, exploitType], stake
  );

  const leaderConfig = leaderReceipt.node_config || {};
  const steps: ValidatorConsensusStep[] = [
    {
      validatorId: `${shortAddr(leaderConfig.address)} (Leader Node)`,
      model: [leaderConfig.provider, leaderConfig.model].filter(Boolean).join(' / ') || 'Lead Consensus Evaluator',
      vote: 'LEADER'
    },
    // Validators that sat out the round report "idle"; only show the ones that actually voted
    ...(consensus.validators || []).filter((v: any) => String(v.vote).toLowerCase() !== 'idle').map((v: any) => ({
      validatorId: shortAddr(v.node_config?.address),
      model: [v.node_config?.provider, v.node_config?.model].filter(Boolean).join(' / ') || 'Equivalence Validator',
      vote: String(v.vote || v.execution_result || 'UNKNOWN').toUpperCase()
    }))
  ];

  return {
    txHash,
    status: tx?.statusName || String(tx?.status ?? 'ACCEPTED'),
    steps,
    durationMs
  };
}

function shortAddr(addr?: string): string {
  if (!addr) return 'Validator';
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}
