import React from 'react';
import { Shield, ShieldAlert, Cpu, Award, ExternalLink } from 'lucide-react';
import { NETWORKS } from '../lib/genlayer';

interface HeaderProps {
  selectedNetwork: keyof typeof NETWORKS;
  onSelectNetwork: (net: keyof typeof NETWORKS) => void;
  walletAddress: string | null;
  onConnectWallet: () => void;
  onOpenRegister: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedNetwork,
  onSelectNetwork,
  walletAddress,
  onConnectWallet,
  onOpenRegister,
}) => {
  return (
    <header className="border-b border-gray-800 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo & Brand */}
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

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Hackathon Track Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-300">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-400">Track:</span>
            <span className="font-semibold text-white">Autonomous Protocols</span>
          </div>

          {/* Deployed Contract Explorer Link */}
          <a
            href="https://explorer-studio.genlayer.com/address/0xc0547231791DE68E62d7fbcd222766BB86C800C8"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40 text-xs font-semibold transition shadow-sm"
            title="View Deployed Contract on GenLayer Studio Explorer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Contract: 0xc054...00C8</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Network Switcher */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            <button
              onClick={() => onSelectNetwork('studionet')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedNetwork === 'studionet'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              StudioNet (Gasless)
            </button>
            <button
              onClick={() => onSelectNetwork('bradbury')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedNetwork === 'bradbury'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Bradbury Testnet
            </button>
          </div>

          {/* Register Protocol Button */}
          <button
            onClick={onOpenRegister}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" />
            Register Protocol
          </button>

          {/* Wallet Button */}
          <button
            onClick={onConnectWallet}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 transition active:scale-95"
          >
            <Award className="w-4 h-4 text-yellow-300" />
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </div>
    </header>
  );
};
