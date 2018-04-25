pragma solidity ^0.4.23;

pragma experimental ABIEncoderV2;

import "./BaseCFObject.sol";
import "./ETHControllerLib.sol";

contract ETHController is BaseCFObject {

    /**
     * Generic code snippets for all CFObjects
     * TODO @snario generalize for all cfobjects, then remove from this file
     */
    using CFLib for CFLib.ObjectStorage;
    constructor(CFLib.ObjectStorage cfparams) init(cfparams) public {}

    using ETHControllerLib for ETHControllerLib.Transform;

    struct LockedAllocation {
        bytes32 target;
        uint256 balance;
    }

    struct UnlockedAllocation {
        address target;
        uint256 balance;
    }

    uint256 public numLockedKeys;
    uint256 public numUnlockedKeys;
    mapping (uint256 => bytes32) public lockedKeys;
    mapping (uint256 => address) public unlockedKeys;
    mapping (bytes32 => uint256) public locked;
    mapping (address => uint256) public unlocked;

    function setState(
        LockedAllocation[] _lockedAllocations,
        UnlockedAllocation[] _unlockedAllocations,
        uint256 nonce
    )
        safeUpdate(nonce)
    {   

        uint256 i;

        // Delete old state
        for (i = 0; i < numUnlockedKeys; i++) {
            delete unlocked[unlockedKeys[i]];
        }
        for (i = 0; i < numLockedKeys; i++) {
            delete locked[lockedKeys[i]];
        }

        // Set to new state
        numLockedKeys =  _lockedAllocations.length;
        numUnlockedKeys =  _unlockedAllocations.length;
        for (i = 0; i < _lockedAllocations.length; i++) {
            if (_lockedAllocations[i].balance > 0) {
                lockedKeys[i] = _lockedAllocations[i].target;
                locked[lockedKeys[i]] = _lockedAllocations[i].balance;
            } else {
                numLockedKeys--;
            }
        }
        for (i = 0; i < _unlockedAllocations.length; i++) {
            if (_unlockedAllocations[i].balance > 0) {
                unlockedKeys[i] = _unlockedAllocations[i].target;
                unlocked[unlockedKeys[i]] = _unlockedAllocations[i].balance;
            } else {
                numUnlockedKeys--;
            }
        }

    }

    function emptyUnlocked() {   
        require(msg.sender == objectStorage.owner);
        require(isFinal());
        for (uint256 i = 0; i < numUnlockedKeys; i++) {
            delete unlocked[unlockedKeys[i]];
            delete unlockedKeys[i];
        }
        numUnlockedKeys = 0;
    }

    function handleTransform(ETHControllerLib.Transform T) public {
        bytes32 sender = IRegistry(getRegistry()).reverseResolve(msg.sender);

        require(
            locked[sender] != 0,
            "Transform must be sent from the address of the locked ETH."
        );

        uint256 sum = 0;
        uint256 i = 0;
        for (i = 0; i < T.receivers.length; i++) {
            if (T.amounts[i] > 0) {
                if (unlocked[T.receivers[i]] == 0) {
                    unlockedKeys[numUnlockedKeys++] = T.receivers[i];
                }
                unlocked[T.receivers[i]] += T.amounts[i];
                sum += T.amounts[i];
            }
        }

        require(
            sum == locked[sender],
            "Sum of distributed ETH must exactly equal the amount locked."
        );

        for (i = 0; i < numLockedKeys; i++) {
            if (lockedKeys[i] == sender) {
                delete lockedKeys[i];
                break;
            }
        }

        delete locked[sender];
    }

    function getUnlocked() public view returns (address[], uint256[]) {
        uint256[] memory amounts = new uint256[](numUnlockedKeys);
        address[] memory addresses = new address[](numUnlockedKeys);
        for (uint256 i = 0; i < numUnlockedKeys; i++) {
            amounts[i] = unlocked[unlockedKeys[i]];
            addresses[i] = unlockedKeys[i];
        } 
        return (addresses, amounts);
    }

    // Run in the context of the multisig!
    function flush(address registryAddress, bytes32 cfaddress) public {
        IRegistry registry = IRegistry(registryAddress);
        ETHController self = ETHController(registry.resolve(cfaddress));

        require(self.isFinal());

        address[] memory targets;
        uint256[] memory balances;
        (targets, balances) = self.getUnlocked();

        for (uint256 i = 0; i < targets.length; i++) {
            targets[i].transfer(balances[i]);
        }

        self.emptyUnlocked();
    }

}
