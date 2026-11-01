# [SIMULATED DEMO] Incident Report: ApexYield Lending Reentrancy Drain

**Protocol:** ApexYield Lending (`0x742d35Cc6634C0532925a3b844Bc454e4438f44e`)
**Severity:** Critical — active exploit, funds being drained
**Status:** Ongoing

## Summary
An attacker contract borrowed 4,000,000 USDC via an Aave flashloan, deposited into ApexYield, and
re-entered `emergencyWithdraw()` from its fallback function before the vault updated the caller's
balance. Each recursive call withdrew collateral that had already been withdrawn.

## Call trace
```
Attacker.flashloan(4_000_000 USDC)
  -> ApexYield.deposit(4_000_000 USDC)
  -> ApexYield.emergencyWithdraw()
       -> Attacker.fallback()
            -> ApexYield.emergencyWithdraw()   // re-entered, balance not yet zeroed
                 -> Attacker.fallback()
                      -> ApexYield.emergencyWithdraw()   // depth 3
  -> Aave.repay(4_000_000 USDC)
```

## Impact
- 2,400,000 USDC drained from the reserve with no collateral backing.
- Health-factor checks were bypassed because state was updated after the external call.
- This is a reentrancy pattern and an uncollateralized borrow, both explicitly prohibited by
  ApexYield's registered security policy.

## Recommendation
Pause the protocol immediately; remaining reserves are exposed to the same attack.
