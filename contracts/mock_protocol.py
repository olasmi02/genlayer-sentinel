# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

@gl.evm.contract_interface
class _SentinELInterface:
    class View:
        def is_protocol_halted(self, target_address: str) -> bool:
            pass

class MockLendingVault(gl.Contract):
    """
    Mock Target DeFi Vault that queries SentinEL before processing sensitive state operations (deposits/withdrawals).
    """
    sentinel_address: Address
    vault_name: str
    total_deposits: u256

    def __init__(self, sentinel_address: str, vault_name: str):
        self.sentinel_address = Address(sentinel_address)
        self.vault_name = vault_name
        self.total_deposits = u256(0)

    @gl.public.view
    def is_paused(self) -> bool:
        """
        Queries SentinEL to check if this vault's circuit breaker has been tripped by AI validators.
        """
        return _SentinELInterface(self.sentinel_address).View.is_protocol_halted(
            gl.contract.address.as_hex
        )

    @gl.public.write.payable
    def deposit(self) -> None:
        if self.is_paused():
            raise gl.vm.UserError("Vault transactions halted: SentinEL Circuit Breaker is active")
        self.total_deposits = self.total_deposits + gl.message.value

    @gl.public.write
    def withdraw(self, amount: u256) -> None:
        if self.is_paused():
            raise gl.vm.UserError("Vault withdrawals halted: SentinEL Circuit Breaker is active")
        if amount > self.total_deposits:
            raise gl.vm.UserError("Insufficient liquidity")
        self.total_deposits = self.total_deposits - amount
        Address(gl.message.sender_address.as_hex).emit_transfer(value=amount)
