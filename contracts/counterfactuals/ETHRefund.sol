pragma solidity ^0.4.19;

pragma experimental ABIEncoderV2;

import "./BaseCFObject.sol";

contract ETHRefund is BaseCFObject {

    using CFLib for CFLib.ObjectStorage;

    struct State {
        address recipient;
        uint256 threshold;
    }

    State public state;

    function ETHRefund(
        State _state,
        CFLib.ObjectStorage _objectStorage
    )
        public
    {
        objectStorage.init(_objectStorage);
        state = _state;
    }

    function update(State _state) public safeCommitment {
        state = _state;
    }

    // FIXME to be deprecated in next release since statecontroller exists
    function withdraw(address registry, bytes32 cfaddr) public {
        ETHRefund self = ETHRefund(IRegistry(registry).resolve(cfaddr));

        require(self.isFinal());

        address recipient;
        uint256 threshold;
        (recipient, threshold) = self.state();

        require(address(this).balance >= threshold);

        recipient.transfer(address(this).balance - threshold);
    }

}
