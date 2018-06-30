pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "../registry/RegistryAddressLib.sol";
import "../lib/SignatureValidator.sol";


contract CounterfactualApp is SignatureValidator {

  address public masterCopy;

  uint256 public latestNonce;
  uint256 public finalizesAt;

  address private _owner;
  address[] private _signingKeys;
  address private _registry;
  uint256 private _id;
  uint256 private _deltaTimeout;

  modifier validOwnerUpdate() {
    require(
      msg.sender == _owner,
      "Sender must be the owner of this object."
    );
    _;
  }

  modifier appNotFinalized() {
    require(
      !isFinal(),
      "App is already finalized."
    );
    _;
  }

  modifier CFOwnedUpdate(uint256 nonce) {
    require(
      nonce > latestNonce,
      "Updates must increment the noncs can no longer be submitted."
    );

    require(
      !isFinal(),
      "App is already finalized."
    );

    require(
      msg.sender == _owner,
      "Sender must be the owner of this object."
    );

    _;

    latestNonce = nonce;
    finalizesAt = block.number + _deltaTimeout;
  }

  modifier CFSignedUpdate(
    bytes appState,
    uint256 nonce,
    bytes signatures
  ) {
    require(
      nonce > latestNonce,
      "Updates must increment the noncs can no longer be submitted."
    );

    require(
      !isFinal(),
      "App is already finalized."
    );

    bytes32 updateHash = getAppStateHash(appState, nonce);

    require(
      checkSignature(updateHash, signatures, _signingKeys),
      "Signatures invalid."
    );

    _;

    latestNonce = nonce;
    finalizesAt = block.number + _deltaTimeout;
  }

  function instantiate(
    address owner,
    address[] signingKeys,
    address registry,
    uint256 id,
    uint256 deltaTimeout
  )
    public
  {
    _signingKeys = signingKeys;
    _owner = owner;
    _deltaTimeout = deltaTimeout;
    _id = id;
    _registry = registry;

    finalizesAt = block.number + _deltaTimeout;
  }

  function getAppStateHash(
    bytes appState,
    uint256 nonce
  )
    public
    view
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked(
        byte(0x19),
        _id,
        appState,
        nonce
      )
    );
  }

  function finalizeAsOwner()
    public
    appNotFinalized
    validOwnerUpdate
  {
    finalizesAt = block.number;
  }

  function finalizeWithSigningKeys(bytes signatures)
    appNotFinalized
    public
  {
    bytes32 finalizeHash = keccak256(
      abi.encodePacked(
        byte(0x19),
        _id,
        latestNonce,
        bytes4(0xa63f2db0)
      )
    );

    require(
      checkSignature(finalizeHash, signatures, _signingKeys),
      "Signatures invalid."
    );


    finalizesAt = block.number;
  }

  function resumeAsOwner()
    public
    appNotFinalized
    validOwnerUpdate
  {
    finalizesAt = 0;
  }

  function resumeWithSigningKeys(bytes signatures)
    public
    appNotFinalized
  {
    bytes32 finalizeHash = keccak256(
      abi.encodePacked(
        byte(0x19),
        _id,
        latestNonce,
        bytes4(0xa63f2db0)
      )
    );

    require(
      checkSignature(finalizeHash, signatures, _signingKeys),
      "Signatures invalid."
    );

    finalizesAt = 0;
  }

  function isFinal() public view returns (bool) {
    return finalizesAt != 0 && finalizesAt <= block.number;
  }

  function checkSignature(
    bytes32 stateHash,
    bytes signatures,
    address[] signingKeys
  )
		public
		pure
		returns(bool)
	{
    address lastSigner = address(0);
    for (uint256 i = 0; i < signingKeys.length; i++) {
      require(
        signingKeys[i] == recoverKey(stateHash, signatures, i),
        "Signer must be an owner of the object."
      );
      require(signingKeys[i] > lastSigner);
      lastSigner = signingKeys[i];
    }
    return true;
  }

}
