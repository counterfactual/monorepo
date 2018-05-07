#!/usr/bin/env python3

import binascii
import bitcoin

from ethereum.tools import tester
from ethereum.tools._solidity import get_solidity
from ethereum.utils import int_to_bytes, privtoaddr

from registry import registry_source
from testcontract import testcontract_source, testcontract_bytecode

def sign(h, priv):
    assert len(h) == 32
    V, R, S = bitcoin.ecdsa_raw_sign(h, priv)
    return V,R,S

def runTests():

    c = tester.Chain()

    registry = c.contract(
        sourcecode=registry_source,
        language="solidity"
    )

    # deploy with signatures

    codeHash = registry.getTransactionHash(testcontract_bytecode)
    v1, r1, s1 = sign(codeHash, tester.k1)
    v2, r2, s2 = sign(codeHash, tester.k2)

    r1, s1 = int_to_bytes(r1), int_to_bytes(s1),
    r2, s2 = int_to_bytes(r2), int_to_bytes(s2),

    testContract_deployed_addr2 = registry.deploySigned(testcontract_bytecode,
        [v1, v2],
        [r1, r2],
        [s1, s2]
    )

    testContract_cf_addr2 = registry.getCounterfactualAddress(testcontract_bytecode,
        [privtoaddr(tester.k1), privtoaddr(tester.k2)])
    assert(registry.resolve(testContract_cf_addr2) == testContract_deployed_addr2)

    storage_items = set(v for k, v in c.head_state.get_and_cache_account(registry.address).to_dict()['storage'].items())
