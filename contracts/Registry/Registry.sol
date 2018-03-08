pragma solidity 0.4.19;

/// @title Counterfactual Registry - A counterfactual addressing registry
/// @author Liam Horne - <liam@counterfactual.com>
contract Registry {

    event ContractCreated(bytes32 cfAddress, address deployedAddress);
    event ContractUpdated(bytes32 cfAddress, address deployedAddress);
    event ContractWithdrawn(bytes32 cfAddress, address deployedAddress);

    string public constant NAME = "Counterfactual Registry";
    string public constant VERSION = "0.0.1";

    // isDeployed allows to check if a counterfactual address has been deployed
    mapping(bytes32 => address) public isDeployed;

    function recoverSigner(bytes32 digest, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
        return ecrecover(keccak256("\x19Ethereum Signed Message:\n32", digest), v, r, s);
    }

    function deploySigned(bytes code, uint8[] v, bytes32[] r, bytes32[] s) public returns (address) {
        require(v.length == r.length && r.length == s.length);
        address newContract;
        bytes32 cfAddress;

        bytes32 codeHash = keccak256(code);

        address[] memory owners = new address[](v.length);
        for (uint8 i = 0; i < v.length; i++) {
            owners[i] = recoverSigner(codeHash, v[i], r[i], s[i]);
        }

        cfAddress = keccak256(code, owners);

        uint dataSize = code.length;
        assembly {
            calldatacopy(mload(0x40), 164, dataSize)
            newContract := create(callvalue, mload(0x40), dataSize)
        }

        require(newContract != 0x0);
        require(isDeployed[cfAddress] == 0x0);

        ContractCreated(cfAddress, newContract);

        isDeployed[cfAddress] = newContract;

        return newContract;
    }

    function deploy(bytes code) public returns (address) {

        address newContract;
        bytes32 cfAddress;

        cfAddress = keccak256(code, [msg.sender]);

        uint dataSize = code.length;

        assembly {
            calldatacopy(mload(0x40), 68, dataSize)
            newContract := create(callvalue, mload(0x40), dataSize)
        }

        require(newContract != 0x0);
        require(isDeployed[cfAddress] == 0x0);

        ContractCreated(cfAddress, newContract);

        isDeployed[cfAddress] = newContract;

        return newContract;

    }

    function resolve(bytes32 cfAddress) public view returns (address) {
        return isDeployed[cfAddress];
    }

    function proxyCall(address registry, bytes32 cfAddress, bytes data) public {
        address to = Registry(registry).resolve(cfAddress);
        require(to != 0x0);

        uint256 dataSize = data.length;
        bool ret;
        assembly {
            calldatacopy(mload(0x40), 132, dataSize)
            ret := call(gas, to, 0, mload(0x40), dataSize, 0, 0)
        }
        require(ret);
        ContractUpdated(cfAddress, to);
    }

    function proxyDelegatecall(address registry, bytes32 cfAddress, bytes data) public {
        address to = Registry(registry).resolve(cfAddress);
        require(to != 0x0);

        uint256 dataSize = data.length;
        bool ret;
        assembly {
            calldatacopy(mload(0x40), 132, dataSize)
            ret := delegatecall(gas, to, mload(0x40), dataSize, 0, 0)
        }
        require(ret);
        ContractWithdrawn(cfAddress, to);
    }

}
