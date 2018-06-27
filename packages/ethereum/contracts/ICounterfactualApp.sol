pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";


contract ICounterfactualApp {

	struct Signature {
		uint8[] v;
		bytes32[] r;
		bytes32[] s;
	}

	uint256 public latestNonce;
	bytes public appState;

	function getFinalizeHash(uint256, bytes) public pure returns (bytes32);
	function getUpdateHash(uint256, bytes, uint256) public pure returns (bytes32);
	function getLatestNonce() public view returns (uint256);
	function setStateWithSigningKeys(bytes, uint256, Signature) public;
	function setStateAsOwner(bytes, uint256) public;
	function finalizeAsOwner() public;
	function finalizeWithSigningKeys(Signature) public;
	function isFinal() public view returns (bool);

}
