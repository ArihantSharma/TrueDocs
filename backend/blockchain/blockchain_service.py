from web3 import Web3


class BlockchainService:

    def __init__(self, rpc_url):

        self.w3 = Web3(Web3.HTTPProvider(rpc_url))

    async def store_hash(self, doc_hash):

        # placeholder for smart contract interaction

        tx_hash = "0xsampletx123"

        return tx_hash

    async def revoke_hash(self, doc_hash):

        tx_hash = "0xrevokedtx123"

        return tx_hash