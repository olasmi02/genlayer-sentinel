# [SIMULATED DEMO] Trade Analysis: Orbit DEX V3 Multi-Hop Swap

**Protocol:** Orbit DEX V3 (`0x1c8b7454c5e53e4b2d184cf4f84c59a35e76a6b1`)
**Reported as:** Price manipulation

## Trace
```
Trader.swap(150 ETH -> USDC) via pools ETH/USDT, USDT/DAI, DAI/USDC
  pool 1 slippage: 0.31%
  pool 2 slippage: 0.22%
  pool 3 slippage: 0.27%
  total slippage:  0.80%
```

## Analysis
- Every pool stayed within the 2.5% per-tick slippage cap.
- Post-trade reserves satisfy the constant-product invariant `k` (difference attributable to fees).
- No flash-swap, no oracle read in the same transaction, swap fees were paid in full.

This is a normal arbitrage trade. No security rule was violated and no funds were lost.
