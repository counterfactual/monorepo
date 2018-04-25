pragma solidity ^0.4.19;

pragma experimental ABIEncoderV2;

import "./BaseCFObject.sol";

contract ETHBalance is BaseCFObject {

    using CFLib for CFLib.ObjectStorage;

    struct Balance {
        address addr;
        uint256 balance;
    }

    mapping(uint256 => Balance) public balances;
    uint256 public numBalances;

    function ETHBalance(
        Balance[] _balances,
        CFLib.ObjectStorage _objectStorage
    ) public {
        objectStorage.init(_objectStorage);
        for (uint256 i = 0; i < _balances.length; i++) {
            balances[i] = _balances[i];
        }
        numBalances = _balances.length;
    }

    function getState() constant public returns (Balance[]) {
        Balance[] memory ret = new Balance[](numBalances);
        for (uint256 i = 0; i < numBalances; i++) {
            ret[i] = balances[i];
        }
        return ret;
    }

    function update(Balance[] _balances) public safeCommitment {
        for (uint256 i = 0; i < _balances.length; i++) {
            balances[i] = _balances[i];
        }
        numBalances = _balances.length;
    }

    function getResolutionAddress() external view returns (address) {
        return balances[0].addr;
    }
    function getResolutionBalance() external view returns (uint256) {
        return balances[0].balance;
    }

    // FIXME to be deprecated in next release since statecontroller exists
    function withdraw(address registry, bytes32 cfaddress) public {
        ETHBalance self = ETHBalance(IRegistry(registry).resolve(cfaddress));

        require(self.isFinal());

        address participant;
        uint256 balance;
        for (uint256 i = 0; i < self.numBalances(); i++) {
            (participant, balance) = self.balances(i);
            participant.transfer(balance);
        }
    }

    function resolve() payable public {
        require(isFinal());
        for (uint256 i = 0; i < numBalances; i++) {
            balances[i].addr.transfer(balances[i].balance);
        }
        selfdestruct(objectStorage.owner);
    }

}
