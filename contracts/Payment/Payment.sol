pragma solidity ^0.4.19;

contract Dependable {
    uint256 public latestNonce;
    function isFinal(address) public view returns (bool);
}

contract Registry {
    function resolve(bytes32) public view returns (address);
}

contract Payment {

    struct Balance {
        address participant;
        uint256 balance;
    }

    address public owner;
    bool wasDeclaredFinal;
    uint256 public finalizesAt;
    uint256 public id;
    uint256 public latestNonce;
    uint256 constant deltaTimeout = 10;

    // TODO allow multiple dependencies
    bytes32 dependencyAddress;
    uint256 dependencyNonce;

    Balance[] public balances;

    function Payment(
        address _owner,
        uint256 _id,
        address[] _participants,
        uint256[] _balances,
        bytes32 _dependencyAddress,
        uint256 _dependencyNonce
    ) public {
        id = _id;
        for (uint256 i = 0; i < _participants.length; i++) {
            balances.push(Balance(_participants[i], _balances[i]));
        }
        dependencyAddress = _dependencyAddress;
        dependencyNonce = _dependencyNonce;
        finalizesAt = block.number + deltaTimeout;
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function getNumParticipants() public constant returns (uint256) {
        return balances.length;
    }

    function update(
        address[] _participants,
        uint256[] _balances,
        bytes32 _dependencyAddress,
        uint256 _dependencyNonce,
        uint256 nonce
    ) {
        require(nonce > latestNonce);
        require(_participants.length == _balances.length);
        require(_participants.length == balances.length);
        for (uint256 i = 0; i < _participants.length; i++) {
            balances[i] = Balance(_participants[i], _balances[i]);
        }
        dependencyAddress = _dependencyAddress;
        dependencyNonce = _dependencyNonce;
        latestNonce = nonce;
        finalizesAt = block.number + deltaTimeout;
    }

    function withdraw(address registry, bytes32 cfaddress) public {
        address meta = Registry(registry).resolve(cfaddress);
        Payment self = Payment(meta);

        require(self.isFinal(registry));

        address participant;
        uint256 balance;
        for (uint256 i = 0; i < self.getNumParticipants(); i++) {
            (participant, balance) = self.balances(i);
            participant.transfer(balance);
        }
    }

    function finalize() public onlyOwner {
        wasDeclaredFinal = true;
    }

    function isFinal(address registry) public view returns (bool) {
        address deployedDependency = Registry(registry).resolve(dependencyAddress);
        Dependable dependency = Dependable(deployedDependency);

        require(dependency.isFinal(registry));
        require(dependency.latestNonce() == dependencyNonce);

        return wasDeclaredFinal || (block.number >= finalizesAt);
    }

}
