// Deploys contracts/sentinel.py to a GenLayer Studio network, seeds the demo protocols, and writes the
// new address to frontend/src/lib/deployment.json (keyed by network) so the web app picks it up.
//
// Usage (from the repo root):  npm run deploy
// Env vars:
//   NETWORK            studionet (default, chain 61999) or studionext (chain 61997)
//   PRIVATE_KEY        deployer key (defaults to the public demo key the frontend uses)
//   REPORT_STAKE_GEN   anti-griefing stake per report, in GEN (default 500)
//   SEED_BOUNTIES      "0" to register the demo protocols without bounty deposits
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient, createAccount, chains } from '../frontend/node_modules/genlayer-js/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEMO_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const WEI_PER_GEN = 10n ** 18n;

const NETWORKS = {
  studionet: { id: 61999, name: 'GenLayer StudioNet', rpc: 'https://studio.genlayer.com/api', explorer: 'https://explorer-studio.genlayer.com' },
  studionext: { id: 61997, name: 'GenLayer Studio Next', rpc: 'https://studio-dev.genlayer.com/api', explorer: 'https://explorer-studio-dev.genlayer.com' },
};
const networkKey = process.env.NETWORK || 'studionet';
const net = NETWORKS[networkKey];
if (!net) throw new Error(`Unknown NETWORK "${networkKey}" (use ${Object.keys(NETWORKS).join(' or ')})`);
const chain = { ...chains.studionet, id: net.id, name: net.name, rpcUrls: { default: { http: [net.rpc] } } };

const account = createAccount(process.env.PRIVATE_KEY || DEMO_PK);
const client = createClient({ chain, account });
const reportStake = BigInt(process.env.REPORT_STAKE_GEN ?? '500') * WEI_PER_GEN;
const seedBounties = process.env.SEED_BOUNTIES !== '0';

const DEMO_PROTOCOLS = [
  {
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    name: 'ApexYield Lending',
    rules: 'Max borrow limit 1M USD equivalent. Flashloans must be repaid within same block. Any reentrancy pattern or uncollateralized borrow is an exploit.',
    bountyGen: 15_000n,
  },
  {
    address: '0x1c8b7454c5e53e4b2d184cf4f84c59a35e76a6b1',
    name: 'Orbit DEX V3',
    rules: 'Slippage tolerance capped at 2.5% per pool tick. Flash-swaps must maintain constant product invariant k. Price manipulation is prohibited.',
    bountyGen: 25_000n,
  },
  {
    address: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    name: 'LiquidStake Bridge',
    rules: 'Validator signature threshold 3-of-5 required. Single transaction withdrawal cap: 100 ETH equivalent. Unauthorized mint is an exploit.',
    bountyGen: 50_000n,
  },
];

async function waitOk(hash, label) {
  const tx = await client.waitForTransactionReceipt({ hash, status: 'ACCEPTED', fullTransaction: true, retries: 120, interval: 3000 });
  const leader = tx?.consensus_data?.leader_receipt?.[0];
  if (leader?.execution_result && leader.execution_result !== 'SUCCESS') {
    throw new Error(`${label} failed: ${leader.genvm_result?.stderr || JSON.stringify(leader.result)}`);
  }
  return tx;
}

async function tryFund(amount) {
  // Studio exposes sim_fundAccount (amount in wei, too large for a JSON number from JSON.stringify)
  try {
    const res = await fetch(net.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: `{"jsonrpc":"2.0","id":1,"method":"sim_fundAccount","params":["${account.address}",${amount}]}`,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    console.log(`Requested ${amount / WEI_PER_GEN} GEN from the Studio faucet for ${account.address}`);
  } catch (e) {
    console.log(`Studio faucet unavailable (${e.message}); continuing with existing balance.`);
  }
}

console.log(`Network: ${net.name} (${net.id})`);
console.log(`Deployer: ${account.address}`);
if (seedBounties) {
  const total = DEMO_PROTOCOLS.reduce((s, p) => s + p.bountyGen * WEI_PER_GEN, 0n) + 10n * reportStake;
  await tryFund(total);
}

const code = readFileSync(join(root, 'contracts', 'sentinel.py'), 'utf-8');
console.log(`Deploying SentinEL (report stake ${reportStake / WEI_PER_GEN} GEN)...`);
const deployHash = await client.deployContract({ code, args: [reportStake] });
const deployTx = await waitOk(deployHash, 'Deployment');
const contractAddress = deployTx?.data?.contract_address || deployTx?.to_address || deployTx?.recipient;
if (!contractAddress) {
  throw new Error('Could not find deployed contract address in receipt: ' + JSON.stringify(Object.keys(deployTx || {})));
}
console.log(`SentinEL deployed at ${contractAddress}`);

for (const p of DEMO_PROTOCOLS) {
  const value = seedBounties ? p.bountyGen * WEI_PER_GEN : 0n;
  process.stdout.write(`Registering ${p.name} (bounty ${value / WEI_PER_GEN} GEN)... `);
  const hash = await client.writeContract({
    address: contractAddress,
    functionName: 'register_protocol',
    args: [p.address, p.name, p.rules],
    value,
  });
  await waitOk(hash, `register_protocol(${p.name})`);
  console.log('ok');
}

const deploymentPath = join(root, 'frontend', 'src', 'lib', 'deployment.json');
const deployments = existsSync(deploymentPath) ? JSON.parse(readFileSync(deploymentPath, 'utf-8')) : {};
deployments[networkKey] = { address: contractAddress, deployedAt: new Date().toISOString() };
writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2) + '\n');
console.log(`Wrote ${deploymentPath}`);
console.log(`Explorer: ${net.explorer}/address/${contractAddress}`);
