#!/usr/bin/env python3

import binascii
import bitcoin

from ethereum.tools import tester
from ethereum.tools._solidity import get_solidity
from ethereum.utils import int_to_bytes, privtoaddr, encode_hex

from registry import registry_source
from testcontract import testcontract_source, testcontract_bytecode


def runTests():
    c = tester.Chain()

    registry = c.contract(
        sourcecode=registry_source,
        language="solidity"
    )

    testContract_deployed_addr = registry.deploySigned(testcontract_bytecode, [], [], [])
    testContract_cf_addr = registry.getCounterfactualAddress(testcontract_bytecode, [])
    assert(registry.resolve(testContract_cf_addr) == testContract_deployed_addr)

    storage_items = set(v for k, v in c.head_state.get_and_cache_account(registry.address).to_dict()['storage'].items())

    assert(storage_items == set([
        testContract_deployed_addr,
        '0x' + encode_hex(testContract_cf_addr)]))

    logs = list(log for receipt in c.head_state.receipts for log in receipt.logs )

    assert(len(logs) == 1)

    log = logs[0]

    x = registry.translator.decode_event(log.topics, log.data)
    xf = { k:x[k] for k, v in x.items() if k != '_event_type' }

    assert(x['_event_type'].decode('ascii') == 'ContractCreated')
    assert(xf['cfAddress'] == testContract_cf_addr)
    assert(xf['deployedAddress'] == testContract_deployed_addr)
