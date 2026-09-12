import { Protocol, ExploitReport, ValidatorConsensusStep } from './types';

export const NETWORKS = {
  studionet: {
    name: 'GenLayer StudioNet (Gasless)',
    chainId: 61999,
    rpcUrl: 'https://studio.genlayer.com/api',
    explorer: 'https://explorer-studio.genlayer.com',
    currency: 'GEN',
  },
  bradbury: {
    name: 'Testnet Bradbury',
    chainId: 4221,
    rpcUrl: 'https://rpc-bradbury.genlayer.com',
    explorer: 'https://explorer-bradbury.genlayer.com',
    currency: 'GEN',
  },
};

export const INITIAL_PROTOCOLS: Protocol[] = [
  {
    name: 'ApexYield Lending',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    category: 'Money Market',
    rules: 'Max borrow limit 1M USD equivalent. Flashloans must be repaid within the same block with 0.05% fee. Any reentrancy pattern or uncollateralized borrow is an exploit.',
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
    rules: 'Slippage tolerance capped at 2.5% per pool tick. Flash-swaps must maintain constant product invariant k. Price manipulation across multiple oracle updates is prohibited.',
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
    rules: 'Validator signature threshold 3-of-5 required. Single transaction withdrawal cap: 100 ETH equivalent. Recursive mint calls without lock emit are strictly unauthorized.',
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
    proofUrl: 'https://tenderly.co/tx/polygon/0x8bf41a7c29e144',
    simulatedTrace: 'Flashloan 4,000,000 USDC from Aave -> Call deposit() -> Call emergencyWithdraw() recursively 4 times in fallback -> Drained 2,400,000 USDC reserve without collateral check.',
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
    simulatedTrace: 'Call releaseTokens() with forged ECDSA r,s values passing through ecrecover zero address bug -> Minted 500,000 LST without validator quorum.',
    expectedVerdict: 'HALT' as const,
    reasoning: 'Critical signature bypass verified: zero-address check was skipped, allowing unauthorized minting without 3-of-5 validator threshold.',
  }
];

export async function simulateValidatorConsensus(
  exploitTitle: string,
  targetAddress: string,
  proofUrl: string,
  customTrace?: string
): Promise<{
  action: 'HALT' | 'REJECT';
  confidence: number;
  reasoning: string;
  steps: ValidatorConsensusStep[];
}> {
  // Simulate 3 independent GenLayer AI-Validators deliberating under the Equivalence Principle
  const sample = SAMPLE_EXPLOITS.find(s => s.targetAddress === targetAddress && s.proofUrl === proofUrl);
  const isHalt = sample ? sample.expectedVerdict === 'HALT' : (customTrace?.toLowerCase().includes('drain') || customTrace?.toLowerCase().includes('reentrancy') || customTrace?.toLowerCase().includes('exploit'));

  const validators: ValidatorConsensusStep[] = [
    {
      validatorId: 'Val-01 (Leader: Stakeme)',
      model: 'Llama-3.3-70B-Instruct',
      decision: isHalt ? 'HALT' : 'REJECT',
      confidence: isHalt ? 98 : 94,
      latencyMs: 420,
    },
    {
      validatorId: 'Val-02 (Crouton Digital)',
      model: 'Mistral-Large-2407',
      decision: isHalt ? 'HALT' : 'REJECT',
      confidence: isHalt ? 96 : 91,
      latencyMs: 510,
    },
    {
      validatorId: 'Val-03 (Pathrock)',
      model: 'DeepSeek-R1-Distill',
      decision: isHalt ? 'HALT' : 'REJECT',
      confidence: isHalt ? 99 : 93,
      latencyMs: 460,
    },
  ];

  return {
    action: isHalt ? 'HALT' : 'REJECT',
    confidence: isHalt ? 98 : 93,
    reasoning: sample ? sample.reasoning : (isHalt 
      ? 'Critical exploit detected: Evidence indicates unauthorized fund extraction violating protocol safety rules.'
      : 'Evidence review concluded: Transaction conforms to expected parameters and does not constitute a security violation.'),
    steps: validators,
  };
}
