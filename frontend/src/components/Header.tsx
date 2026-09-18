import React from 'react';
import { Shield, ShieldAlert, Cpu, Award, ExternalLink } from 'lucide-react';
import { NETWORKS } from '../lib/genlayer';

interface HeaderProps {
  selectedNetwork: keyof typeof NETWORKS;
  onSelectNetwork: (net: keyof typeof NETWORKS) => void;
  walletAddress: string | null;
  onConnectWallet: () => void;
  onOpenRegister: () => void;
  contractAddress: string;
  setContractAddress: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedNetwork,
  onSelectNetwork,
  walletAddress,
  onConnectWallet,
  onOpenRegister,
  contractAddress,
  setContractAddress
}) => {
  return (
    <header className="border-b border-gray-800 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                  SentinEL
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                  GenVM Intelligent Contract
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">Autonomous Protocol Circuit Breaker & Whitehat Escrow</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
              <button
                onClick={() => onSelectNetwork('studionext')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedNetwork === 'studionext'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Studio Next (61997)
              </button>
              <button
                onClick={() => onSelectNetwork('studionet')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedNetwork === 'studionet'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                StudioNet (61999)
              </button>
            </div>
            <button
              onClick={onOpenRegister}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" />
              Register Protocol
            </button>
            <button
              onClick={onConnectWallet}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 transition active:scale-95"
            >
              <Award className="w-4 h-4 text-yellow-300" />
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect Wallet'}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-800/50 pt-2">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
             <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
             Live Contract connection: 
             <input 
               type="text" 
               className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-purple-500 w-96 ml-2" 
               value={contractAddress}
               onChange={(e) => setContractAddress(e.target.value)}
               placeholder="0x..."
             />
             <a
              href={`${NETWORKS[selectedNetwork].explorer}/address/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-300 ml-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="ml-2 text-gray-400">|</span>
            <span className="ml-2 text-[10px] text-gray-500">Connected via genlayer-js</span>
          </div>
        </div>
      </div>
    </header>
  );
};
