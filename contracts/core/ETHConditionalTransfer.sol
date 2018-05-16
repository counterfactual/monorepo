pragma solidity ^0.4.23;

pragma experimental "ABIEncoderV2";

import "../common/Counterfactual.sol";
import "../misc/ETHChannelLib.sol";


contract ETHConditionalTransfer is Counterfactual {

	using ETHChannelLib for ETHChannelLib.Balance;

	uint256 _allowance;

	bytes32 _allowedSender;

	mapping(uint256 => ETHChannelLib.Balance) _balances;
	uint256 _numBalances;

	modifier onlyWhitelist () {
		require(registryResolve(_allowedSender) == msg.sender);
		_;
	}

	constructor(ObjectStorage cfparams) init(cfparams) public {}

	function setState(
		uint256 allowance,
		bytes32 allowedSender,
		ETHChannelLib.Balance[] balances
	)
		safeUpdate(1)
		public
	{
		_allowance = allowance;
		_allowedSender = allowedSender;
		for (uint256 i = 0; i < balances.length; i++) {
			_balances[i] = balances[i];
		}
		_numBalances = balances.length;
	}

	function receiveUpdate(ETHChannelLib.Balance[] balances) public {
		uint256 sum = 0;
		for (uint256 i = 0; i < balances.length; i++) {
			sum += balances[i].amount;
			_balances[i] = balances[i];
		}
		_numBalances = balances.length;

		require(sum == _allowance);
	}

	function getState() public view returns (ETHChannelLib.Balance[]) {
		ETHChannelLib.Balance[] memory balances = new ETHChannelLib.Balance[](_numBalances);
		for (uint256 i = 0; i < _numBalances; i++) {
			balances[i] = _balances[i];
		}
		return balances;
	}

}
