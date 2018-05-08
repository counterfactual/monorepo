pragma solidity ^0.4.19;

pragma experimental ABIEncoderV2;

import "../common/Counterfactual.sol";
import "./CFLib.sol";


library IETH {
    struct Transform {
        address[] receivers;
        uint256[] amounts;
    }
}


contract Callback {
    using IETH for IETH.Transform;
    function receiveUpdate(IETH.Transform) public returns (bool);
}


contract ETHBalance is Counterfactual {

    using CFLib for CFLib.CFAddress;

    struct Balance {
        CFLib.CFAddress cfAddr;
        uint256 balance;
    }

    mapping(uint256 => Balance) public balances;
    uint256 public numBalances;

    bytes32 _callback;

    constructor(ObjectStorage cfparams) init(cfparams) public {}

    function setState(
        Balance[] _balances,
        bytes32 callback,
        uint256 nonce
    )
        public
        safeUpdate(nonce)
    {
        for (uint256 i = 0; i < _balances.length; i++) {
            balances[i] = _balances[i];
        }
        numBalances = _balances.length;
        _callback = callback;
    }

    function getState() view public returns (Balance[]) {
        Balance[] memory ret = new Balance[](numBalances);
        for (uint256 i = 0; i < numBalances; i++) {
            ret[i] = balances[i];
        }
        return ret;
    }

    function resolve() public {
        IETH.Transform memory T;

        address[] memory receivers = new address[](numBalances);
        uint256[] memory amounts = new uint256[](numBalances);
        for (uint256 i = 0; i < numBalances; i++) {
            receivers[i] = balances[i].cfAddr.lookup();
            amounts[i] = balances[i].balance;
        }

		T = IETH.Transform(receivers, amounts);

		IRegistry registry = IRegistry(getRegistry());
		Callback callback = Callback(registry.resolve(_callback));
		require(callback.receiveUpdate(T));
    }

}
