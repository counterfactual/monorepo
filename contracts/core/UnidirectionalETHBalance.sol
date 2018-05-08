pragma solidity ^0.4.23;

pragma experimental ABIEncoderV2;

import "../common/Counterfactual.sol";

// TODO see below. same for basecfobject.
contract UnidirectionalETHBalance is Counterfactual {

    // @armani this should probably be a reused library
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    address public sender;
    address public recipient;
    uint256 public decidedAmount;
    uint256 public maxAmount;

    constructor(
        address _sender,
        address _recipient,
        uint256 _maxAmount,
        ObjectStorage cfparams
    )
        init(cfparams)
        public
    {
        sender = _sender;
        recipient = _recipient;
        maxAmount = _maxAmount;
    }

    function setAmount(Signature sigSender, Signature sigReceiver, uint256 _amount) public {
        bytes32 h = keccak256(byte(0x19), objectStorage.owner, _amount);
        address signer = ecrecover(h, sigSender.v, sigSender.r, sigSender.s);
        address receiver = ecrecover(h, sigReceiver.v, sigReceiver.r, sigReceiver.s);
        require(signer == sender);
        require(recipient == receiver);
        require(_amount >= decidedAmount);
        require(_amount < maxAmount);
        decidedAmount = _amount;
    }

    function kill() public {
        // FIXME @armani multiple owners
        require(msg.sender == objectStorage.owner);
        selfdestruct(sender);
    }

    function claimAmount(address registry, bytes32 cfaddress) public {
        UnidirectionalETHBalance self = UnidirectionalETHBalance(
            IRegistry(registry).resolve(cfaddress)
        );

        // Send only the decided amount
        self.recipient().transfer(self.decidedAmount());

        // Destroy this contract so this function can't be called again
        self.kill();
    }

}
