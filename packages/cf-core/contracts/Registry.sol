pragma solidity 0.4.24;


contract Registry {

  event ContractCreated(address deployedAddress);

  mapping(bytes32 => address) public resolver;

  function cfaddress(bytes initcode, uint256 salt)
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(byte(0x19), initcode, salt));
  }

  function deploy(bytes initcode, uint256 salt)
    public
    returns (address deployed)
  {
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

    emit ContractCreated(deployed);
  }

}
