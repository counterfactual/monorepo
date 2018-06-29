pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "./CounterfactualApp.sol";
import "../registry/RegistryAddressLib.sol";


contract BytesApp is CounterfactualApp {

	bytes _appState;

	function getExternalState() external view returns (bytes) {
		return _appState;
	}

	function setAppStateWithSigningKeys(
		bytes appState,
		uint256 nonce,
		Signature signature
	)
		CFSignedUpdate(
			appState,
			nonce,
			signature
		)
	 	public
	{
		_appState = appState;
	}

	function setAppStateAsOwner(
		bytes appState,
		uint256 nonce
	)
		CFOwnedUpdate(nonce)
		public
	{
		_appState = appState;
	}

}
