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

@pytest.fixture
def gl_env():
    gl = mock_genlayer.gl
    gl.message.sender_address = Address("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    gl.message.value = u256(0)
    return gl

@pytest.fixture
def sentinel_contract(gl_env):
    contract = SentinEL()
    contract.policies = TreeMap()
    contract.registered_targets = DynArray()
    contract.reports = DynArray()
    return contract

def test_register_protocol(sentinel_contract, gl_env):
    target = "0x2222222222222222222222222222222222222222"
    gl_env.message.value = u256(1000)
    
    sentinel_contract.register_protocol(
        target_address=target,
        protocol_name="ApexYield Lending",
        security_rules="Max borrow limit 1M USD. Flashloans must be repaid in same block."
    )
    
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

def test_report_false_positive(sentinel_contract, gl_env):
    target = "0x3333333333333333333333333333333333333333"
    gl_env.message.value = u256(500)
    sentinel_contract.register_protocol(target, "SafeDEX", "No unauthorized pool drains.")
    
    # Mock web & LLM response for benign activity
    proof_url = "https://explorer.example.com/tx/0xbenign"
    gl_env.nondet.web.responses[proof_url] = "Normal swap of 100 USDC for 0.05 ETH"
    gl_env.nondet.llm_responses[proof_url] = '{"is_exploit": false, "action": "REJECT", "confidence": 95, "reasoning": "Standard swap within slippage parameters"}'
    
    action = sentinel_contract.report_exploit(target, proof_url, "Abnormal Swap")
    
    assert action == "REJECT"
    assert sentinel_contract.is_protocol_halted(target) is False
    
    # Check report audit log
    reports = sentinel_contract.get_all_reports()
    assert len(reports) == 1
    assert reports[0]["action"] == "REJECT"
    assert reports[0]["is_exploit"] is False
    assert reports[0]["bounty_awarded"] == "0"

def test_report_critical_exploit_and_circuit_breaker(sentinel_contract, gl_env):
    target = "0x4444444444444444444444444444444444444444"
    gl_env.message.value = u256(5000)
    sentinel_contract.register_protocol(target, "VulnerableVault", "Reentrancy prohibited. Max flashloan 50 ETH.")
    
    # Whitehat reporter address
    whitehat = Address("0x9999999999999999999999999999999999999999")
    gl_env.message.sender_address = whitehat
    gl_env.message.value = u256(0)
    
    proof_url = "https://explorer.example.com/tx/0xexploit"
    gl_env.nondet.web.responses[proof_url] = "Reentrant call depth: 4. Flashloan 500 ETH with recursive withdraw() draining pool."
    gl_env.nondet.llm_responses[proof_url] = '{"is_exploit": true, "action": "HALT", "confidence": 99, "reasoning": "Confirmed reentrancy attack draining 500 ETH from vault"}'
    
    action = sentinel_contract.report_exploit(target, proof_url, "Reentrancy Drain")
    
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
    assert reports[0]["reporter"] == whitehat.as_hex
