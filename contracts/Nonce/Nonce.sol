pragma solidity ^0.4.19;

contract Dependable {
    uint256 public latestNonce;
    function isFinal(address) public view returns (bool);
}

contract Registry {
    function resolve(bytes32) public view returns (address);
}

contract Nonce {

    address public owner;
    bool wasDeclaredFinal;
    uint256 public finalizesAt;
    uint256 public id;
    uint256 public latestNonce;
    uint256 constant deltaTimeout = 10;

    // TODO allow multiple dependencies
    bytes32 dependencyAddress;
    uint256 dependencyNonce;

    function Nonce(
        address _owner,
        uint256 _id,
        bytes32 _dependencyAddress,
        uint256 _dependencyNonce
    ) public {
        id = _id;
        finalizesAt = block.number + deltaTimeout;
        dependencyAddress = _dependencyAddress;
        dependencyNonce = _dependencyNonce;
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function update(uint256 nonce) onlyOwner public {
        require(!isFinal(0x0));
        require(nonce > latestNonce);

        latestNonce = nonce;
        finalizesAt = block.number + deltaTimeout;
    }

    function finalize() public onlyOwner {
        wasDeclaredFinal = true;
    }

    function isFinal(address registry) public view returns (bool) {
        if (dependencyAddress != 0x0 && registry != 0x0) {
            address deployedDependency = Registry(registry).resolve(dependencyAddress);
            Dependable dependency = Dependable(deployedDependency);

            require(dependency.isFinal(registry));
            require(dependency.latestNonce() == dependencyNonce);
        }

        return wasDeclaredFinal || (block.number >= finalizesAt);
    }

}
