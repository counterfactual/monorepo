pragma solidity ^0.4.19;

pragma experimental ABIEncoderV2;

import "./CFLib.sol";

interface ICFObject {
    function finalize() external;
}

contract BaseCFObject {

    using CFLib for CFLib.ObjectStorage;

    CFLib.ObjectStorage public objectStorage;

    modifier init(CFLib.ObjectStorage _objectStorage) {
        objectStorage.init(_objectStorage);
        _;
    }

    // Being deprecated
    modifier safeCommitment() {
        require(objectStorage.isSafeCommitment());
        _;
    }

    modifier safeUpdate(uint256 nonce) {
        require(objectStorage.isSafeUpdate(nonce));
        _;
    }

    // TODO make all constructors the same
    // constructor(ObjectStorage cfparams) init(cfparams) public {}

    function finalize() public {
        objectStorage.finalize();
    }

    function isFinal() public view returns (bool) {
        return objectStorage.isFinal();
    }

    function getLatestNonce() public view returns (uint256) {
        return objectStorage.getLatestNonce();
    }

    function getRegistry() public view returns (address) {
        return objectStorage.registry;
    }

}
