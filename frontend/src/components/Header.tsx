import React from 'react';
import { Shield, ShieldAlert, Wallet, ExternalLink, Droplets, AlertTriangle, LogOut } from 'lucide-react';
import { NETWORKS, NetworkKey, formatGen } from '../lib/genlayer';

interface HeaderProps {
  selectedNetwork: NetworkKey;
  onSelectNetwork: (net: NetworkKey) => void;
  walletAddress: string | null;
  walletBalance: bigint | null;
  wrongNetwork: boolean;
  isFunding: boolean;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onSwitchNetwork: () => void;
  onRequestTestGen: () => void;
  onOpenRegister: () => void;
  contractAddress: string;
  setContractAddress: (val: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedNetwork,
  onSelectNetwork,
  walletAddress,
  walletBalance,
  wrongNetwork,
  isFunding,
  onConnectWallet,
  onDisconnectWallet,
  onSwitchNetwork,
  onRequestTestGen,
  onOpenRegister,
  contractAddress,
  setContractAddress
}) => {
  const shortAddr = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '';

  return (
    <header className="border-b border-gray-800 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3">
        {/* Brand + wallet */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                  SentinEL
                </span>
                <span className="hidden md:inline px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                  GenVM Intelligent Contract
                </span>
              </div>
              <p className="hidden sm:block text-xs text-gray-400 font-medium truncate">Autonomous Protocol Circuit Breaker & Whitehat Escrow</p>
            </div>
          </div>

          {walletAddress ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-xs">
                <Wallet className="w-4 h-4 text-purple-400" />
                <div className="leading-tight">
                  <div className="font-bold text-white font-mono">{shortAddr}</div>
                  <div className="text-[10px] text-yellow-300 font-mono">{walletBalance === null ? '…' : formatGen(walletBalance)}</div>
                </div>
              </div>
              <button
                onClick={onDisconnectWallet}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                aria-label="Disconnect wallet"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 transition active:scale-95"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}
        </div>

        {/* Network + actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {(Object.keys(NETWORKS) as NetworkKey[]).map((key) => (
              <button
                key={key}
                onClick={() => onSelectNetwork(key)}
                className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                  selectedNetwork === key ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                {NETWORKS[key].shortName} <span className="opacity-70">({NETWORKS[key].chainId})</span>
              </button>
            ))}
          </div>
          <button
            onClick={onOpenRegister}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" />
            Register Protocol
          </button>
          {walletAddress && (
            <button
              onClick={onRequestTestGen}
              disabled={isFunding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition disabled:opacity-50"
              title="Studio faucet: adds 1,000 test GEN to your wallet"
            >
              <Droplets className="w-3.5 h-3.5" />
              {isFunding ? 'Funding…' : 'Get test GEN'}
            </button>
          )}
          {wrongNetwork && (
            <button
              onClick={onSwitchNetwork}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/30"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Wallet on wrong network: switch
            </button>
          )}
        </div>

        {/* Contract */}
        <div className="flex items-center gap-2 border-t border-gray-800/50 pt-2 text-xs text-emerald-400 font-mono min-w-0">
          <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-400 animate-pulse" />
          <span className="shrink-0 hidden sm:inline">Live Contract connection:</span>
          <span className="shrink-0 sm:hidden">Contract:</span>
          <input
            type="text"
            className="flex-1 min-w-0 sm:flex-none sm:w-96 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-purple-500"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Not deployed on this network"
            spellCheck={false}
          />
          <a
            href={`${NETWORKS[selectedNetwork].explorer}/address/${contractAddress}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 hover:text-emerald-300 p-1"
            aria-label="View contract on explorer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="hidden lg:inline ml-1 text-[10px] text-gray-500">Connected via genlayer-js</span>
        </div>
      </div>
    </header>
  );
};
