# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
from urllib.parse import urlparse
import json

# Evidence must come from one of these hosts (or a subdomain of them).
# Anything else is treated as a spoofing attempt and the reporter's stake is slashed.
WHITELISTED_ORACLES = ("etherscan.io", "tenderly.co", "blockscout.com", "githubusercontent.com", "defillama.com")

# Minimum confidence the validators must report before the circuit breaker is tripped.
HALT_CONFIDENCE_THRESHOLD = 70


@gl.evm.contract_interface
class _Recipient:
    """EOA recipient interface used for native GEN transfers (bounties and stake refunds)."""
    class View:
        pass

    class Write:
        pass


@allow_storage
@dataclass
class SecurityPolicy:
    protocol_name: str
    target_address: str
    owner: str
    rules: str
    bounty_pool: u256
    is_halted: bool
    halt_reason: str
    reports_count: u32

@allow_storage
@dataclass
class ExploitReport:
    id: u32
    reporter: str
    target_address: str
    proof_url: str
    exploit_type: str
    action: str        # "HALT" or "REJECT"
    is_exploit: bool
    confidence: u32
    reasoning: str
    bounty_awarded: u256
    stake: u256
    stake_slashed: bool


def is_whitelisted_source(proof_url: str) -> bool:
    """
    Checks the URL's actual hostname (not a substring of the whole URL), so links such as
    https://evil.com/?etherscan.io or https://etherscan.io.evil.com are rejected.
    """
    try:
        parsed = urlparse(proof_url.strip())
    except Exception:
        return False
    if parsed.scheme != "https":
        return False
    host = (parsed.hostname or "").lower()
    return any(host == d or host.endswith("." + d) for d in WHITELISTED_ORACLES)


def parse_verdict(raw_response: str) -> dict:
    """Extracts the JSON verdict from an LLM response, tolerating code fences or surrounding prose."""
    start = raw_response.find("{")
    end = raw_response.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("No JSON object in LLM response")
    data = json.loads(raw_response[start:end + 1])
    is_exploit = bool(data.get("is_exploit", False))
    confidence = max(0, min(100, int(data.get("confidence", 0))))
    return {
        "is_exploit": is_exploit,
        "action": "HALT" if is_exploit and confidence >= HALT_CONFIDENCE_THRESHOLD else "REJECT",
        "confidence": confidence,
        "reasoning": str(data.get("reasoning", "")).strip(),
    }


class SentinEL(gl.Contract):
    """
    SentinEL: Autonomous Protocol Circuit Breaker & Whitehat Escrow.
    Tracks protocol security policies, accepts staked exploit reports with live web evidence,
    reaches AI-validator consensus via the Equivalence Principle, and autonomously halts
    breached protocols while rewarding whitehat reporters.
    """
    policies: TreeMap[str, SecurityPolicy]
    registered_targets: DynArray[str]
    reports: DynArray[ExploitReport]
    report_count: u32
    total_bounties_paid: u256
    total_stake_slashed: u256
    report_stake: u256

    def __init__(self, report_stake: int):
        self.report_count = u32(0)
        self.total_bounties_paid = u256(0)
        self.total_stake_slashed = u256(0)
        self.report_stake = u256(report_stake)

    @gl.public.write.payable
    def register_protocol(self, target_address: str, protocol_name: str, security_rules: str) -> None:
        """
        Registers a protocol under SentinEL protection with a security policy and optional initial bounty deposit.
        """
        normalized_addr = target_address.lower().strip()
        if normalized_addr in self.policies:
            raise gl.vm.UserError("Protocol already registered")

        bounty_deposit = gl.message.value
        policy = SecurityPolicy(
            protocol_name=protocol_name,
            target_address=normalized_addr,
            owner=gl.message.sender_address.as_hex,
            rules=security_rules,
            bounty_pool=bounty_deposit,
            is_halted=False,
            halt_reason="",
            reports_count=u32(0)
        )
        self.policies[normalized_addr] = policy
        self.registered_targets.append(normalized_addr)

    @gl.public.write.payable
    def topup_bounty(self, target_address: str) -> None:
        """
        Add funds to a protocol's whitehat bounty reserve.
        """
        normalized_addr = target_address.lower().strip()
        if normalized_addr not in self.policies:
            raise gl.vm.UserError("Protocol not registered")
        if gl.message.value == u256(0):
            raise gl.vm.UserError("Must send value to top up bounty pool")

        policy = self.policies[normalized_addr]
        policy.bounty_pool = policy.bounty_pool + gl.message.value
        self.policies[normalized_addr] = policy

    @gl.public.write
    def reset_circuit_breaker(self, target_address: str) -> None:
        """
        Lets the protocol owner resume operations once the incident has been remediated.
        """
        normalized_addr = target_address.lower().strip()
        if normalized_addr not in self.policies:
            raise gl.vm.UserError("Protocol not registered")
        policy = self.policies[normalized_addr]
        if policy.owner.lower() != gl.message.sender_address.as_hex.lower():
            raise gl.vm.UserError("Only the protocol owner can reset the circuit breaker")
        policy.is_halted = False
        policy.halt_reason = ""
        self.policies[normalized_addr] = policy

    @gl.public.write.payable
    def report_exploit(self, target_address: str, proof_url: str, exploit_type: str) -> str:
        """
        Accepts staked proof of an active exploit/anomaly.
        Fetches live web evidence (e.g. transaction receipt, explorer trace, security alert),
        runs consensus AI validation against the protocol's security policy, and autonomously halts
        the protocol if an exploit is confirmed.

        Stake outcomes:
          - Evidence from a non-whitelisted source: report rejected, stake slashed into the bounty pool.
          - Evidence evaluated and rejected: stake refunded.
          - Exploit confirmed (HALT): stake refunded plus the full bounty pool.
        """
        normalized_addr = target_address.lower().strip()
        if normalized_addr not in self.policies:
            raise gl.vm.UserError("Target protocol not registered under SentinEL")

        policy = self.policies[normalized_addr]
        if policy.is_halted:
            raise gl.vm.UserError("Protocol is already halted by circuit breaker")

        stake = gl.message.value
        if stake < self.report_stake:
            raise gl.vm.UserError("Insufficient anti-griefing stake: send at least " + str(self.report_stake) + " wei")

        reporter_addr = gl.message.sender_address.as_hex
        stake_slashed = False

        if not is_whitelisted_source(proof_url):
            # Anti-spoofing: never let validators read attacker-controlled pages.
            stake_slashed = True
            verdict = {
                "is_exploit": False,
                "action": "REJECT",
                "confidence": 100,
                "reasoning": "Anti-Spoofing Shield: evidence host is not an authorized oracle ("
                             + ", ".join(WHITELISTED_ORACLES) + "). Report rejected and stake slashed.",
            }
        else:
            verdict = self._evaluate_evidence(policy, proof_url, exploit_type)

        report_id = self.report_count
        self.report_count = self.report_count + u32(1)

        bounty_to_pay = u256(0)
        payout = u256(0)

        if verdict["action"] == "HALT":
            # Circuit breaker triggered!
            policy.is_halted = True
            policy.halt_reason = verdict["reasoning"]
            bounty_to_pay = policy.bounty_pool
            policy.bounty_pool = u256(0)
            self.total_bounties_paid = self.total_bounties_paid + bounty_to_pay
            payout = bounty_to_pay + stake
        elif stake_slashed:
            policy.bounty_pool = policy.bounty_pool + stake
            self.total_stake_slashed = self.total_stake_slashed + stake
        else:
            payout = stake

        policy.reports_count = policy.reports_count + u32(1)
        self.policies[normalized_addr] = policy

        self.reports.append(ExploitReport(
            id=report_id,
            reporter=reporter_addr,
            target_address=normalized_addr,
            proof_url=proof_url,
            exploit_type=exploit_type,
            action=verdict["action"],
            is_exploit=verdict["is_exploit"],
            confidence=u32(verdict["confidence"]),
            reasoning=verdict["reasoning"],
            bounty_awarded=bounty_to_pay,
            stake=stake,
            stake_slashed=stake_slashed
        ))

        if payout > u256(0):
            _Recipient(Address(reporter_addr)).emit_transfer(value=payout)

        return verdict["action"]

    def _evaluate_evidence(self, policy: SecurityPolicy, proof_url: str, exploit_type: str) -> dict:
        protocol_name = policy.protocol_name
        protocol_address = policy.target_address
        rules = policy.rules

        # Non-deterministic evaluation block executed by the leader and every validator
        def evaluate_threat() -> str:
            # 1. Fetch live web proof / transaction trace from the verified oracle
            try:
                evidence_text = gl.nondet.web.render(proof_url, mode='text')
            except Exception:
                evidence_text = ""
            evidence_sample = (evidence_text or "").strip()[:3000]

            if not evidence_sample:
                return json.dumps({
                    "is_exploit": False,
                    "action": "REJECT",
                    "confidence": 100,
                    "reasoning": "Evidence URL could not be fetched or returned no content. No verifiable proof."
                }, sort_keys=True)

            # 2. Evidence must be about THIS protocol; a real post-mortem of some other
            #    protocol must never be usable to halt this one and claim its bounty.
            evidence_lower = evidence_text.lower()
            if protocol_name.lower() not in evidence_lower and protocol_address not in evidence_lower:
                return json.dumps({
                    "is_exploit": False,
                    "action": "REJECT",
                    "confidence": 100,
                    "reasoning": "Evidence does not reference " + protocol_name + " or its address. Incidents affecting other protocols cannot halt this one."
                }, sort_keys=True)

            prompt = f"""You are a decentralized security auditor and consensus validator for SentinEL Autonomous Circuit Breaker.
Analyze the reported incident evidence against the protocol's active security policy.

PROTOCOL: {protocol_name} ({protocol_address})
REGISTERED SECURITY POLICY RULES:
{rules}

INCIDENT CLAIM:
Exploit Type: {exploit_type}
Evidence Source: {proof_url}

EVIDENCE CONTENT:
\"\"\"
{evidence_sample}
\"\"\"

TASK:
Determine if this evidence proves an active security breach, flashloan exploit, unauthorized withdrawal, or severe rule violation
AGAINST {protocol_name} SPECIFICALLY. If the incident affects a different protocol, vault or contract, reject it.
If the page is a "not found" / error page, or the evidence is insufficient, irrelevant, or describes standard non-malicious activity, reject it as a false positive.

Write the reasoning in English. Respond STRICTLY with valid JSON in this exact structure:
{{
  "is_exploit": true or false,
  "confidence": integer 0 to 100,
  "reasoning": "1-2 sentence explanation of findings"
}}"""

            try:
                verdict = parse_verdict(gl.nondet.exec_prompt(prompt))
            except Exception:
                verdict = {
                    "is_exploit": False,
                    "action": "REJECT",
                    "confidence": 0,
                    "reasoning": "Validator could not produce a well-formed verdict; defaulting to REJECT."
                }
            return json.dumps(verdict, sort_keys=True)

        # Validators will word their reasoning (and score confidence) differently, so exact
        # equality (strict_eq) would never reach consensus. Agree on the decision instead.
        verdict_str = gl.eq_principle.prompt_comparative(
            evaluate_threat,
            principle="The `action` and `is_exploit` fields must be identical. "
                      "`confidence` may differ by up to 20 points. `reasoning` may be worded differently or in a different language."
        )
        return parse_verdict(verdict_str)

    @gl.public.view
    def get_report_stake(self) -> str:
        return str(self.report_stake)

    @gl.public.view
    def is_protocol_halted(self, target_address: str) -> bool:
        """
        External DeFi protocols and vaults query this view method before processing withdrawals or trades.
        If True, the protocol triggers its emergency circuit breaker.
        """
        normalized_addr = target_address.lower().strip()
        if normalized_addr not in self.policies:
            return False
        return self.policies[normalized_addr].is_halted

    def _policy_to_dict(self, p: SecurityPolicy) -> dict:
        return {
            "protocol_name": p.protocol_name,
            "target_address": p.target_address,
            "owner": p.owner,
            "rules": p.rules,
            "bounty_pool": str(p.bounty_pool),
            "is_halted": p.is_halted,
            "halt_reason": p.halt_reason,
            "reports_count": int(p.reports_count)
        }

    def _report_to_dict(self, r: ExploitReport) -> dict:
        return {
            "id": int(r.id),
            "reporter": r.reporter,
            "target_address": r.target_address,
            "proof_url": r.proof_url,
            "exploit_type": r.exploit_type,
            "action": r.action,
            "is_exploit": r.is_exploit,
            "confidence": int(r.confidence),
            "reasoning": r.reasoning,
            "bounty_awarded": str(r.bounty_awarded),
            "stake": str(r.stake),
            "stake_slashed": r.stake_slashed
        }

    @gl.public.view
    def get_protocol(self, target_address: str) -> dict:
        normalized_addr = target_address.lower().strip()
        if normalized_addr not in self.policies:
            return {}
        return self._policy_to_dict(self.policies[normalized_addr])

    @gl.public.view
    def get_all_protocols(self) -> list:
        return [self._policy_to_dict(self.policies[addr]) for addr in self.registered_targets if addr in self.policies]

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "report_count": int(self.report_count),
            "total_bounties_paid": str(self.total_bounties_paid),
            "total_stake_slashed": str(self.total_stake_slashed),
            "report_stake": str(self.report_stake)
        }

    @gl.public.view
    def get_reports_count(self) -> u32:
        return self.report_count

    @gl.public.view
    def get_report(self, index: u32) -> dict:
        if int(index) >= len(self.reports):
            return {}
        return self._report_to_dict(self.reports[int(index)])

    @gl.public.view
    def get_all_reports(self) -> list:
        return [self._report_to_dict(r) for r in self.reports]
