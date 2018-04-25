pragma solidity ^0.4.23;

pragma experimental ABIEncoderV2;

import "../interfaces/IETHController.sol";
import "../interfaces/IConditional.sol";
import "./BaseCFObject.sol";

contract ETHConditionalTransfer is BaseCFObject {
    
    /**
     * Generic code snippets for all CFObjects
     * TODO @snario generalize for all cfobjects, then remove from this file
     */
    using CFLib for CFLib.ObjectStorage;
    constructor(CFLib.ObjectStorage cfparams) init(cfparams) public {}

    using ETHControllerLib for ETHControllerLib.Transform;

    bytes32 controllerAddress;
    bytes32 conditionAddress;
    mapping (uint256 => ETHControllerLib.Transform) resolver;
    
    function setState(
        bytes32 _controllerAddress,
        bytes32 _conditionAddress,
        ETHControllerLib.Transform[] _resolver,
        uint256 nonce
    )
        public
        safeUpdate(nonce)
    {
        controllerAddress = _controllerAddress;
        conditionAddress = _conditionAddress;
        for (uint256 i = 0; i < _resolver.length; i++) {
            resolver[i] = _resolver[i];
        }
    }

    // TODO make only multisig
    function resolve() public {

        require(
            isFinal(),
            "Counterfactual object must finalize before resolve() can be called."
        );

        IRegistry registry = IRegistry(getRegistry());
        address controller = registry.resolve(controllerAddress);
        address condition = registry.resolve(conditionAddress);

        uint256 result = IConditional(condition).getResult();

        IETHController(controller).handleTransform(resolver[result]);

        // FIXME doesn't work for cases where owner is an array
        selfdestruct(objectStorage.owner);
    }
    
}