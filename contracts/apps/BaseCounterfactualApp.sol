pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "../registry/RegistryAddressLib.sol";


contract CounterfactualApp {

  struct Signature {
    uint8[] v;
    bytes32[] r;
    bytes32[] s;
  }

  address masterCopy;

  uint256 public latestNonce;

  address private _owner;
  address[] private _signingKeys;
  address private _registry;
  bool private _wasDeclaredFinal;
  uint256 private _finalizesAt;
  uint256 private _id;
  uint256 private _deltaTimeout;

  modifier validNonceUpdate(uint256 nonce) {
    require(
      nonce > latestNonce,
      "Updates must increment the nonce."
    );
    _;
    latestNonce = nonce;
    _finalizesAt = block.number + _deltaTimeout;
  }

  modifier validUpdate() {
    _;
    _finalizesAt = block.number + _deltaTimeout;
  }

  modifier validOwnerUpdate() {
    require(
      msg.sender == _owner,
      "Sender must be the owner of this object."
    );
    _;
  }

  modifier appNotFinished() {
    require(
      !isFinal(),
      "App is already finalized; updates can no longer be submitted."
    );
    _;
  }

  modifier validSignature(
    uint256 nonce,
    Signature memory signature
  ) {
    bytes32 updateHash = getAppStateHash();
    address lastSigner = address(0);
    for (uint256 i = 0; i < _signingKeys.length; i++) {
      // FIXME: Fix signing on Ganache.
      // require(
      //   _signingKeys[i] == ecrecover(
      //     updateHash,
      //     signature.v[i],
      //     signature.r[i],
      //     signature.s[i]
      //   ),
      //   "Signer must be an owner of the object."
      // );
      require(updateHash != 0x0);  // FIXME: Placeholder for linting
      require(_signingKeys[i] > lastSigner);
      lastSigner = _signingKeys[i];
    }
    _;
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

    _finalizesAt = block.number + _deltaTimeout;
  }

  // virtual functions

  function setAppStateWithSigningKeys(
    bytes state,
    uint256 nonce,
    Signature signature
  )
    public
  {
    require(false, "override on child");
  }

  function setAppStateAsOwner(
    bytes state,
    uint256 nonce
  )
    public
  {
    require(false, "override on child");
  }

  function getExternalState()
    public
    view
    returns (bytes)
  {
    require(false, "must override in child");
  }

    function getAppStateHash() returns (bytes32) {
        require(false, "must override in child");
    }

  function getFinalizeHash(
    uint256 id,
    bytes state
  )
    public
    pure
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked(
        byte(0x19),
        id,
        state,
        "finalize"
      )
    );
  }

  function getLatestNonce()
    public
    view
    returns (uint256)
  {
    return latestNonce;
  }

  function finalizeAsOwner()
    public
    appNotFinished
    validOwnerUpdate
  {
    _wasDeclaredFinal = true;
    _finalizesAt = block.number;
  }

  function finalizeWithSigningKeys(Signature signature) public {
    bytes32 finalizeHash = getFinalizeHash(_id, getExternalState());

    address lastSigner = address(0);
    for (uint256 i = 0; i < _signingKeys.length; i++) {
      // FIXME: Fix signing on Ganache.
      // require(
      //   _signingKeys[i] == ecrecover(
      //     updateHash,
      //     signature.v[i],
      //     signature.r[i],
      //     signature.s[i]
      //   ),
      //   "Signer must be an owner of the object."
      // );
      require(finalizeHash != 0x0);  // FIXME: Placeholder for linting
      require(_signingKeys[i] > lastSigner);
      lastSigner = _signingKeys[i];
    }

    _wasDeclaredFinal = true;
    _finalizesAt = block.number;
  }

  function isFinal()
    public
    view
    returns (bool)
  {
    return _wasDeclaredFinal || (block.number >= _finalizesAt);
  }

}
