pragma solidity ^0.4.23;

pragma experimental "ABIEncoderV2";

import "../common/Counterfactual.sol";


// TODO see below. same for basecfobject.
contract UnidirectionalETHBalance is Counterfactual {

    // @armani this should probably be a reused library
	struct Signature {
		uint8 v;
		bytes32 r;
		bytes32 s;
	}

	address public _sender;
	address public _recipient;
	uint256 public _decidedAmount;
	uint256 public _maxAmount;

	constructor(
        address sender,
        address recipient,
        uint256 maxAmount,
        ObjectStorage cfparams
    )
        init(cfparams)
        public
    {
		_sender = sender;
		_recipient = recipient;
		_maxAmount = maxAmount;
	}

	function setAmount(Signature sigSender, Signature sigReceiver, uint256 amount) public {
		bytes32 h = keccak256(byte(0x19), objectStorage.owner, amount);
		address signer = ecrecover(h, sigSender.v, sigSender.r, sigSender.s);
		address receiver = ecrecover(h, sigReceiver.v, sigReceiver.r, sigReceiver.s);
		require(signer == _sender);
		require(receiver == _recipient);
		require(amount >= _decidedAmount);
		require(amount < _maxAmount);
		_decidedAmount = amount;
	}

	function kill() public {
		require(msg.sender == objectStorage.owner);
		selfdestruct(_sender);
	}

	function claimAmount(address registry, bytes32 cfaddress) public {
		UnidirectionalETHBalance self = UnidirectionalETHBalance(
			IRegistry(registry).resolve(cfaddress)
		);

        // Send only the decided amount
		self._recipient().transfer(self._decidedAmount());

        // Destroy this contract so this function can't be called again
		self.kill();
	}

}
