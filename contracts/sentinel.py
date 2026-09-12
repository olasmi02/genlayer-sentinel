# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

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

class SentinEL(gl.Contract):
    """
    SentinEL: Autonomous Protocol Circuit Breaker & Whitehat Escrow.
    Tracks protocol security policies, accepts exploit reports with live web evidence,
    reaches AI-validator consensus via the Equivalence Principle, and autonomously halts
    breached protocols while rewarding whitehat reporters.
    """
    policies: TreeMap[str, SecurityPolicy]
    registered_targets: DynArray[str]
    reports: DynArray[ExploitReport]
    report_count: u32
    total_bounties_paid: u256

    def __init__(self):
        self.report_count = u32(0)
        self.total_bounties_paid = u256(0)

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
    def report_exploit(self, target_address: str, proof_url: str, exploit_type: str) -> str:
        """
        Accepts proof of an active exploit/anomaly.
        Fetches live web evidence (e.g. transaction receipt, explorer trace, security alert),
        runs consensus AI validation against the protocol's security policy, and autonomously halts
        the protocol if an exploit is confirmed.
        """
        normalized_addr = target_address.lower().strip()
        if normalized_addr not in self.policies:
            raise gl.vm.UserError("Target protocol not registered under SentinEL")

        policy = self.policies[normalized_addr]
        if policy.is_halted:
            raise gl.vm.UserError("Protocol is already halted by circuit breaker")

        # Non-deterministic evaluation block executed by validators
        def evaluate_threat():
            # 1. Fetch live web proof / transaction trace
            evidence_text = gl.nondet.web.render(proof_url, mode='text')
            evidence_sample = evidence_text[:3000]

            prompt = f"""You are a decentralized security auditor and consensus validator for SentinEL Autonomous Circuit Breaker.
Analyze the reported incident evidence against the protocol's active security policy.

PROTOCOL: {policy.protocol_name} ({policy.target_address})
REGISTERED SECURITY POLICY RULES:
{policy.rules}

INCIDENT CLAIM:
Exploit Type: {exploit_type}
Evidence Source: {proof_url}

EVIDENCE CONTENT:
\"\"\"
{evidence_sample}
\"\"\"

TASK:
Determine if this evidence proves an active security breach, flashloan exploit, unauthorized withdrawal, or severe rule violation.
If evidence is insufficient, irrelevant, or describes standard non-malicious activity, reject it as a false positive.

Respond STRICTLY with valid JSON in this exact structure:
{{
  "is_exploit": true or false,
  "action": "HALT" or "REJECT",
  "confidence": integer 0 to 100,
  "reasoning": "1-2 sentence explanation of findings"
}}"""

            raw_response = gl.nondet.exec_prompt(prompt)
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()

            data = json.loads(cleaned)
            is_exploit = bool(data.get("is_exploit", False))
            confidence = int(data.get("confidence", 0))
            action = "HALT" if is_exploit and confidence >= 70 else "REJECT"

            return json.dumps({
                "is_exploit": is_exploit,
                "action": action,
                "confidence": confidence,
                "reasoning": str(data.get("reasoning", "")).strip()
            }, sort_keys=True)

        # Validators achieve consensus on the verdict using the Equivalence Principle
        verdict_str = gl.eq_principle.strict_eq(evaluate_threat)
        verdict = json.loads(verdict_str)

        report_id = self.report_count
        self.report_count = self.report_count + u32(1)
        reporter_addr = gl.message.sender_address.as_hex

        bounty_to_pay = u256(0)

        if verdict["action"] == "HALT":
            # Circuit breaker triggered!
            policy.is_halted = True
            policy.halt_reason = verdict["reasoning"]

            # Award bounty from pool to whitehat reporter
            bounty_to_pay = policy.bounty_pool
            if bounty_to_pay > u256(0):
                policy.bounty_pool = u256(0)
                self.total_bounties_paid = self.total_bounties_paid + bounty_to_pay
                # Disburse bounty
                Address(reporter_addr).emit_transfer(value=bounty_to_pay)

        policy.reports_count = policy.reports_count + u32(1)
        self.policies[normalized_addr] = policy

        report = ExploitReport(
            id=report_id,
            reporter=reporter_addr,
            target_address=normalized_addr,
            proof_url=proof_url,
            exploit_type=exploit_type,
            action=verdict["action"],
            is_exploit=verdict["is_exploit"],
            confidence=u32(verdict["confidence"]),
            reasoning=verdict["reasoning"],
            bounty_awarded=bounty_to_pay
        )
        self.reports.append(report)

        return verdict["action"]

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

    @gl.public.view
    def get_protocol(self, target_address: str) -> dict:
        normalized_addr = target_address.lower().strip()
        if normalized_addr not in self.policies:
            return {}
        p = self.policies[normalized_addr]
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

    @gl.public.view
    def get_all_protocols(self) -> list:
        result = []
        for addr in self.registered_targets:
            if addr in self.policies:
                p = self.policies[addr]
                result.append({
                    "protocol_name": p.protocol_name,
                    "target_address": p.target_address,
                    "owner": p.owner,
                    "rules": p.rules,
                    "bounty_pool": str(p.bounty_pool),
                    "is_halted": p.is_halted,
                    "halt_reason": p.halt_reason,
                    "reports_count": int(p.reports_count)
                })
        return result

    @gl.public.view
    def get_reports_count(self) -> u32:
        return self.report_count

    @gl.public.view
    def get_report(self, index: u32) -> dict:
        if int(index) >= len(self.reports):
            return {}
        r = self.reports[int(index)]
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
            "bounty_awarded": str(r.bounty_awarded)
        }

    @gl.public.view
    def get_all_reports(self) -> list:
        result = []
        for r in self.reports:
            result.append({
                "id": int(r.id),
                "reporter": r.reporter,
                "target_address": r.target_address,
                "proof_url": r.proof_url,
                "exploit_type": r.exploit_type,
                "action": r.action,
                "is_exploit": r.is_exploit,
                "confidence": int(r.confidence),
                "reasoning": r.reasoning,
                "bounty_awarded": str(r.bounty_awarded)
            })
        return result
