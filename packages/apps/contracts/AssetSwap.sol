pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/lib/Transfer.sol";
import "@counterfactual/contracts/contracts/Registry.sol";
import "@counterfactual/contracts/contracts/StateChannel.sol";
import "./SwapSwitch.sol";


contract AssetSwap {
  struct AppState {
    address registry;
    bytes32 parentChannelCfAddr;

    address recipient;
  }

  function isParentChannelSettled(AppState state)
    private
    pure
    returns (bool)
  {
    Registry memory registry = Registry(state.registry);
    address parentChannelAddr = registry.resolver(state.parentChannelCfAddr);
    StateChannel memory parentChannel = StateChannel(parentChannelAddr);
    return parentChannel.isStateFinal(parentChannel.state);
  }

  function resolve(AppState state, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Details)
  {
    require(isParentChannelSettled(state), "Parent channel not settled");

    uint256[] memory amounts = new uint256[](1);
    amounts[0] = terms.limit;

    address[] memory to = new address[](1);
    to[0] = recipient;

    bytes memory data;

    return Transfer.Details(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }
}
