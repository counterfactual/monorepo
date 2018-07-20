pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/core/contracts/lib/Signatures.sol";
import "@counterfactual/core/contracts/lib/Disputable.sol";
import "@counterfactual/core/contracts/lib/StaticCall.sol";
import "@counterfactual/core/contracts/lib/Transfer.sol";


contract StateChannel {

  using Disputable for Disputable.State;
  using Transfer for Transfer.Details;
  using StaticCall for address;
  using Signatures for bytes;

  struct Auth {
    address owner;
    address[] signingKeys;
  }

  Auth public auth;
  Disputable.State public state;
  Transfer.Details public resolution;

  bytes32 private resolutionCommitHash;

  modifier onlyOwner() {
    require(
      msg.sender == auth.owner,
      "Sender must be the owner of this object"
    );
    _;
  }

  modifier onlyWhenChannelOpen() {
    require(
      !state.settled(),
      "State has already been settled"
    );
    _;
  }

  modifier onlyWhenChannelDispute() {
    require(
      state.meta.status == Disputable.Status.DISPUTE,
      "State is not being disputed"
    );
    _;
  }

  modifier onlyWhenChannelClosed() {
    require(state.settled(), "State is still unsettled");
    _;
  }

  constructor(
    address[] signingKeys,
    bytes32 commitHash
  ) public {
    auth.owner = msg.sender;
    auth.signingKeys = signingKeys;
    resolutionCommitHash = commitHash;
  }

  function getOwner() external view returns (address) {
    return auth.owner;
  }

  function getSigningKeys() external view returns (address[]) {
    return auth.signingKeys;
  }

  function latestNonce() external view returns (uint256) {
    return state.meta.nonce;
  }

  function isClosed() external view returns (bool) {
    return state.settled();
  }

  function getResolution() public view returns (Transfer.Details) {
    return resolution;
  }

  function setState(
    bytes32 stateHash,
    uint256 nonce,
    uint256 timeout,
    bytes signatures
  )
    public
    onlyWhenChannelOpen
  {
    if (msg.sender != auth.owner) {
      bytes32 h = computeHash(stateHash, nonce, timeout);
      require(
        signatures.verifySignatures(h, auth.signingKeys),
        "Invalid signatures"
      );
    }

    if (state.meta.status == Disputable.Status.DISPUTE) {
      if (state.meta.nonce + 1 < nonce) {
        // TODO: This is an attributable fault, allow modular
        // slashing conditions to be written for the app.
        revert("Attributable fault");
      }
    }

    if (timeout > 0) {
      state.set(stateHash, nonce, timeout);
    } else {
      state.finalize();
    }
  }

  function setResolution(
    bytes finalState,
    bytes terms,
    bytes4 sighash
  )
    public
    onlyWhenChannelClosed
  {
    require(
      keccak256(finalState) == state.proof,
      "Tried to set resolution with incorrect final state"
    );

    bytes32 commitHash = keccak256(abi.encodePacked(sighash, terms));
    require(
      commitHash == resolutionCommitHash,
      "Tried to set resolution with incorrect sighash and terms"
    );

    resolution = address(this)
      .staticcallTransferDetails(
        abi.encodePacked(sighash, finalState, terms)
      );
  }

  function computeHash(bytes32 stateHash, uint256 nonce, uint256 timeout)
    internal
    view
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked(
        byte(0x19),
        auth.signingKeys,
        nonce,
        timeout,
        stateHash
      )
    );
  }

}
