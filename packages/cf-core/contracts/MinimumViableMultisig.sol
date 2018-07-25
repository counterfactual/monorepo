pragma solidity 0.4.24;


contract MinimumViableMultisig {
  mapping(bytes32 => bool) isExecuted;

  address[] public owners;
  mapping (address => bool) isOwner;

  bytes32 public salt;

  enum Operation {
    Call,
    DelegateCall
  }

  function ()
    external
    payable
  {

  }

  function MinimumViableMultisig(address[] _owners, bytes32 _salt)
    public
  {
    salt = _salt;
    owners = _owners;
    for (uint256 i = 0; i < _owners.length; i++) {
      require(_owners[i] != 0);
      isOwner[_owners[i]] = true;
    }
  }

  function execTransaction(
    address to,
    uint256 value,
    bytes data,
    Operation operation,
    uint8[] v,
    bytes32[] r,
    bytes32[] s
  )
    public
  {
    bytes32 transactionHash = getTransactionHash(to, value, data, operation);
    address lastOwner = address(0);
    for (uint256 i = 0; i < owners.length; i++) {
      require(
        isOwner[
          ecrecover(transactionHash, v[i], r[i], s[i])
        ],
        "Signer must be an owner of the multisig."
      );
      require(owners[i] > lastOwner);
      lastOwner = owners[i];
    }

    execute(to, value, data, operation);

    isExecuted[transactionHash] = true;
  }

  function getTransactionHash(
    address to,
    uint256 value,
    bytes data,
    Operation operation
  )
    public
    view
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(byte(0x19), salt, to, value, data, operation));
  }

  function getOwners()
    public
    view
    returns (address[])
  {
    return owners;
  }

  function execute(address to, uint256 value, bytes data, Operation operation)
    internal
  {
    if (operation == Operation.Call)
      require(executeCall(to, value, data));
    else if (operation == Operation.DelegateCall)
      require(executeDelegateCall(to, data));
  }

  function executeCall(address to, uint256 value, bytes data)
    internal
    returns (bool success)
  {
    assembly {
      success := call(not(0), to, value, add(data, 0x20), mload(data), 0, 0)
    }
  }

  function executeDelegateCall(address to, bytes data)
    internal
    returns (bool success)
  {
    assembly {
      success := delegatecall(not(0), to, add(data, 0x20), mload(data), 0, 0)
    }
  }

}
