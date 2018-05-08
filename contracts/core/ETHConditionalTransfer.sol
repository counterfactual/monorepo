pragma solidity ^0.4.23;

pragma experimental ABIEncoderV2;

import "../common/Counterfactual.sol";


contract ETHConditionalTransfer is Counterfactual {

	struct Transform {
		address[] receivers;
		uint256[] amounts;
	}

	// A cap at the amount that can be distributed.
	uint256 _allowance;

	// The address that defines whether or not the condition
	// has been "finalized". It might cause side-effects.
	bytes32 _condition;

	// A whitelist of addresses that are allowed to submit
	// state updates to the ETHConditionalTransfer object
	mapping(bytes32 => bool) _whitelist;

	// A mapping of addresses and amounts defining how the funds
	// get distributed. The values passed into the constructor
	// are the "defaults" if the condition never resolves.
	address[] _receivers;
	uint256[] _amounts;
	
	modifier onlyWhitelist () {
		bytes32 whoami = IRegistry(getRegistry()).reverseResolve(msg.sender);
		require(_whitelist[whoami]);
		_;
	}

	constructor(ObjectStorage cfparams) init(cfparams) public {}

	// TODO
	// Figure out whether the constructor can contain this
	// without the variables changing the cfaddress
	function setState(
		uint256 allowance,
		bytes32 condition,
		bytes32[] whitelist,
		address[] receivers,
		uint256[] amounts
	)
		safeUpdate(1)
		public
	{
		_allowance = allowance;
		_condition = condition;
		_receivers = receivers;
		_amounts = amounts;
		for (uint256 i = 0; i < whitelist.length; i++) {
			_whitelist[whitelist[i]] = true;
		}
	}

	function receiveUpdate(Transform T) onlyWhitelist public returns (bool) {
		uint256 sum = 0;
		for (uint256 i = 0; i < T.receivers.length; i++) {
			sum += T.amounts[i];
		}

		require(sum == _allowance);

		_receivers = T.receivers;
		_amounts = T.amounts;

		return true;
	}

	function getState() public view returns (address[], uint256[]) {
		return (_receivers, _amounts);
	}

	function resolve(address registry, bytes32 cfaddress) public {
		address meta = IRegistry(registry).resolve(cfaddress);
		ETHConditionalTransfer self = ETHConditionalTransfer(meta);

		address[] memory receivers;
		uint256[] memory amounts;

		(receivers, amounts) = self.getState();

		for (uint256 i = 0; i < receivers.length; i++) {
			receivers[i].transfer(amounts[i]);
		}
	}
	
}