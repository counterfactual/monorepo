pragma solidity ^0.4.23;

pragma experimental ABIEncoderV2;

library ETHControllerLib {
    struct Transform {
        address[] receivers;
        uint256[] amounts;
    }
}