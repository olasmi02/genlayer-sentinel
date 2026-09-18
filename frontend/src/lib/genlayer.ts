import { createClient, chains, createAccount } from 'genlayer-js';
import { Protocol, ExploitReport } from './types';

export const NETWORKS = {
  studionext: {
    name: 'GenLayer Studio Next',
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
    name: 'GenLayer StudioNet',
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

export async function fetchProtocols(client: any, contractAddress: string): Promise<Protocol[]> {
  try {
    const data = await client.readContract({
      address: contractAddress,
      functionName: 'get_all_protocols',
      args: []
    });
    
    if (!data) return [];
    
    return data.map((p: any) => ({
      name: p.protocol_name,
      address: p.target_address,
      category: 'Registered Protocol',
      rules: p.rules,
      bountyPool: p.bounty_pool ? p.bounty_pool.toString() + ' GEN' : '0 GEN',
      tvl: 'N/A',
      isHalted: p.is_halted,
      haltReason: p.halt_reason || '',
      reportsCount: Number(p.reports_count)
    }));
  } catch (err) {
    console.error('Failed to fetch protocols:', err);
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
    
    if (!data) return [];
    
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
    console.error('Failed to fetch reports:', err);
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
): Promise<{ txHash: string, action: string }> {
  const txHash = await client.writeContract({
    address: contractAddress,
    functionName: 'report_exploit',
    args: [targetAddress, proofUrl, exploitType],
    value: 0n
  });
  
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  return { txHash, action: receipt.status === 1 ? 'SUCCESS' : 'FAILED' };
}

export const SAMPLE_EXPLOITS = [
  {
    title: 'Flashloan Reentrancy Attack on ApexYield',
    targetAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    exploitType: 'Reentrancy Drain',
    proofUrl: 'https://tenderly.co/tx/polygon/0x8bf41a7c29e144',
    simulatedTrace: 'Flashloan 4,000,000 USDC from Aave -> Call deposit() -> Call emergencyWithdraw() recursively 4 times in fallback -> Drained 2,400,000 USDC reserve without collateral check.',
    expectedVerdict: 'HALT',
    reasoning: 'Confirmed critical reentrancy exploit: recursive call trace bypassed health factor checks and drained \.4M reserve.',
  },
  {
    title: 'Flash-Swap Arbitrage on Orbit DEX (Benign)',
    targetAddress: '0x1c8b7454c5e53e4b2d184cf4f84c59a35e76a6b1',
    exploitType: 'Price Manipulation Claim',
    proofUrl: 'https://etherscan.io/tx/0xa1b2c3d4e5f67890',
    simulatedTrace: 'Trader swapped 150 ETH for USDC across 3 pools, incurring 0.8% slippage. Pool reserves balanced with standard Uniswap k-curve formula.',
    expectedVerdict: 'REJECT',
    reasoning: 'Legitimate multi-hop swap within registered 2.5% slippage tolerance. No price oracle manipulation detected.',
  },
  {
    title: 'Fake Multi-sig Signature Injection on LiquidStake',
    targetAddress: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    exploitType: 'Bridge Mint Exploit',
    proofUrl: 'https://blockscout.com/tx/0x77665544332211',
    simulatedTrace: 'Call releaseTokens() with forged ECDSA r,s values passing through ecrecover zero address bug -> Minted 500,000 LST without validator quorum.',
    expectedVerdict: 'HALT',
    reasoning: 'Critical signature bypass verified: zero-address check was skipped, allowing unauthorized minting without 3-of-5 validator threshold.',
  }
];

