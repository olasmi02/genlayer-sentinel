# SentinEL 🛡️ — Project & Submission Overview

### Autonomous Protocol Circuit Breaker & Whitehat Escrow
**Submission for GenLayer Hackathon | Agent Tank — Track: Autonomous Protocols**

---

## 📌 Quick Links
* **Live Web App:** [https://olasmi02.github.io/genlayer-sentinel/](https://olasmi02.github.io/genlayer-sentinel/)
* **GitHub Repository:** [https://github.com/olasmi02/genlayer-sentinel](https://github.com/olasmi02/genlayer-sentinel)
* **Contract Explorer (StudioNet):** [https://explorer-studio.genlayer.com/address/0x40E132981AAB9B7a677770693eEA56546026c211](https://explorer-studio.genlayer.com/address/0x40E132981AAB9B7a677770693eEA56546026c211)
* **Supported Networks in App:** GenLayer Studio Next (Chain ID: 61997) & StudioNet (Chain ID: 61999)

---

## 📁 Folder Structure in your Documents

```text
SentinEL/
├── contracts/
│   ├── sentinel.py          # Core Intelligent Contract (Python / GenVM)
│   └── mock_protocol.py     # Target DeFi Vault with circuit breaker hook
├── frontend/
│   ├── src/                 # React 19 + TypeScript + Tailwind CSS UI
│   │   ├── components/      # Header, ConsensusModal, ReportModal, RegisterModal
│   │   └── lib/             # genlayer.ts (real genlayer-js SDK integration)
│   ├── dist/                # Production build deployed on GitHub Pages
│   └── package.json
├── tests/
│   └── direct/              # Pytest unit tests & GenVM mock harness
├── README.md                # Comprehensive technical specification & diagrams
├── sentinel_logo.jpg        # Project branding & track banner
└── SUBMISSION_OVERVIEW.md   # This quick reference guide
```

---

## 🧠 Core Features & Architecture

### 1. GenVM Intelligent Contract (`contracts/sentinel.py`)
* Written in Python specifically for the GenLayer Virtual Machine (GenVM).
* Executes `gl.nondet.web.render(proof_url)` to fetch real-world transaction receipts and security alerts directly from the web.
* Uses `gl.eq_principle.prompt_comparative(evaluate_threat, principle)` to coordinate decentralized AI validator consensus (running Llama 3, Mistral, and DeepSeek).
* Autonomously halts compromised protocols by flipping `is_halted = True` and releases the whitehat bounty.

### 2. Anti-Spoofing & Oracle Whitelist Protection
* Prevents malicious actors from creating fake websites with hack keywords to freeze protocols.
* Enforces that evidence URLs must originate from authorized oracles (`etherscan.io`, `tenderly.co`, `blockscout.com`, `githubusercontent.com`, `defillama.com`).
* Enforces a **500 GEN Anti-Griefing Stake**:
  * **Verified Exploit:** +15,000 GEN Bounty awarded & 500 GEN stake refunded.
  * **Spoofed / Fake Report:** 500 GEN stake slashed and burned.

### 3. Frontend Integration (`frontend/`)
* Built with Vite, React 19, TypeScript, and `@tailwindcss/vite`.
* Integrated with the official `genlayer-js` SDK (`createClient`, `readContract`, `writeContract`).
* Users connect their own wallet (MetaMask or any EIP-1193 wallet); the app adds/switches to the GenLayer network and signs reports, stakes and registrations from that wallet. No keys ship in the frontend.
* Built-in Studio faucet ("Get test GEN") so anyone can fund a wallet for the 500 GEN report stake.
* Network switcher for **StudioNet (61999)**, where the contract is deployed, and **Studio Next (61997)**.
* Responsive layout for phones, tablets and desktop.
* Includes real-time HTTP evidence fetching and displays live on-chain validator consensus details.

---

## 🚀 How to Run the Frontend Locally

If you ever want to run or test the frontend on your computer:
1. Open terminal in the `frontend` folder:
   ```powershell
   cd frontend
   npm run dev
   ```
2. Open your browser at:
   `http://localhost:5173`

---

## 🎬 2-Minute Demo Video Script (For Hackathon Submission)

1. **Scene 1 (0:00 - 0:30) — Problem & Live Contract Connection:**
   * Open the live site: `https://olasmi02.github.io/genlayer-sentinel/`
   * Point out **StudioNet (61999)** selected in the top bar, the **Live Contract connection**, and connect your wallet.
   * State: *"Traditional smart contracts are blind to external hacks. SentinEL connects real-world web evidence to on-chain execution using GenLayer Intelligent Contracts on GenLayer Studio."*

2. **Scene 2 (0:30 - 1:00) — Python Intelligent Contract:**
   * Briefly show `contracts/sentinel.py` on screen.
   * State: *"Our contract uses `gl.nondet.web.render` to fetch live block explorer traces and `gl.eq_principle.prompt_comparative` to let decentralized AI validators reach consensus on whether a protocol's security rules were breached."*

3. **Scene 3 (1:00 - 1:45) — Live Trigger & AI Deliberation:**
   * Return to the live site. Click **Report Exploit / Claim Bounty** under ApexYield Lending.
   * Click the preset **Flashloan Reentrancy Attack on ApexYield** (or paste a verified disclosure link).
   * Submit and let the consensus modal deliberator resolve.
   * State: *"The AI validators cross-examine the evidence against ApexYield's registered security rules, verify the reentrancy drain, and achieve consensus."*

4. **Scene 4 (1:45 - 2:00) — Circuit Breaker Trips & Wrap-up:**
   * Show ApexYield marked with the red **INCIDENT ACTIVE (HALTED)** banner and the bounty disbursed.
   * State: *"The circuit breaker autonomously tripped to protect the remaining vault funds, with zero human intervention. Thank you!"*
