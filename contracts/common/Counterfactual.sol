pragma solidity ^0.4.23;

pragma experimental ABIEncoderV2;

import "../interfaces/IRegistry.sol";


contract Counterfactual {

	struct Dependancy {
		bytes32 addr;
		uint256 nonce;
	}

	struct ObjectStorage {
		address owner;
		address registry;
		bool wasDeclaredFinal;
		uint256 finalizesAt;
		uint256 id;
		uint256 latestNonce;
		uint256 deltaTimeout;
		Dependancy dependancy;
	}

	ObjectStorage public objectStorage;

	modifier init(ObjectStorage _objectStorage) {
		initialize(_objectStorage);
		_;
	}

	modifier safeUpdate(uint256 nonce) {
		require(isSafeUpdate(nonce));
		_;
		objectStorage.latestNonce = nonce;
		objectStorage.finalizesAt = block.number + objectStorage.deltaTimeout;
	}



	modifier onlyOwner() {
		require(objectStorage.owner == msg.sender);
		_;
	}

	modifier onlyWhenFinal() {
		require(objectStorage.owner == msg.sender);
		_;
	}

	// TODO proxy this
	function initialize(ObjectStorage _objectStorage) public {
		objectStorage.finalizesAt = block.number + _objectStorage.deltaTimeout;
		objectStorage.wasDeclaredFinal = false;
		objectStorage.latestNonce = _objectStorage.latestNonce;
		objectStorage.deltaTimeout = _objectStorage.deltaTimeout;
		objectStorage.id = _objectStorage.id;
		objectStorage.dependancy = _objectStorage.dependancy;
		objectStorage.registry = _objectStorage.registry;
		objectStorage.owner = _objectStorage.owner;
	}

	function getLatestNonce()
		public
		view
		returns (uint256)
	{
		return objectStorage.latestNonce;
	}

	function getRegistry() public view returns (address) {
		return objectStorage.registry;
	}

	function finalize()
		public
	{
		require(
			msg.sender == objectStorage.owner,
			"Sender must be the owner of this object."
		);
		objectStorage.wasDeclaredFinal = true;
	}

	function isSafeUpdate(uint256 nonce)
		public
		view
		returns (bool)
	{
		require(
			msg.sender == objectStorage.owner,
			"Sender must be the owner of this object."
		);
		require(
			nonce > objectStorage.latestNonce,
			"Nonce must be higher than an already submitted nonce."
		);

		require(
			!isFinal(),
			"Object is already finalized; updates can no longer be submitted."
		);
		return true;
	}

	function isFinal()
		public
		view
		returns (bool)
	{
		if (objectStorage.dependancy.addr != 0x0 && objectStorage.registry != 0x0) {
			address daddr = IRegistry(objectStorage.registry).resolve(objectStorage.dependancy.addr);
			Counterfactual dependency = Counterfactual(daddr);

			require(dependency.isFinal());
			require(dependency.getLatestNonce() == objectStorage.dependancy.nonce);
		}

		return objectStorage.wasDeclaredFinal || (block.number >= objectStorage.finalizesAt);
	}

}
