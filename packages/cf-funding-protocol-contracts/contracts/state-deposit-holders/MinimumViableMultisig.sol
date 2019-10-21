pragma solidity 0.5.11;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";


/// @title MinimumViableMultisig - A multisig wallet supporting the minimum
/// features required for state channels support
/// @author Liam Horne - <liam@l4v.io>
/// @notice
/// (a) Executes arbitrary transactions using `CALL` or `DELEGATECALL`
/// (b) Requires n-of-n unanimous consent
/// (c) Does not use on-chain address for signature verification
/// (d) Uses hash-based instead of nonce-based replay protection
contract MinimumViableMultisig {

  using ECDSA for bytes32;

  address masterCopy;

  mapping(bytes32 => bool) isExecuted;

  address[] private _owners;

  enum Operation {
    Call,
    DelegateCall
  }

  function ()
    external
    payable
  {}

  /// @notice Contract constructor
  /// @param owners An array of unique addresses representing the multisig owners
  function setup(address[] memory owners) public {
    require(_owners.length == 0, "Contract has been set up before");
    _owners = owners;
  }

  /// @notice Execute an n-of-n signed transaction specified by a (to, value, data, op) tuple
  /// This transaction is a message call, i.e., either a CALL or a DELEGATECALL,
  /// depending on the value of `op`. The arguments `to`, `value`, `data` are passed
  /// as arguments to the CALL/DELEGATECALL.
  /// @param to The destination address of the message call
  /// @param value The amount of ETH being forwarded in the message call
  /// @param data Any calldata being sent along with the message call
  /// @param operation Specifies whether the message call is a `CALL` or a `DELEGATECALL`
  /// @param signatures A sorted bytes string of concatenated signatures of each owner
  function execTransaction(
    address to,
    uint256 value,
    bytes memory data,
    Operation operation,
    bytes[] memory signatures
  )
    public
  {
    bytes32 transactionHash = getTransactionHash(to, value, data, operation);
    require(
      !isExecuted[transactionHash],
      "Transacation has already been executed"
    );

    address lastSigner = address(0);
    for (uint256 i = 0; i < _owners.length; i++) {
      require(
        _owners[i] == transactionHash.recover(signatures[i]),
        "Invalid signature"
      );
      require(_owners[i] > lastSigner, "Signers not in alphanumeric order");
      lastSigner = _owners[i];
    }

    execute(to, value, data, operation);

    isExecuted[transactionHash] = true;
  }

  /// @notice Compute a unique transaction hash for a particular (to, value, data, op) tuple
  /// @return A unique hash that owners are expected to sign and submit to
  /// @notice Note that two transactions with identical values of (to, value, data, op)
  /// are not distinguished.
  function getTransactionHash(
    address to,
    uint256 value,
    bytes memory data,
    Operation operation
  )
    public
    view
    returns (bytes32)
  {
    return keccak256(
      abi.encodePacked(byte(0x19), _owners, to, value, data, uint8(operation))
    );
  }

  /// @notice A getter function for the owners of the multisig
  /// @return An array of addresses representing the owners
  function getOwners()
    public
    view
    returns (address[] memory)
  {
    return _owners;
  }

  /// @notice Execute a transaction on behalf of the multisignature wallet
  function execute(
    address to,
    uint256 value,
    bytes memory data,
    Operation operation
  )
    internal
  {
    if (operation == Operation.Call)
      require(executeCall(to, value, data), "executeCall failed");
    else if (operation == Operation.DelegateCall)
      require(executeDelegateCall(to, data), "executeDelegateCall failed");
  }

  /// @notice Execute a CALL on behalf of the multisignature wallet
  /// @return A boolean indicating if the transaction was successful or not
  function executeCall(address to, uint256 value, bytes memory data)
    internal
    returns (bool success)
  {
    assembly {
      success := call(not(0), to, value, add(data, 0x20), mload(data), 0, 0)
    }
  }

  /// @notice Execute a DELEGATECALL on behalf of the multisignature wallet
  /// @return A boolean indicating if the transaction was successful or not
  function executeDelegateCall(address to, bytes memory data)
    internal
    returns (bool success)
  {
    assembly {
      success := delegatecall(not(0), to, add(data, 0x20), mload(data), 0, 0)
    }
  }

}
