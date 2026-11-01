import sys
import os
import pytest

# Inject mock genlayer into sys.modules
from mock_genlayer import MockGL, u256, u32, Address, TreeMap, DynArray, allow_storage
import mock_genlayer

sys.modules['genlayer'] = mock_genlayer
mock_genlayer.gl = MockGL()

# Add contracts directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../contracts')))

from sentinel import SentinEL

STAKE = 500
OWNER = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
WHITEHAT = Address("0x9999999999999999999999999999999999999999")

@pytest.fixture
def gl_env():
    gl = mock_genlayer.gl
    gl.message.sender_address = OWNER
    gl.message.value = u256(0)
    gl.nondet.web.responses.clear()
    gl.nondet.llm_responses.clear()
    mock_genlayer.TRANSFERS.clear()
    return gl

@pytest.fixture
def sentinel_contract(gl_env):
    contract = SentinEL(STAKE)
    contract.policies = TreeMap()
    contract.registered_targets = DynArray()
    contract.reports = DynArray()
    return contract

def register(contract, gl_env, target, name, rules, bounty=0):
    gl_env.message.sender_address = OWNER
    gl_env.message.value = u256(bounty)
    contract.register_protocol(target, name, rules)

def report_as_whitehat(contract, gl_env, target, proof_url, exploit_type, stake=STAKE):
    gl_env.message.sender_address = WHITEHAT
    gl_env.message.value = u256(stake)
    return contract.report_exploit(target, proof_url, exploit_type)

def test_register_protocol(sentinel_contract, gl_env):
    target = "0x2222222222222222222222222222222222222222"
    register(sentinel_contract, gl_env, target, "ApexYield Lending",
             "Max borrow limit 1M USD. Flashloans must be repaid in same block.", bounty=1000)

    status = sentinel_contract.get_protocol(target)
    assert status["protocol_name"] == "ApexYield Lending"
    assert status["bounty_pool"] == "1000"
    assert status["is_halted"] is False
    assert sentinel_contract.is_protocol_halted(target) is False

def test_reject_duplicate_registration(sentinel_contract, gl_env):
    target = "0x2222222222222222222222222222222222222222"
    sentinel_contract.register_protocol(target, "Vault A", "Rule A")

    with pytest.raises(Exception) as excinfo:
        sentinel_contract.register_protocol(target, "Vault A Dup", "Rule A")
    assert "already registered" in str(excinfo.value)

def test_report_false_positive_refunds_stake(sentinel_contract, gl_env):
    target = "0x3333333333333333333333333333333333333333"
    register(sentinel_contract, gl_env, target, "SafeDEX", "No unauthorized pool drains.", bounty=500)

    proof_url = "https://etherscan.io/tx/0xbenign"
    gl_env.nondet.web.responses[proof_url] = "Normal swap of 100 USDC for 0.05 ETH"
    gl_env.nondet.llm_responses[proof_url] = '{"is_exploit": false, "confidence": 95, "reasoning": "Standard swap within slippage parameters"}'

    action = report_as_whitehat(sentinel_contract, gl_env, target, proof_url, "Abnormal Swap")

    assert action == "REJECT"
    assert sentinel_contract.is_protocol_halted(target) is False

    reports = sentinel_contract.get_all_reports()
    assert len(reports) == 1
    assert reports[0]["action"] == "REJECT"
    assert reports[0]["is_exploit"] is False
    assert reports[0]["bounty_awarded"] == "0"
    assert reports[0]["stake_slashed"] is False
    assert mock_genlayer.TRANSFERS == [(WHITEHAT.as_hex, STAKE)]

def test_report_critical_exploit_and_circuit_breaker(sentinel_contract, gl_env):
    target = "0x4444444444444444444444444444444444444444"
    register(sentinel_contract, gl_env, target, "VulnerableVault",
             "Reentrancy prohibited. Max flashloan 50 ETH.", bounty=5000)

    proof_url = "https://raw.githubusercontent.com/org/repo/main/disclosure.md"
    gl_env.nondet.web.responses[proof_url] = "VulnerableVault incident: reentrant call depth 4. Flashloan 500 ETH with recursive withdraw() draining pool."
    # Fenced output with surrounding prose must still parse
    gl_env.nondet.llm_responses[proof_url] = 'Here is my verdict:\n```json\n{"is_exploit": true, "confidence": 99, "reasoning": "Confirmed reentrancy attack draining 500 ETH from vault"}\n```'

    action = report_as_whitehat(sentinel_contract, gl_env, target, proof_url, "Reentrancy Drain")

    assert action == "HALT"
    assert sentinel_contract.is_protocol_halted(target) is True

    proto = sentinel_contract.get_protocol(target)
    assert proto["is_halted"] is True
    assert "Confirmed reentrancy" in proto["halt_reason"]
    assert proto["bounty_pool"] == "0"  # Bounty paid out!

    reports = sentinel_contract.get_all_reports()
    assert len(reports) == 1
    assert reports[0]["action"] == "HALT"
    assert reports[0]["bounty_awarded"] == "5000"
    assert reports[0]["reporter"] == WHITEHAT.as_hex
    # Bounty plus the refunded stake goes to the whitehat in one transfer
    assert mock_genlayer.TRANSFERS == [(WHITEHAT.as_hex, 5000 + STAKE)]

def test_low_confidence_exploit_is_not_halted(sentinel_contract, gl_env):
    target = "0x4545454545454545454545454545454545454545"
    register(sentinel_contract, gl_env, target, "Vault", "No drains.", bounty=100)

    proof_url = "https://tenderly.co/tx/0xmaybe"
    gl_env.nondet.web.responses[proof_url] = "Vault: unusual withdraw pattern"
    gl_env.nondet.llm_responses[proof_url] = '{"is_exploit": true, "confidence": 40, "reasoning": "Possibly suspicious"}'

    assert report_as_whitehat(sentinel_contract, gl_env, target, proof_url, "Drain") == "REJECT"
    assert sentinel_contract.is_protocol_halted(target) is False

@pytest.mark.parametrize("proof_url", [
    "https://my-fake-blog.com/exploit-drained-attack",
    "https://evil.com/?ref=etherscan.io",
    "https://etherscan.io.evil.com/tx/0x1",
    "http://etherscan.io/tx/0x1",
])
def test_spoofed_source_is_slashed_without_llm(sentinel_contract, gl_env, proof_url):
    target = "0x5555555555555555555555555555555555555555"
    register(sentinel_contract, gl_env, target, "Bridge", "Unauthorized mint is an exploit.", bounty=1000)

    # Even if the page and LLM would claim an exploit, a spoofed source must never halt
    gl_env.nondet.web.responses[proof_url] = "EXPLOIT! Funds drained!"
    gl_env.nondet.llm_responses[proof_url] = '{"is_exploit": true, "confidence": 100, "reasoning": "drained"}'

    action = report_as_whitehat(sentinel_contract, gl_env, target, proof_url, "Bridge Mint Exploit")

    assert action == "REJECT"
    assert sentinel_contract.is_protocol_halted(target) is False
    report = sentinel_contract.get_all_reports()[0]
    assert report["stake_slashed"] is True
    assert "Anti-Spoofing" in report["reasoning"]
    # Slashed stake is added to the protocol's bounty pool, nothing is paid out
    assert sentinel_contract.get_protocol(target)["bounty_pool"] == str(1000 + STAKE)
    assert sentinel_contract.get_stats()["total_stake_slashed"] == str(STAKE)
    assert mock_genlayer.TRANSFERS == []

def test_unreachable_evidence_is_rejected(sentinel_contract, gl_env):
    target = "0x6666666666666666666666666666666666666666"
    register(sentinel_contract, gl_env, target, "Vault", "No drains.", bounty=100)

    proof_url = "https://blockscout.com/tx/0xdoesnotexist"
    gl_env.nondet.web.responses[proof_url] = Exception("404 Not Found")

    assert report_as_whitehat(sentinel_contract, gl_env, target, proof_url, "Drain") == "REJECT"
    report = sentinel_contract.get_all_reports()[0]
    assert "could not be fetched" in report["reasoning"]
    assert report["stake_slashed"] is False

def test_malformed_llm_output_defaults_to_reject(sentinel_contract, gl_env):
    target = "0x7777777777777777777777777777777777777777"
    register(sentinel_contract, gl_env, target, "Vault", "No drains.", bounty=100)

    proof_url = "https://defillama.com/hacks"
    gl_env.nondet.web.responses[proof_url] = "Vault status page"
    gl_env.nondet.llm_responses[proof_url] = "I think this is probably an exploit"

    assert report_as_whitehat(sentinel_contract, gl_env, target, proof_url, "Drain") == "REJECT"

def test_insufficient_stake_reverts(sentinel_contract, gl_env):
    target = "0x8888888888888888888888888888888888888888"
    register(sentinel_contract, gl_env, target, "Vault", "No drains.")

    with pytest.raises(Exception) as excinfo:
        report_as_whitehat(sentinel_contract, gl_env, target, "https://etherscan.io/tx/0x1", "Drain", stake=STAKE - 1)
    assert "Insufficient anti-griefing stake" in str(excinfo.value)
    assert sentinel_contract.get_all_reports() == []

def test_reset_circuit_breaker_owner_only(sentinel_contract, gl_env):
    target = "0x4444444444444444444444444444444444444444"
    register(sentinel_contract, gl_env, target, "VulnerableVault", "Reentrancy prohibited.")
    proof_url = "https://etherscan.io/tx/0xexploit"
    gl_env.nondet.web.responses[proof_url] = "VulnerableVault: recursive withdraw drained pool"
    gl_env.nondet.llm_responses[proof_url] = '{"is_exploit": true, "confidence": 95, "reasoning": "Reentrancy"}'
    report_as_whitehat(sentinel_contract, gl_env, target, proof_url, "Reentrancy Drain")
    assert sentinel_contract.is_protocol_halted(target) is True

    # Halted protocols reject further reports
    with pytest.raises(Exception):
        report_as_whitehat(sentinel_contract, gl_env, target, proof_url, "Reentrancy Drain")

    gl_env.message.sender_address = WHITEHAT
    with pytest.raises(Exception) as excinfo:
        sentinel_contract.reset_circuit_breaker(target)
    assert "Only the protocol owner" in str(excinfo.value)

    gl_env.message.sender_address = OWNER
    sentinel_contract.reset_circuit_breaker(target)
    assert sentinel_contract.is_protocol_halted(target) is False

def test_exploit_of_a_different_protocol_cannot_halt(sentinel_contract, gl_env):
    # Regression: a real post-mortem about another protocol (e.g. Yearn) must not halt this one,
    # even if the LLM would call it an exploit.
    target = "0x1c8b7454c5e53e4b2d184cf4f84c59a35e76a6b1"
    register(sentinel_contract, gl_env, target, "Orbit DEX V3", "Price manipulation is prohibited.", bounty=25000)

    proof_url = "https://raw.githubusercontent.com/yearn/yearn-security/master/disclosures/2021-02-04.md"
    gl_env.nondet.web.responses[proof_url] = "yDAI vault price manipulation via Curve 3pool imbalance, $11M lost."
    gl_env.nondet.llm_responses[proof_url] = '{"is_exploit": true, "confidence": 95, "reasoning": "Price manipulation exploit"}'

    assert report_as_whitehat(sentinel_contract, gl_env, target, proof_url, "Price Manipulation Claim") == "REJECT"
    assert sentinel_contract.is_protocol_halted(target) is False
    assert sentinel_contract.get_protocol(target)["bounty_pool"] == "25000"
    assert "does not reference Orbit DEX V3" in sentinel_contract.get_all_reports()[0]["reasoning"]
    # Evidence was from a whitelisted host, so the honest-but-wrong reporter gets the stake back
    assert mock_genlayer.TRANSFERS == [(WHITEHAT.as_hex, STAKE)]
