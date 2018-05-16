pragma solidity ^0.4.19;

pragma experimental "ABIEncoderV2";

import "../common/Counterfactual.sol";
import "./CFAddressLib.sol";


library IETH {
	struct Transform {
		address[] receivers;
		uint256[] amounts;
	}
}


contract Callback {
	using IETH for IETH.Transform;
	function receiveUpdate(IETH.Transform) public returns (bool);
}


contract ETHBalance is Counterfactual {

	using CFAddressLib for CFAddressLib.CFAddress;

	struct Balance {
		CFAddressLib.CFAddress cfAddr;
		uint256 balance;
	}

	mapping(uint256 => Balance) public _balances;
	uint256 public _numBalances;

	bytes32 _callback;

	constructor(ObjectStorage cfparams) init(cfparams) public {}

	function setState(
		Balance[] balances,
		bytes32 callback,
		uint256 nonce
	)
		public
		safeUpdate(nonce)
	{
		for (uint256 i = 0; i < balances.length; i++) {
			_balances[i] = balances[i];
		}
		_numBalances = balances.length;
		_callback = callback;
	}

	function getState() view public returns (Balance[]) {
		Balance[] memory ret = new Balance[](_numBalances);
		for (uint256 i = 0; i < _numBalances; i++) {
			ret[i] = _balances[i];
		}
		return ret;
	}

	function resolve() public {
		IETH.Transform memory T;

		address[] memory receivers = new address[](_numBalances);
		uint256[] memory amounts = new uint256[](_numBalances);
		for (uint256 i = 0; i < _numBalances; i++) {
			receivers[i] = _balances[i].cfAddr.lookup();
			amounts[i] = _balances[i].balance;
		}

		T = IETH.Transform(receivers, amounts);

		IRegistry registry = IRegistry(getRegistry());
		Callback callback = Callback(registry.resolve(_callback));
		require(callback.receiveUpdate(T));
	}

}
