pragma solidity ^0.4.19;

contract Dependable {
    uint256 public latestNonce;
    function isFinal(address) public view returns (bool);
}

contract Registry {
    function resolve(bytes32) public view returns (address);
}

contract BalanceRefund {

    address public owner;
    uint256 public id;

    // TODO allow multiple dependencies
    bytes32 dependencyAddress;
    uint256 dependencyNonce;

    address public recipient;
    uint256 public threshold;

    function BalanceRefund(
        address _owner,
        uint256 _id,
        address _recipient,
        uint256 _threshold,
        bytes32 _dependencyAddress,
        uint256 _dependencyNonce
    ) public {
        id = _id;
        recipient = _recipient;
        threshold = _threshold;
        dependencyAddress = _dependencyAddress;
        dependencyNonce = _dependencyNonce;
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function withdraw(address registry, bytes32 cfaddress) public {
        address meta = Registry(registry).resolve(cfaddress);
        BalanceRefund self = BalanceRefund(meta);

        require(self.isFinal(registry));
        require(this.balance >= self.threshold());

        self.recipient().transfer(this.balance - self.threshold());
    }

    function isFinal(address registry) public view returns (bool) {
        address deployedDependency = Registry(registry).resolve(dependencyAddress);
        Dependable dependency = Dependable(deployedDependency);
        require(dependency.isFinal(registry));
        return dependency.latestNonce() == dependencyNonce;
    }

}
