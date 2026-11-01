import React from 'react';
import { Cpu, CheckCircle2, AlertOctagon, X, Sparkles, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { ValidatorConsensusStep } from '../lib/types';

interface ConsensusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  result: {
    action: 'HALT' | 'REJECT';
    confidence: number;
    reasoning: string;
    bountyAwarded: string;
    stakeOutcome: string;
    txHash: string;
    status: string;
    durationMs: number;
    steps: ValidatorConsensusStep[];
  } | null;
  error?: string;
  targetProtocolName: string;
}

export const ConsensusModal: React.FC<ConsensusModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  result,
  error,
  targetProtocolName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1422] border border-gray-800 rounded-2xl w-full max-w-2xl p-4 sm:p-6 my-2 sm:my-0 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-purple-600/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center gap-x-2 gap-y-1 pr-8">
              GenLayer AI Consensus Deliberation
              <span className="text-xs px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 font-mono">
                Equivalence Principle
              </span>
            </h3>
            <p className="text-xs text-gray-400">Target: <span className="text-white font-semibold">{targetProtocolName}</span></p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
              <Sparkles className="w-6 h-6 text-purple-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">Deliberating Across AI Validators...</h4>
            <p className="text-xs text-gray-400 max-w-md">
              Leader fetching transaction receipt via <code className="text-purple-300">gl.nondet.web.render()</code> and proposing verdict. Independent validators validating output with LLMs.
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/30 flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-300 mb-1">Transaction failed: no verdict recorded</h4>
                <p className="text-xs text-gray-300 font-mono break-all">{error}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : result ? (
          <div className="space-y-6">
            {/* Final Verdict Banner */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-4 ${
                result.action === 'HALT'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {result.action === 'HALT' ? (
                <AlertOctagon className="w-7 h-7 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold uppercase tracking-wider">
                    {result.action === 'HALT' ? '🚨 Circuit Breaker Tripped: HALT TARGET' : '✅ Incident Dismissed: REJECT (False Positive)'}
                  </h4>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40">
                    Confidence: {result.confidence}%
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-mono">{result.reasoning}</p>
                <div
                  className={`mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
                    result.action === 'HALT' ? 'border-red-500/20' : 'border-emerald-500/20'
                  }`}
                >
                  <span className="text-white font-medium">
                    {result.action === 'HALT' ? 'Automated Action: Target Vault Frozen' : 'Protocol remains operational'}
                  </span>
                  <span className="text-yellow-300 font-bold font-mono">
                    Bounty: {result.bountyAwarded} · {result.stakeOutcome}
                  </span>
                </div>
              </div>
            </div>

            {/* Validator Consensus Matrix */}
            <div>
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Independent AI Validator Verification (Equivalence Principle)
              </h5>
              <div className="space-y-2">
                {result.steps.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gray-900/80 border border-gray-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          v.vote === 'LEADER' || v.vote === 'AGREE' ? 'bg-emerald-400' : 'bg-red-400'
                        }`}
                      />
                      <div>
                        <div className="font-semibold text-white">{v.validatorId}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{v.model}</div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded font-bold font-mono ${
                        v.vote === 'LEADER'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : v.vote === 'AGREE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {v.vote === 'LEADER' ? `PROPOSED ${result.action}` : v.vote}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-800">
              <span className="text-[11px] text-gray-400 flex items-center gap-1.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="truncate">
                  {result.status} · <code className="font-mono">{result.txHash.slice(0, 10)}...{result.txHash.slice(-6)}</code>
                </span>
                <Clock className="w-3 h-3 shrink-0" />
                {(result.durationMs / 1000).toFixed(1)}s
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
