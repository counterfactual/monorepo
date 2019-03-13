pragma solidity ^0.5.0;
pragma experimental "ABIEncoderV2";


/// @title LibNIKE - A library wrapper around Non-interactive Key Exchange scheme
/// @author Alex Xiong - <alex@alexxiong.com>
/// @notice This contracts expose standard function APIs of an NIKE primitive
/// NIKE definition: https://eprint.iacr.org/2012/732.pdf
contract LibNIKE {
  Params public sysParams;
  /// @notice Params is a set of system parameters, may differ for each NIKE
  struct Params {
    uint256 idSpace;
    uint256 groupOrder;
    uint256 generator;
    // TODO: any other system params?
  }

  struct PK {
    Params params;
    bytes pk;
    string id;
  }

  /// @notice CommonSetup function equivalence, due to difficulty in getting
  /// randomness in contract level, system params are randomly generated offchain
  /// and pass in as constructor's params.
  constructor(Params memory params) public {
    sysParams = params;
  }

  function keyGen(string memory id)
    public
    view
    returns (PK memory pk, bytes memory sk)
    /* solium-disable-next-line */
  {
    // TODO
  }

  function sharedKey(string id_1, bytes pk_1, string id_2, bytes sk_2)
    public
    view
    returns (bytes)
    /* solium-disable-next-line */
  {
    // TODO
  }

  function validatePK(bytes pk)
    public
    view
    returns (bool)
    /* solium-disable-next-line */
  {
    // TODO
  }
}

