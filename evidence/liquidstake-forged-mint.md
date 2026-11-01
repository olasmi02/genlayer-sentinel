# [SIMULATED DEMO] Incident Report: LiquidStake Bridge Unauthorized Mint

**Protocol:** LiquidStake Bridge (`0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc`)
**Severity:** Critical — unauthorized mint in progress
**Status:** Ongoing

## Summary
`releaseTokens()` accepted a forged ECDSA signature set. `ecrecover` returned the zero address for
the malformed signatures, and the bridge counted `address(0)` as an approved validator because the
validator set was never checked for the zero address.

## Call trace
```
Attacker.releaseTokens(amount=500_000 LST, sigs=[forged, forged, forged])
  -> ecrecover(...) == 0x0000000000000000000000000000000000000000  (x3)
  -> quorum check passed (3 of 5) using zero-address "validators"
  -> LST.mint(attacker, 500_000)
```

## Impact
- 500,000 LST minted without the required 3-of-5 validator signatures.
- Single-transaction release exceeded the 100 ETH-equivalent withdrawal cap.
- Unauthorized mint is explicitly defined as an exploit in the bridge's security policy.

## Recommendation
Halt the bridge before further forged releases are processed.
