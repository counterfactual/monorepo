pragma solidity 0.4.24;


/// @title Registry - A global Ethereum deterministic address translator
/// @author Liam Horne - <liam@l4v.io>
/// @notice Supports deployment of contract initcode with the ability to deterministically reference the address before the actual contract is deployed regardless of msg.sender or transaction nonce
/// @dev Will be obsolete for most use cases when CREATE2 is added to the EVM https://github.com/ethereum/EIPs/pull/1014
contract Registry {

  event ContractCreated(bytes32 indexed cfAddress, address deployedAddress);

  mapping(bytes32 => address) public resolver;

  /// @notice Compute the deterministic counterfactual address of the given initcode and salt.
  /// @param initcode EVM code for contract initialization. Typically this is the contract
  /// constructor bytecode concatenated with ABI encoded constructor arguments.
  /// @param salt Unique salt used in address computation that allows multiple contracts with the same initcode to exist.
  /// @return A deterministic "counterfactual address". This depends on the initcode,
  /// msg.sender and salt, but importantly does NOT depend on the sending account's account nonce.
  function cfaddress(bytes initcode, uint256 salt)
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(byte(0x19), initcode, salt));
  }

  /// @notice Deploy a contract and add a mapping from counterfactual address to deployed address to storage
  /// @param initcode Contract bytecode concatenated with ABI encoded constructor arguments
  /// @param salt Unique salt used in address computation that allows multiple contracts with the same initcode to exist.
  function deploy(bytes initcode, uint256 salt)
    public
  {
    address deployed;
    bytes32 ptr = cfaddress(initcode, salt);

    require(
      resolver[ptr] == 0x0,
      "This contract was already deployed."
    );

    assembly {
      deployed := create(0, add(initcode, 0x20), mload(initcode))
    }

    require(
      deployed != 0x0,
      "There was an error deploying the contract."
    );

    resolver[ptr] = deployed;

    emit ContractCreated(ptr, deployed);
  }

  /// @notice Make a call to a contract deployed by reference to its counterfactual address
  /// @param registry The address of a registry
  /// @param ptr A counterfactual address
  /// @param data The data being sent in the call to the counterfactual contract
  function proxyCall(address registry, bytes32 ptr, bytes data) public {
    require(
      Registry(registry).resolver(ptr).call(data),
      "The call failed."
    );
  }

}
