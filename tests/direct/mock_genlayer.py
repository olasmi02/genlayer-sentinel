"""
Mock GenVM runtime for local pytest unit testing without requiring the full GenVM C-extension or live network.
"""
from dataclasses import dataclass

class u256(int):
    pass

class u32(int):
    pass

class Address(str):
    @property
    def as_hex(self):
        return str(self)
    def emit_transfer(self, value):
        pass

class TreeMap(dict):
    pass

class DynArray(list):
    pass

def allow_storage(cls):
    return cls

class MockMessage:
    def __init__(self):
        self.sender_address = Address("0x1111111111111111111111111111111111111111")
        self.value = u256(0)

class MockVM:
    class UserError(Exception):
        pass
    class VMError(Exception):
        pass

class MockWeb:
    def __init__(self):
        self.responses = {}
    def render(self, url, mode='text'):
        return self.responses.get(url, "Mock Web Page Content for " + url)

class MockNondet:
    def __init__(self):
        self.web = MockWeb()
        self.llm_responses = {}
    def exec_prompt(self, prompt):
        for key, resp in self.llm_responses.items():
            if key in prompt:
                return resp
        # Default response
        return '{"is_exploit": false, "action": "REJECT", "confidence": 90, "reasoning": "Normal activity"}'

class MockEqPrinciple:
    def strict_eq(self, fn):
        return fn()

class MockPublic:
    @staticmethod
    def view(fn):
        return fn

    class _Write:
        def __call__(self, fn):
            return fn
        @staticmethod
        def payable(fn):
            return fn

    write = _Write()

class MockGL:
    def __init__(self):
        self.message = MockMessage()
        self.vm = MockVM()
        self.nondet = MockNondet()
        self.eq_principle = MockEqPrinciple()
        self.public = MockPublic()

    class Contract:
        pass
