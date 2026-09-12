import React, { useState } from 'react';
import { ShieldCheck, X, PlusCircle, Coins } from 'lucide-react';
import { Protocol } from '../lib/types';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (newProto: Protocol) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onRegister,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Money Market');
  const [rules, setRules] = useState('');
  const [bountyPool, setBountyPool] = useState('10,000 GEN');
  const [tvl, setTvl] = useState('$1,500,000');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !rules) return;

    onRegister({
      name,
      address,
      category,
      rules,
      bountyPool,
      tvl,
      isHalted: false,
      haltReason: '',
      reportsCount: 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f1422] border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Register Target Protocol</h3>
            <p className="text-xs text-gray-400">Onboard smart contract to SentinEL Autonomous Protection</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-400 font-semibold mb-1">Protocol Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aether Lending V2"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 font-semibold mb-1">Contract Address (Target Vault)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Money Market">Money Market</option>
                <option value="Concentrated Liquidity">DEX / AMM</option>
                <option value="Cross-Chain Bridge">Bridge</option>
                <option value="Yield Vault">Yield Vault</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 font-semibold mb-1 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                Initial Bounty Deposit
              </label>
              <input
                type="text"
                value={bountyPool}
                onChange={(e) => setBountyPool(e.target.value)}
                placeholder="5,000 GEN"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-semibold mb-1">
              Natural Language Security Policy (Rules for AI Validators)
            </label>
            <textarea
              rows={3}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g. Flashloans must be returned in the same block. Max slippage 3%. Any withdrawal exceeding 200 ETH without timelock is unauthorized."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
              required
            />
            <p className="text-[10px] text-gray-500 mt-1">
              GenLayer validators evaluate reported transactions directly against these plain-text rules.
            </p>
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
              className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-500/20 transition active:scale-95 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Register & Seed Vault
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
