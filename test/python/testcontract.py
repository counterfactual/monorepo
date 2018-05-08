from ethereum.tools import tester
from ethereum.tools._solidity import get_solidity

testcontract_source = """
pragma solidity ^0.4.17;
contract Test {
    function sayHello() public pure returns (string) {
        return "hi";
    }
}
"""

testcontract_bytecode = get_solidity().compile(testcontract_source)

def runTests():

    c = tester.Chain()

    testContract = c.contract(
        sourcecode=testcontract_source,
        language="solidity"
    )

    assert(testContract.sayHello() == b"hi")
