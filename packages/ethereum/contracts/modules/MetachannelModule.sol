pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "../registry/RegistryAddressLib.sol";
import "../transfer/AssetLib.sol";


contract MetachannelModule {

	using RegistryAddressLib for RegistryAddressLib.CFAddress;
	using AssetLib for AssetLib.ETHTransfer;

	address _senderAddr;
	address _intermediaryAddr;
	address _metachannelProxyForwarder;
	address _metachannelMultisig;
	uint256 _metachannelCollateral;

	constructor(
		address senderAddr,
		address intermediaryAddr,
		uint256 metachannelCollateral,
		RegistryAddressLib.CFAddress metachannelMultisig,
		RegistryAddressLib.CFAddress metachannelProxyForwarder
	)
		public
	{
		_senderAddr = senderAddr;
		_intermediaryAddr = intermediaryAddr;
		_metachannelCollateral = metachannelCollateral;
		_metachannelMultisig = metachannelMultisig.lookup();
		_metachannelProxyForwarder = metachannelProxyForwarder.lookup();
	}

	function interpret(AssetLib.ETHTransfer[] memory balances)
		public
		view
		returns (AssetLib.ETHTransfer[])
	{
		AssetLib.ETHTransfer[] memory ret = new AssetLib.ETHTransfer[](3);

		require(
			balances.length == 3,
			"MetachannelETHInterpreter expects A_bal, B_bal, and apps_bal."
		);

		uint8 senderIndex;
		if (balances[0].to.lookup() == _senderAddr)
			senderIndex = 0;
		else if (balances[1].to.lookup() == _senderAddr)
			senderIndex = 1;
		else
			revert("The sender address is at index 0 or 1 of the metachannel balance.");

		// FIXME: Not true for forwarders...
		// require(
		// 	balances[2].to.lookup() == _metachannelMultisig,
		// 	"Index 2 must be the address of the metachannel multisig."
		// );

		require(
			balances[0].amount + balances[1].amount + balances[2].amount == _metachannelCollateral,
			"Balances in ETHTransfer[] must amount to that allocated to metachannel."
		);

		ret[0] = AssetLib.ETHTransfer(
			RegistryAddressLib.CFAddress(
				address(0x0),
				bytes20(_metachannelMultisig)
			),
			balances[senderIndex].amount
		);

		ret[1] = AssetLib.ETHTransfer(
			RegistryAddressLib.CFAddress(
				address(0x0),
				bytes20(_intermediaryAddr)
			),
			balances[1 - senderIndex].amount
		);

		//TODO: Replace balances[2] to be sent to Forwarder
		ret[2] = AssetLib.ETHTransfer(
			RegistryAddressLib.CFAddress(
				address(0x0),
				bytes20(_metachannelProxyForwarder)
			),
			balances[2].amount
		);

		return ret;
	}

	function interpretAsBytes(AssetLib.ETHTransfer[] memory balances)
		public
		view
		returns (bytes)
	{
		return abi.encode(interpret(balances));
	}

}
