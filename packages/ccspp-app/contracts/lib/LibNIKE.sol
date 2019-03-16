pragma solidity ^0.5.5;
pragma experimental "ABIEncoderV2";


/// @title LibNIKE - A library wrapper around Non-interactive Key Exchange scheme
/// @author Alex Xiong - <alex@alexxiong.com>
/// @notice This contracts expose standard function APIs of an NIKE primitive
/// NIKE definition: https://eprint.iacr.org/2012/732.pdf
contract LibNIKE {
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

  function keyGen(string memory id)
    public
    pure
    returns (PK memory pk, bytes memory sk)
    /* solium-disable-next-line */
  {
    // TODO
  }

  function sharedKey(
    string memory id_1,
    PK memory pk_1,
    string memory id_2,
    bytes memory sk_2
  )
    public
    pure
    returns (bytes memory)
    /* solium-disable-next-line */
  {
    // TODO
  }

  function validatePK(PK memory pk)
    public
    pure
    returns (bool)
    /* solium-disable-next-line */
  {
    // TODO
  }
}

