export interface Protocol {
  name: string;
  address: string;
  category: string;
  rules: string;
  bountyPool: string;
  bountyPoolWei: string;
  tvl: string;
  isHalted: boolean;
  haltReason: string;
  reportsCount: number;
}

export interface ExploitReport {
  id: number;
  reporter: string;
  targetAddress: string;
  targetName: string;
  proofUrl: string;
  exploitType: string;
  action: "HALT" | "REJECT";
  isExploit: boolean;
  confidence: number;
  reasoning: string;
  bountyAwarded: string;
  stakeOutcome: string;
  timestamp: string;
}

export interface ValidatorConsensusStep {
  validatorId: string;
  model: string;
  vote: string;   // "LEADER", or the validator's vote on the leader's verdict (e.g. "AGREE")
}
