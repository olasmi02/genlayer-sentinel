import React, { useState } from 'react';
import { ShieldAlert, Zap, X, Globe, FileCode2, Terminal } from 'lucide-react';
import { Protocol } from '../lib/types';
import { SAMPLE_EXPLOITS } from '../lib/genlayer';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  protocols: Protocol[];
  onTriggerReport: (targetAddress: string, proofUrl: string, exploitType: string, trace: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  protocols,
  onTriggerReport,
}) => {
  const [selectedTarget, setSelectedTarget] = useState(protocols[0]?.address || '');
  const [proofUrl, setProofUrl] = useState('');
  const [exploitType, setExploitType] = useState('Reentrancy Drain');
  const [evidenceTrace, setEvidenceTrace] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (sample: typeof SAMPLE_EXPLOITS[0]) => {
    setSelectedTarget(sample.targetAddress);
    setProofUrl(sample.proofUrl);
    setExploitType(sample.exploitType);
    setEvidenceTrace(sample.simulatedTrace);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget || !proofUrl) return;
    onTriggerReport(selectedTarget, proofUrl, exploitType, evidenceTrace);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f1422] border border-gray-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Report Exploit Trace</h3>
            <p className="text-xs text-gray-400">Trigger Autonomous AI Circuit Breaker & Claim Bounty</p>
          </div>
        </div>

        {/* Preset Attack Scenarios for Quick Testing */}
        <div className="mb-5 p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            Quick Test Scenarios (One-Click Fill)
          </div>
          <div className="space-y-1.5">
            {SAMPLE_EXPLOITS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(sample)}
                className="w-full text-left p-2 rounded-lg bg-gray-900/60 hover:bg-purple-900/40 border border-gray-800/80 hover:border-purple-500/40 transition flex items-center justify-between text-xs"
              >
                <span className="font-semibold text-gray-200">{sample.title}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    sample.expectedVerdict === 'HALT'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  Expected: {sample.expectedVerdict}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-400 font-semibold mb-1">Target Protected Protocol</label>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              {protocols.map((p) => (
                <option key={p.address} value={p.address}>
                  {p.name} ({p.address.slice(0, 10)}...{p.address.slice(-6)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 font-semibold mb-1">Exploit Category</label>
            <input
              type="text"
              value={exploitType}
              onChange={(e) => setExploitType(e.target.value)}
              placeholder="e.g. Flashloan Reentrancy, Oracle Drift, Bridge Replay"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-semibold mb-1 flex items-center justify-between">
              <span>Proof / Transaction Trace URL (Fetched by GenVM)</span>
              <span className="text-[10px] text-purple-400 flex items-center gap-1">
                <Globe className="w-3 h-3" /> gl.nondet.web.render()
              </span>
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://tenderly.co/tx/... or verified github security disclosure"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
              required
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
              <span>Whitelisted Oracles: Tenderly, Etherscan, Blockscout, GitHub Security</span>
              <span className="text-yellow-400 font-mono">Anti-Griefing Stake: 500 GEN</span>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-semibold mb-1 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Evidence Trace Logs / Call Hierarchy
            </label>
            <textarea
              rows={3}
              value={evidenceTrace}
              onChange={(e) => setEvidenceTrace(e.target.value)}
              placeholder="Paste relevant call trace, reentrancy steps, or decompiled call data..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-red-500/20 transition active:scale-95 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-yellow-300" />
              Dispatch to AI Validators
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
