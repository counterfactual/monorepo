pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "../../registry/RegistryAddressLib.sol";


// Note, if this is called via `.transfer` it only gets a gas stipend of 2300 gas
// which is not sufficient to forward a transaction. So it must be called using `call`.
contract ETHForwarder {

	using RegistryAddressLib for RegistryAddressLib.CFAddress;

	event ETHForwarded(address to, address from, uint256 amount);

	address _forwardTo;
	address _fallbackTo;
	uint256 _amountForwarded;

	constructor(
		RegistryAddressLib.CFAddress forwardTo,
		RegistryAddressLib.CFAddress fallbackTo
	) public {
		_forwardTo = forwardTo.lookup();
		_fallbackTo = fallbackTo.lookup();
	}

	function ()
		public
		payable
	{
		uint256 amount = msg.value;
		address from = msg.sender;

		if (amount > _amountForwarded) {

			_forwardTo.transfer(amount);
			_amountForwarded += amount;
			emit ETHForwarded(_forwardTo, from, amount);

		} else if (amount == _amountForwarded) {

			_fallbackTo.transfer(amount);
			selfdestruct(_fallbackTo);
			emit ETHForwarded(_fallbackTo, from, amount);

		} else if (amount < _amountForwarded) {
			revert("??");
		}
	}

}
