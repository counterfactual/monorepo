#!/usr/bin/env python3

import binascii
import bitcoin

from ethereum.tools import tester
from ethereum.tools._solidity import get_solidity

def sign(h, priv):
    assert len(h) == 32
    V, R, S = bitcoin.ecdsa_raw_sign(h, priv)
    return V,R,S

c = tester.Chain()

with open('contracts/Registry/Registry.sol') as f:
    code = f.readlines()

with open('contracts/Registry/IRegistry.sol') as f:
    iregistry = f.read()

# hack to delete IRegistry
code = iregistry + ''.join(
    line for line in code
    if "import" not in line
)

registry = c.contract(
    sourcecode=code,
    language="solidity"
)

simplestorage_source = """
pragma solidity ^0.4.17;
contract SimpleStorage {
  mapping(bytes32 => bytes32) public m;
  function setM() public {
    m[0x00] = 0x61626364;
  }
}
"""

simplestorage = c.contract(
    sourcecode=simplestorage_source,
    language="solidity"
)

simplestorage.setM()
assert(simplestorage.m(b'')[-4:] == b'abcd')

simplestorage_bytecode = get_solidity().compile(simplestorage_source)

simplestorage_deployed_addr = registry.deploySigned(simplestorage_bytecode, [], [], [])
simplestorage_cf_addr = registry.getCounterfactualAddress(simplestorage_bytecode, [])
assert(registry.resolve(simplestorage_cf_addr) == simplestorage_deployed_addr)

storage_items = set(v for k, v in c.head_state.get_and_cache_account(registry.address).to_dict()['storage'].items())

assert(storage_items == set([simplestorage_deployed_addr]))

logs = list(log for receipt in c.head_state.receipts for log in receipt.logs )

assert(len(logs) == 1)

log = logs[0]

x = registry.translator.decode_event(log.topics, log.data)
xf = { k:x[k] for k, v in x.items() if k != '_event_type' }

assert(x['_event_type'].decode('ascii') == 'ContractCreated')
assert(xf['cfAddress'] == simplestorage_cf_addr)
assert(xf['deployedAddress'] == simplestorage_deployed_addr)
