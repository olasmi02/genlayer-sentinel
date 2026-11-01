import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Activity,
  Coins,
  Cpu,
  Lock,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw,
  Award,
  CheckCircle2,
  XCircle,
  FileCode2,
} from 'lucide-react';
import { Header } from './components/Header';
import { ReportModal } from './components/ReportModal';
import { RegisterModal } from './components/RegisterModal';
import { ConsensusModal } from './components/ConsensusModal';
import {
  NETWORKS,
  NetworkKey,
  INITIAL_PROTOCOLS,
  deployedAddress,
  getGenLayerClient,
  getProvider,
  getConnectedAccount,
  getWalletChainId,
  connectWallet,
  ensureWalletNetwork,
  fetchBalance,
  requestTestGen,
  metamaskDeepLink,
  fetchProtocols,
  fetchReports,
  formatGen,
  parseGen,
  registerProtocol,
  resetCircuitBreaker,
  submitExploitReport
} from './lib/genlayer';
import { Protocol, ExploitReport } from './lib/types';

type ContractStatus = 'checking' | 'live' | 'missing';

export function App() {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>('studionet');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const [notice, setNotice] = useState<{ text: string; link?: { href: string; label: string } } | null>(null);
  const [contractAddress, setContractAddress] = useState<string>(deployedAddress('studionet'));
  const [contractStatus, setContractStatus] = useState<ContractStatus>('checking');
  const [contractError, setContractError] = useState<string>('');
  const [protocols, setProtocols] = useState<Protocol[]>(INITIAL_PROTOCOLS);
  const [reports, setReports] = useState<ExploitReport[]>([]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState(false);
  const [activeTargetProtocol, setActiveTargetProtocol] = useState<string>('');
  const [reportTarget, setReportTarget] = useState<string>('');

  const [isDeliberating, setIsDeliberating] = useState(false);
  const [deliberationResult, setDeliberationResult] = useState<any>(null);
  const [deliberationError, setDeliberationError] = useState<string>('');

  const errorText = (e: any) => e?.shortMessage || e?.details || e?.message || String(e);

  // Returns the freshly loaded on-chain state so callers don't depend on stale React state
  const refreshData = async (): Promise<{ protocols: Protocol[]; reports: ExploitReport[] } | null> => {
    if (!contractAddress || contractAddress.length !== 42) {
      setContractStatus('missing');
      setContractError(`No SentinEL contract is deployed on ${NETWORKS[selectedNetwork].name} yet.`);
      setProtocols(INITIAL_PROTOCOLS);
      setReports([]);
      return null;
    }
    try {
      const client = getGenLayerClient(selectedNetwork);
      const p = await fetchProtocols(client, contractAddress);
      const r = await fetchReports(client, contractAddress, p);
      setProtocols(p);
      setReports(r);
      setContractStatus('live');
      setContractError('');
      return { protocols: p, reports: r };
    } catch (e: any) {
      console.warn('SentinEL contract unreachable:', e);
      setContractStatus('missing');
      setContractError(errorText(e));
      setProtocols(INITIAL_PROTOCOLS);
      setReports([]);
      return null;
    }
  };

  useEffect(() => {
    setContractStatus('checking');
    refreshData();
  }, [selectedNetwork, contractAddress]);

  const handleSelectNetwork = (net: NetworkKey) => {
    setSelectedNetwork(net);
    setContractAddress(deployedAddress(net));
  };

  const refreshBalance = async (address = walletAddress) => {
    if (!address) return setWalletBalance(null);
    setWalletBalance(await fetchBalance(selectedNetwork, address).catch(() => null));
  };

  // Restore a wallet the user already authorised (no prompt) and follow account/network changes
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;
    getConnectedAccount().then(setWalletAddress);
    getWalletChainId().then(setWalletChainId);
    const onAccounts = (accounts: string[]) => setWalletAddress(accounts[0] || null);
    const onChain = (hex: string) => setWalletChainId(parseInt(hex, 16));
    provider.on?.('accountsChanged', onAccounts);
    provider.on?.('chainChanged', onChain);
    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged', onChain);
    };
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [walletAddress, selectedNetwork]);

  const showNoWallet = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setNotice(
      isMobile
        ? { text: 'No wallet found in this browser. Open SentinEL in the MetaMask app to connect.', link: { href: metamaskDeepLink(), label: 'Open in MetaMask' } }
        : { text: 'No browser wallet found. Install MetaMask to report exploits or register protocols.', link: { href: 'https://metamask.io/download/', label: 'Get MetaMask' } }
    );
  };

  const handleConnectWallet = async () => {
    if (!getProvider()) return showNoWallet();
    try {
      const address = await connectWallet(selectedNetwork);
      setWalletAddress(address);
      setWalletChainId(NETWORKS[selectedNetwork].chainId);
      setNotice(null);
    } catch (e: any) {
      setNotice({ text: 'Wallet connection failed: ' + errorText(e) });
    }
  };

  const handleDisconnectWallet = () => {
    // Wallets can't be disconnected programmatically; forget it locally until the user reconnects
    setWalletAddress(null);
    setWalletBalance(null);
  };

  const handleRequestTestGen = async () => {
    if (!walletAddress) return;
    setIsFunding(true);
    try {
      await requestTestGen(selectedNetwork, walletAddress);
      await refreshBalance(walletAddress);
      setNotice({ text: `Added 1,000 test GEN to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} on ${NETWORKS[selectedNetwork].shortName}.` });
    } catch (e: any) {
      setNotice({ text: 'Faucet request failed: ' + errorText(e) });
    } finally {
      setIsFunding(false);
    }
  };

  const requireLiveContract = () => {
    if (contractStatus === 'live') return true;
    setNotice({ text: `SentinEL is not reachable on ${NETWORKS[selectedNetwork].name}. ${contractError}` });
    return false;
  };

  /** Writes need a connected wallet on the selected network; returns a wallet-backed client or null. */
  const requireWalletClient = async () => {
    if (!requireLiveContract()) return null;
    if (!getProvider()) {
      showNoWallet();
      return null;
    }
    let address = walletAddress;
    try {
      if (!address) {
        address = await connectWallet(selectedNetwork);
        setWalletAddress(address);
      } else {
        await ensureWalletNetwork(selectedNetwork);
      }
      setWalletChainId(NETWORKS[selectedNetwork].chainId);
    } catch (e: any) {
      setNotice({ text: 'Connect your wallet to continue: ' + errorText(e) });
      return null;
    }
    return getGenLayerClient(selectedNetwork, address);
  };

  const handleOpenReportForProtocol = (addr: string) => {
    setReportTarget(addr);
    setIsReportModalOpen(true);
  };

  const handleTriggerReport = async (targetAddress: string, proofUrl: string, exploitType: string) => {
    const client = await requireWalletClient();
    if (!client) return;
    const targetProto = protocols.find((p) => p.address.toLowerCase() === targetAddress.toLowerCase());
    setActiveTargetProtocol(targetProto?.name || targetAddress);
    setIsConsensusModalOpen(true);
    setIsDeliberating(true);
    setDeliberationResult(null);
    setDeliberationError('');

    try {
      const previousLatestId = reports.length > 0 ? reports[0].id : -1;

      // 1. Submit the staked report from the user's wallet; validators fetch the evidence and reach consensus on-chain
      const onChainTx = await submitExploitReport(client, contractAddress, targetAddress, proofUrl, exploitType);

      // 2. The verdict is whatever the contract recorded: read the newest report back
      const fresh = await refreshData();
      refreshBalance();
      const latestReport = fresh?.reports.find(
        (r) => r.id > previousLatestId && r.targetAddress === targetAddress.toLowerCase()
      );
      if (!latestReport) {
        throw new Error(`Transaction ${onChainTx.txHash} was accepted but no new report was recorded on-chain.`);
      }

      setDeliberationResult({
        action: latestReport.action,
        confidence: latestReport.confidence,
        reasoning: latestReport.reasoning,
        bountyAwarded: latestReport.bountyAwarded,
        stakeOutcome: latestReport.stakeOutcome,
        txHash: onChainTx.txHash,
        status: onChainTx.status,
        durationMs: onChainTx.durationMs,
        steps: onChainTx.steps
      });
    } catch (e: any) {
      setDeliberationError(errorText(e));
    } finally {
      setIsDeliberating(false);
    }
  };

  const handleRegisterProtocol = async (newProto: Protocol) => {
    const client = await requireWalletClient();
    if (!client) return;
    try {
      await registerProtocol(client, contractAddress, newProto.address, newProto.name, newProto.rules, parseGen(newProto.bountyPool));
      await refreshData();
      refreshBalance();
    } catch (e: any) {
      setNotice({ text: 'Protocol registration failed: ' + errorText(e) });
    }
  };

  const handleResetProtocol = async (address: string) => {
    const client = await requireWalletClient();
    if (!client) return;
    try {
      await resetCircuitBreaker(client, contractAddress, address);
      await refreshData();
    } catch (e: any) {
      setNotice({ text: 'Circuit breaker reset failed: ' + errorText(e) });
    }
  };

  const isOwner = (proto: Protocol) => !!walletAddress && proto.owner?.toLowerCase() === walletAddress.toLowerCase();
  const wrongNetwork = !!walletAddress && walletChainId !== null && walletChainId !== NETWORKS[selectedNetwork].chainId;

  const activeBreakers = protocols.filter((p) => p.isHalted).length;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans selection:bg-purple-500/30">
      <Header
        selectedNetwork={selectedNetwork}
        onSelectNetwork={handleSelectNetwork}
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        wrongNetwork={wrongNetwork}
        isFunding={isFunding}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        onSwitchNetwork={() => ensureWalletNetwork(selectedNetwork).catch((e) => setNotice({ text: errorText(e) }))}
        onRequestTestGen={handleRequestTestGen}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
        contractAddress={contractAddress}
        setContractAddress={setContractAddress}
      />

      {notice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-100">
            <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="flex-1 min-w-0 break-words">
              {notice.text}{' '}
              {notice.link && (
                <a href={notice.link.href} target="_blank" rel="noreferrer" className="font-bold text-yellow-300 underline">
                  {notice.link.label}
                </a>
              )}
            </p>
            <button onClick={() => setNotice(null)} className="text-yellow-300 hover:text-white shrink-0" aria-label="Dismiss">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10 sm:space-y-12">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/40 via-[#0B0F19] to-cyan-900/20 border border-gray-800/60 p-6 sm:p-8 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-6">
              <SparklesIcon className="w-4 h-4" />
              The First AI-Native Security Layer
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
              Decentralized Security <br className="hidden md:block"/> Powered by LLM Consensus
            </h1>
            <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl">
              SentinEL connects external security events to on-chain execution. By leveraging GenLayer's Equivalence Principle, AI validators evaluate web-based exploit proofs and autonomously halt compromised protocols before funds are drained.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={`${NETWORKS[selectedNetwork].explorer}/address/${contractAddress}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-purple-600/25 active:scale-95"
              >
                View Contract on Explorer
                <ChevronRight className="w-4 h-4" />
              </a>
              <button 
                onClick={() => setIsRegisterModalOpen(true)}
                className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold border border-gray-700 transition active:scale-95"
              >
                Register Your Protocol
              </button>
            </div>
            <div
              className={`mt-6 inline-flex items-start gap-2 px-3 py-2 rounded-lg text-xs border ${
                contractStatus === 'live'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : contractStatus === 'checking'
                  ? 'bg-gray-800/60 border-gray-700 text-gray-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {contractStatus === 'live' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : contractStatus === 'checking' ? (
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span>
                {contractStatus === 'live' && <>Live: reading on-chain state from <code className="font-mono break-all">{contractAddress}</code></>}
                {contractStatus === 'checking' && <>Connecting to SentinEL contract...</>}
                {contractStatus === 'missing' && (
                  <>
                    Contract not found on {NETWORKS[selectedNetwork].name}. Showing demo protocols only; reports are disabled
                    until you deploy with <code className="font-mono">npm run deploy</code> or paste a live address.
                  </>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Global Stats Matrix */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#0f1422] border border-gray-800 p-4 sm:p-5 rounded-2xl shadow-lg min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-400 leading-tight">Guarded Protocols</h3>
            </div>
            <p className="text-xl sm:text-3xl font-black text-white font-mono break-words">{protocols.length}</p>
          </div>
          
          <div className="bg-[#0f1422] border border-gray-800 p-4 sm:p-5 rounded-2xl shadow-lg min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Coins className="w-4 h-4 text-yellow-400" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-400 leading-tight">Total Bounty Escrow</h3>
            </div>
            <p className="text-xl sm:text-3xl font-black text-white font-mono break-words">
              {formatGen(protocols.reduce((sum, p) => sum + BigInt(p.bountyPoolWei || '0'), 0n))}
            </p>
          </div>

          <div className="bg-[#0f1422] border border-gray-800 p-4 sm:p-5 rounded-2xl shadow-lg min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg bg-red-500/10 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-400 leading-tight">Active Circuit Breakers</h3>
            </div>
            <div className="flex flex-wrap items-end gap-x-2">
              <p className="text-xl sm:text-3xl font-black text-white font-mono break-words">{activeBreakers}</p>
              {activeBreakers > 0 && <span className="text-xs text-red-400 font-bold mb-1.5 animate-pulse">INCIDENT ACTIVE</span>}
            </div>
          </div>

          <div className="bg-[#0f1422] border border-gray-800 p-4 sm:p-5 rounded-2xl shadow-lg min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-400 leading-tight">Reports Processed</h3>
            </div>
            <p className="text-xl sm:text-3xl font-black text-white font-mono break-words">{reports.length}</p>
          </div>
        </section>

        {/* Protocol Registry Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                Active Security Policies
              </h2>
              <p className="text-xs text-gray-400">Smart contracts currently protected by SentinEL</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {protocols.map((proto) => (
              <div 
                key={proto.address}
                className={`bg-[#0f1422] border rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all ${
                  proto.isHalted 
                    ? 'border-red-500/50 shadow-red-900/20' 
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        {proto.name}
                        {proto.isHalted ? (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </h3>
                      <p className="text-xs text-purple-400 font-mono mt-1 bg-purple-500/10 inline-block px-1.5 py-0.5 rounded">
                        {proto.address.slice(0, 10)}...{proto.address.slice(-8)}
                      </p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 px-2 py-1 rounded text-[10px] font-bold text-gray-400">
                      {proto.category}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">
                      Registered Equivalence Rules
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed bg-gray-900/50 p-2.5 rounded-lg border border-gray-800/80 min-h-[60px]">
                      {proto.rules}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 py-3 border-t border-gray-800/80 text-xs mb-4">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Guarded TVL</span>
                      <span className="font-bold text-white font-mono">{proto.tvl}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Bounty Escrow</span>
                      <span className="font-bold text-yellow-300 font-mono">{proto.bountyPool}</span>
                    </div>
                  </div>

                  {/* Halted Reason Alert */}
                  {proto.isHalted && (
                    <div className="p-3 mb-4 rounded-lg bg-red-900/30 border border-red-500/40 text-xs text-red-200">
                      <strong className="block text-red-300 font-bold mb-0.5">Exploit Verified:</strong>
                      <p className="text-[11px] font-mono leading-tight">{proto.haltReason}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-gray-800/60 flex items-center gap-2">
                  {proto.isHalted && isOwner(proto) ? (
                    <button
                      onClick={() => handleResetProtocol(proto.address)}
                      className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                      Reset Circuit Breaker (Owner)
                    </button>
                  ) : proto.isHalted ? (
                    <div className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold text-center">
                      Halted: awaiting owner remediation
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenReportForProtocol(proto.address)}
                      className="w-full py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      Report Exploit / Claim Bounty
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Incident & Adjudication Feed */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Live Incident Audit & Consensus Log
              </h2>
              <p className="text-xs text-gray-400">On-chain verdicts rendered by GenLayer AI-validators</p>
            </div>
            <button onClick={() => refreshData()} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-[#0f1422] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="divide-y divide-gray-800/80">
              {reports.length === 0 && (
                <div className="p-6 text-center text-xs text-gray-400">
                  {contractStatus === 'live' ? 'No reports submitted yet.' : 'Connect to a live SentinEL contract to see on-chain verdicts.'}
                </div>
              )}
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-900/40 transition">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          rep.action === 'HALT'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {rep.action === 'HALT' ? 'CIRCUIT BREAKER: HALTED' : 'DISMISSED: REJECT'}
                      </span>
                      <span className="text-xs font-bold text-white">{rep.targetName}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-purple-400 font-semibold">{rep.exploitType}</span>
                    </div>

                    <p className="text-xs text-gray-300 font-mono leading-relaxed break-words">{rep.reasoning}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 pt-1">
                      <span className="min-w-0 break-all">Reporter: <code className="text-gray-300">{rep.reporter}</code></span>
                      <span>•</span>
                      <a
                        href={rep.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        Evidence URL <ExternalLink className="w-3 h-3" />
                      </a>
                      <span>•</span>
                      <span>Bounty Paid: <strong className="text-yellow-300 font-mono">{rep.bountyAwarded}</strong></span>
                      <span>•</span>
                      <span className={rep.stakeOutcome.startsWith('Stake slashed') ? 'text-red-300 font-mono' : 'font-mono'}>
                        {rep.stakeOutcome}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="text-xs font-bold text-white font-mono">
                      Confidence: {rep.confidence}%
                    </div>
                    <div className="text-[11px] text-gray-400">{rep.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="p-6 rounded-2xl bg-gradient-to-r from-gray-900 to-[#0f1422] border border-gray-800">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                How GenLayer's Equivalence Principle Makes SentinEL Possible
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Traditional smart contracts cannot read external web block explorers (Tenderly, Etherscan) nor evaluate natural language security policies. SentinEL uses GenLayer's <strong className="text-white">GenVM Python environment</strong> to execute <code className="text-purple-300">gl.nondet.web.render()</code> for real-time trace retrieval and <code className="text-purple-300">gl.eq_principle.prompt_comparative()</code> across decentralized AI validators, who must agree on the HALT/REJECT decision even when their wording differs. Validators independently cross-examine the exploit trace and come to unmanipulable consensus on whether to trip the circuit breaker.
              </p>
            </div>
          </div>
        </section>
      </main>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        protocols={protocols}
        initialTarget={reportTarget}
        onTriggerReport={handleTriggerReport}
      />

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegister={handleRegisterProtocol}
      />

      <ConsensusModal
        isOpen={isConsensusModalOpen}
        onClose={() => setIsConsensusModalOpen(false)}
        isLoading={isDeliberating}
        result={deliberationResult}
        error={deliberationError}
        targetProtocolName={activeTargetProtocol}
      />
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
