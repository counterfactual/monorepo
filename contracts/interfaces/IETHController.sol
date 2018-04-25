pragma solidity ^0.4.23;

pragma experimental ABIEncoderV2;

import "../counterfactuals/ETHControllerLib.sol";

interface IETHController {
    using ETHControllerLib for ETHControllerLib.Transform;
    function handleTransform(ETHControllerLib.Transform) external;
}
