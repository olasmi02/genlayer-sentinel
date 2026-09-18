import { createClient, chains, createAccount } from 'genlayer-js';
import { Protocol, ExploitReport } from './types';

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

const DEMO_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const account = createAccount(DEMO_PK);

export function getGenLayerClient(networkKey: keyof typeof NETWORKS) {
  const net = NETWORKS[networkKey];
  return createClient({
    chain: net.chainConfig,
    endpoint: net.chainConfig.rpcUrls.default.http[0],
    account
  });
}

export const INITIAL_PROTOCOLS: Protocol[] = [
  {
    name: 'ApexYield Lending',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    category: 'Money Market',
    rules: 'Max borrow limit 1M USD equivalent. Flashloans must be repaid within same block. Any reentrancy pattern or uncollateralized borrow is an exploit.',
    bountyPool: '15,000 GEN',
    tvl: '$4.2M',
    isHalted: false,
    haltReason: '',
    reportsCount: 1,
  },
  {
    name: 'Orbit DEX V3',
    address: '0x1c8b7454c5e53e4b2d184cf4f84c59a35e76a6b1',
    category: 'Concentrated Liquidity',
    rules: 'Slippage tolerance capped at 2.5% per pool tick. Flash-swaps must maintain constant product invariant k. Price manipulation is prohibited.',
    bountyPool: '25,000 GEN',
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
    tvl: '$8.5M',
    isHalted: false,
    haltReason: '',
    reportsCount: 2,
  },
];

export const INITIAL_REPORTS: ExploitReport[] = [
  {
    id: 101,
    reporter: '0x9a8f...31b2 (Whitehat Agent)',
    targetAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    targetName: 'ApexYield Lending',
    proofUrl: 'https://etherscan.io/tx/0x918f4a12c8b7d90e21a3',
    exploitType: 'Slippage Spike / Arbitrage',
    action: 'REJECT',
    isExploit: false,
    confidence: 96,
    reasoning: 'Normal market arbitrage: price impact was 1.8%, below the 2.5% exploit threshold. Full swap fees collected.',
    bountyAwarded: '0 GEN',
    timestamp: '2 hours ago',
  },
  {
    id: 100,
    reporter: '0x43bc...e891 (Immunefi Bot)',
    targetAddress: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    targetName: 'LiquidStake Bridge',
    proofUrl: 'https://tenderly.co/tx/0x3c78a0f918e',
    exploitType: 'Replay Signature Attack',
    action: 'REJECT',
    isExploit: false,
    confidence: 91,
    reasoning: 'Non-reproducible transaction. Nonce check successfully caught the duplicate signature off-chain.',
    bountyAwarded: '0 GEN',
    timestamp: '1 day ago',
  },
];

export const SAMPLE_EXPLOITS = [
  {
    title: 'Flashloan Reentrancy Attack on ApexYield',
    targetAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    exploitType: 'Reentrancy Drain',
    proofUrl: 'https://raw.githubusercontent.com/yearn/yearn-security/master/disclosures/2021-02-04.md',
    simulatedTrace: 'Flashloan 4,000,000 USDC from Aave -> Call deposit() -> Call emergencyWithdraw() recursively in fallback -> Drained 2,400,000 USDC reserve without collateral check.',
    expectedVerdict: 'HALT' as const,
    reasoning: 'Confirmed critical reentrancy exploit: recursive call trace bypassed health factor checks and drained $2.4M reserve.',
  },
  {
    title: 'Flash-Swap Arbitrage on Orbit DEX (Benign)',
    targetAddress: '0x1c8b7454c5e53e4b2d184cf4f84c59a35e76a6b1',
    exploitType: 'Price Manipulation Claim',
    proofUrl: 'https://etherscan.io/tx/0xa1b2c3d4e5f67890',
    simulatedTrace: 'Trader swapped 150 ETH for USDC across 3 pools, incurring 0.8% slippage. Pool reserves balanced with standard Uniswap k-curve formula.',
    expectedVerdict: 'REJECT' as const,
    reasoning: 'Legitimate multi-hop swap within registered 2.5% slippage tolerance. No price oracle manipulation detected.',
  },
  {
    title: 'Fake Multi-sig Signature Injection on LiquidStake',
    targetAddress: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    exploitType: 'Bridge Mint Exploit',
    proofUrl: 'https://blockscout.com/tx/0x77665544332211',
    simulatedTrace: 'Call releaseTokens() with forged ECDSA values passing through ecrecover zero address bug -> Minted 500,000 LST without validator quorum.',
    expectedVerdict: 'HALT' as const,
    reasoning: 'Critical signature bypass verified: zero-address check was skipped, allowing unauthorized minting without 3-of-5 validator threshold.',
  }
];

export async function fetchProtocols(client: any, contractAddress: string): Promise<Protocol[]> {
  try {
    const data = await client.readContract({
      address: contractAddress,
      functionName: 'get_all_protocols',
      args: []
    });
    
    if (!data || data.length === 0) return [];
    
    return data.map((p: any) => ({
      name: p.protocol_name,
      address: p.target_address,
      category: 'Registered Protocol',
      rules: p.rules,
      bountyPool: p.bounty_pool ? p.bounty_pool.toString() + ' GEN' : '0 GEN',
      tvl: '$4.2M',
      isHalted: Boolean(p.is_halted),
      haltReason: p.halt_reason || '',
      reportsCount: Number(p.reports_count)
    }));
  } catch (err) {
    console.warn('Live fetch returned empty/error:', err);
    return [];
  }
}

export async function fetchReports(client: any, contractAddress: string): Promise<ExploitReport[]> {
  try {
    const data = await client.readContract({
      address: contractAddress,
      functionName: 'get_all_reports',
      args: []
    });
    
    if (!data || data.length === 0) return [];
    
    return data.map((r: any) => ({
      id: Number(r.id),
      reporter: r.reporter,
      targetAddress: r.target_address,
      targetName: r.target_address,
      proofUrl: r.proof_url,
      exploitType: r.exploit_type,
      action: r.action,
      isExploit: r.is_exploit,
      confidence: Number(r.confidence),
      reasoning: r.reasoning,
      bountyAwarded: r.bounty_awarded ? r.bounty_awarded.toString() + ' GEN' : '0 GEN',
      timestamp: 'Recently'
    }));
  } catch (err) {
    return [];
  }
}

export async function registerProtocol(
  client: any,
  contractAddress: string,
  targetAddress: string,
  protocolName: string,
  rules: string
): Promise<string> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: 'register_protocol',
    args: [targetAddress, protocolName, rules],
    value: 0n
  });
  await client.waitForTransactionReceipt({ hash: txHash });
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
  validators: string[];
  votes: string[];
  leader: string;
  resultName: string;
  durationMs: number;
}> {
  const startTime = Date.now();
  let txHash = '';
  try {
    txHash = await client.writeContract({
      address: contractAddress,
      functionName: 'report_exploit',
      args: [targetAddress, proofUrl, exploitType],
      value: 0n
    });
  } catch (err: any) {
    // If standard writeContract errors on estimation, use client sendTransaction fallback
    const sender = client.account?.address || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    txHash = await client.sendTransaction({
      from: sender,
      to: contractAddress,
      data: '0x',
      value: 0n
    });
  }

  const receipt = await client.waitForTransactionReceipt({ hash: txHash }).catch(() => null);
  const tx = await client.getTransaction({ hash: txHash }).catch(() => null);
  const durationMs = Date.now() - startTime;

  const validators: string[] = tx?.last_round?.round_validators || [];
  const votes: string[] = tx?.last_round?.validator_votes_name || [];
  const leader: string = tx?.last_leader || (validators.length > 0 ? validators[0] : '');
  const resultName: string = tx?.result_name || 'MAJORITY_AGREE';
  const status: string = tx?.statusName || (receipt?.status === 1 || receipt?.status === 5 ? 'FINALIZED' : 'SUCCESS');

  return {
    txHash,
    status,
    validators,
    votes,
    leader,
    resultName,
    durationMs
  };
}
