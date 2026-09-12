import React, { useState } from 'react';
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
  INITIAL_PROTOCOLS,
  INITIAL_REPORTS,
  NETWORKS,
  simulateValidatorConsensus,
} from './lib/genlayer';
import { Protocol, ExploitReport, ValidatorConsensusStep } from './lib/types';

export function App() {
  const [selectedNetwork, setSelectedNetwork] = useState<keyof typeof NETWORKS>('studionet');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>(INITIAL_PROTOCOLS);
  const [reports, setReports] = useState<ExploitReport[]>(INITIAL_REPORTS);

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState(false);
  const [activeTargetProtocol, setActiveTargetProtocol] = useState<string>('');

  // Consensus Deliberation State
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [deliberationResult, setDeliberationResult] = useState<{
    action: 'HALT' | 'REJECT';
    confidence: number;
    reasoning: string;
    steps: ValidatorConsensusStep[];
  } | null>(null);

  const handleConnectWallet = () => {
    if (walletAddress) {
      setWalletAddress(null);
    } else {
      setWalletAddress('0x38B7...F44E');
    }
  };

  const handleOpenReportForProtocol = (addr: string) => {
    setActiveTargetProtocol(addr);
    setIsReportModalOpen(true);
  };

  const handleTriggerReport = async (
    targetAddress: string,
    proofUrl: string,
    exploitType: string,
    evidenceTrace: string
  ) => {
    const targetProto = protocols.find((p) => p.address === targetAddress);
    const protoName = targetProto?.name || 'Target Protocol';
    setActiveTargetProtocol(protoName);
    setIsConsensusModalOpen(true);
    setIsDeliberating(true);
    setDeliberationResult(null);

    // Run simulated GenLayer AI Validator Consensus deliberation
    const result = await simulateValidatorConsensus(
      exploitType,
      targetAddress,
      proofUrl,
      evidenceTrace
    );

    // Artificial delay to visualize the 3 validator votes resolving
    setTimeout(() => {
      setIsDeliberating(false);
      setDeliberationResult(result);

      if (result.action === 'HALT') {
        // Halt target protocol
        setProtocols((prev) =>
          prev.map((p) =>
            p.address === targetAddress
              ? {
                  ...p,
                  isHalted: true,
                  haltReason: result.reasoning,
                  reportsCount: p.reportsCount + 1,
                  bountyPool: '0 GEN (Paid to Whitehat)',
                }
              : p
          )
        );
      }

      // Add to audit reports
      const newReport: ExploitReport = {
        id: reports.length + 101,
        reporter: walletAddress || '0xWhitehatAgent...9192',
        targetAddress,
        targetName: protoName,
        proofUrl,
        exploitType,
        action: result.action,
        isExploit: result.action === 'HALT',
        confidence: result.confidence,
        reasoning: result.reasoning,
        bountyAwarded: result.action === 'HALT' ? '15,000 GEN' : '0 GEN',
        timestamp: 'Just now',
      };
      setReports((prev) => [newReport, ...prev]);
    }, 1200);
  };

  const handleResetProtocol = (address: string) => {
    setProtocols((prev) =>
      prev.map((p) =>
        p.address === address
          ? {
              ...p,
              isHalted: false,
              haltReason: '',
              bountyPool: '15,000 GEN',
            }
          : p
      )
    );
  };

  const handleRegisterProtocol = (newProto: Protocol) => {
    setProtocols((prev) => [newProto, ...prev]);
  };

  const activeBreakers = protocols.filter((p) => p.isHalted).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e]">
      <Header
        selectedNetwork={selectedNetwork}
        onSelectNetwork={setSelectedNetwork}
        walletAddress={walletAddress}
        onConnectWallet={handleConnectWallet}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative rounded-2xl p-8 overflow-hidden bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#0B0F19] border border-purple-900/30 shadow-2xl">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-4">
              <SparklesIcon className="w-3.5 h-3.5 text-cyan-400" />
              GenLayer Agent Tank Hackathon Submission · Track: Autonomous Protocols
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
              Autonomous Protocol Circuit Breaker & Whitehat Escrow
            </h1>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              When an exploit occurs on-chain, traditional DAOs take days to vote while pools are drained.
              <strong className="text-white"> SentinEL</strong> runs an autonomous security guardian in GenVM:
              AI validators fetch live transaction traces via <code className="text-purple-300">gl.nondet.web.render</code>,
              adjudicate code against human-readable policies, and instantly trigger a circuit breaker freeze
              while rewarding the reporting whitehat.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setActiveTargetProtocol(protocols[0]?.name || '');
                  setIsReportModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-yellow-300" />
                Simulate Exploit Report
              </button>
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-700 text-xs font-semibold transition"
              >
                + Register New Target Vault
              </button>
              <a
                href="https://github.com/genlayerlabs/genlayer-project-boilerplate"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gray-900/60 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 text-xs font-medium transition flex items-center gap-1.5"
              >
                <FileCode2 className="w-4 h-4 text-purple-400" />
                View Python Contract
              </a>
            </div>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#0f1422] border border-gray-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">{protocols.length}</div>
              <div className="text-xs text-gray-400 font-medium">Protected Protocols</div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#0f1422] border border-gray-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">$25.5M</div>
              <div className="text-xs text-gray-400 font-medium">Guarded TVL</div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#0f1422] border border-gray-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">90,000 GEN</div>
              <div className="text-xs text-gray-400 font-medium">Active Bounty Escrow</div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#0f1422] border border-gray-800 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
              activeBreakers > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${activeBreakers > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">{activeBreakers}</div>
              <div className="text-xs text-gray-400 font-medium">Circuit Breakers Tripped</div>
            </div>
          </div>
        </div>

        {/* Protected Protocols Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                Registered Protocol Vaults
              </h2>
              <p className="text-xs text-gray-400">Target contracts protected by autonomous AI guardian rules</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {protocols.map((proto) => (
              <div
                key={proto.address}
                className={`rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                  proto.isHalted
                    ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-950/40'
                    : 'bg-[#0f1422] border-gray-800 hover:border-gray-700'
                }`}
              >
                <div>
                  {/* Status Banner */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-semibold text-gray-400 px-2.5 py-1 rounded-md bg-gray-900 border border-gray-800">
                      {proto.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                        proto.isHalted
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {proto.isHalted ? (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> CIRCUIT BREAKER: HALTED
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE · PROTECTED
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title & Address */}
                  <h3 className="text-base font-bold text-white mb-1">{proto.name}</h3>
                  <p className="text-[11px] font-mono text-gray-400 truncate mb-4">
                    {proto.address}
                  </p>

                  {/* Security Policy */}
                  <div className="mb-4 p-3 rounded-lg bg-gray-900/80 border border-gray-800/80 text-xs">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                      Active AI Security Policy
                    </span>
                    <p className="text-gray-300 text-[11px] line-clamp-3 leading-relaxed">
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
                  {proto.isHalted ? (
                    <button
                      onClick={() => handleResetProtocol(proto.address)}
                      className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                      Reset Circuit Breaker (Admin)
                    </button>
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
          </div>

          <div className="bg-[#0f1422] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="divide-y divide-gray-800/80">
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
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-purple-400 font-semibold">{rep.exploitType}</span>
                    </div>

                    <p className="text-xs text-gray-300 font-mono leading-relaxed">{rep.reasoning}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 pt-1">
                      <span>Reporter: <code className="text-gray-300">{rep.reporter}</code></span>
                      <span>·</span>
                      <a
                        href={rep.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        Evidence URL <ExternalLink className="w-3 h-3" />
                      </a>
                      <span>·</span>
                      <span>Bounty Paid: <strong className="text-yellow-300 font-mono">{rep.bountyAwarded}</strong></span>
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

        {/* How GenLayer Powers SentinEL Box */}
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
                Traditional smart contracts cannot read external web block explorers (Tenderly, Etherscan) nor evaluate natural language security policies. SentinEL uses GenLayer's <strong className="text-white">GenVM Python environment</strong> to execute <code className="text-purple-300">gl.nondet.web.render()</code> for real-time trace retrieval and <code className="text-purple-300">gl.eq_principle.strict_eq()</code> across decentralized AI validators. Validators independently cross-examine the exploit trace and come to unmanipulable consensus on whether to trip the circuit breaker.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        protocols={protocols}
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
