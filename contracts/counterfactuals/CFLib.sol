pragma solidity ^0.4.19;

pragma experimental ABIEncoderV2;

import "../interfaces/IRegistry.sol";

contract Dependable {
    function isFinal() public view returns (bool);
    function getLatestNonce() public view returns (uint256);
}

library CFLib {

    struct Dependancy {
        bytes32 addr;
        uint256 nonce;
    }

    struct ObjectStorage {
        address owner;
        address registry;
        bool wasDeclaredFinal;
        uint256 finalizesAt;
        uint256 id;
        uint256 latestNonce;
        uint256 deltaTimeout;
        Dependancy dependancy;
    }

    function init(
        ObjectStorage storage self,
        ObjectStorage objectStorage
    ) public {
        self.finalizesAt = block.number + objectStorage.deltaTimeout;
        self.latestNonce = 0;
        self.wasDeclaredFinal = false;
        
        self.deltaTimeout = objectStorage.deltaTimeout;
        self.id = objectStorage.id;
        self.dependancy = objectStorage.dependancy;
        self.registry = objectStorage.registry;
        self.owner = objectStorage.owner;
    }

    function getLatestNonce(ObjectStorage storage self)
        public
        view
        returns (uint256)
    {
        return self.latestNonce;
    }

    function isSafeCommitment(ObjectStorage storage self)
        public
        view
        returns (bool)
    {
        require(msg.sender == self.owner);
        require(!isFinal(self));
        return true;
    }

    function isSafeUpdate(ObjectStorage storage self, uint256 laterNonce)
        public
        view
        returns (bool)
    {
        require(
            msg.sender == self.owner,
            "Sender must be the owner of this object."    
        );
        require(
            laterNonce > self.latestNonce,
            "Nonce must be higher than an already submitted nonce."
        );
        require(
            !isFinal(self),
            "Object is already finalized; updates can no longer be submitted."
        );
        return true;
    }    

    function finalize(ObjectStorage storage self)
        public
    {
        require(
            msg.sender == self.owner,
            "Sender must be the owner of this object."
        );
        self.wasDeclaredFinal = true;
    }

    function isFinal(ObjectStorage storage self)
        public
        view
        returns (bool)
    {
        if (self.dependancy.addr != 0x0 && self.registry != 0x0) {
            address daddr = IRegistry(self.registry).resolve(self.dependancy.addr);
            Dependable dependency = Dependable(daddr);

            require(dependency.isFinal());
            require(dependency.getLatestNonce() == self.dependancy.nonce);
        }

        return self.wasDeclaredFinal || (block.number >= self.finalizesAt);
    }

}
