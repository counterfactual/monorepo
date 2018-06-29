pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "../registry/RegistryAddressLib.sol";
import "../transfer/AssetLib.sol";


contract TwoPlayerGameModule {

  using RegistryAddressLib for RegistryAddressLib.CFAddress;
  using AssetLib for AssetLib.ETHTransfer;

  enum Result {
    P1_Won,
    P2_Won,
    Draw
  }

  struct State {
    Result result;
  }

  uint256 _amount;
  address[2] _players;

  constructor(
    uint256 amount,
    address[2] players
  )
    public
  {
    _amount = amount;
    _players = players;
  }

  function interpret(State state)
    public
    view
    returns (bytes)
  {
    AssetLib.ETHTransfer[] memory balances = new AssetLib.ETHTransfer[](2);
    uint256[] memory amounts = new uint256[](2);

    if (state.result == Result.P1_Won) {
      amounts[0] = _amount;
      amounts[1] = 0;
    } else if (state.result == Result.P2_Won) {
      amounts[0] = 0;
      amounts[1] = _amount;
    } else {
      amounts[0] = _amount / 2;
      amounts[1] = _amount / 2;
    }

    // TODO: Make the address->CFAddress conversion code simpler
    RegistryAddressLib.CFAddress memory p1 = RegistryAddressLib.CFAddress(
      address(0x0), bytes20(_players[0])
    );

    RegistryAddressLib.CFAddress memory p2 = RegistryAddressLib.CFAddress(
      address(0x0), bytes20(_players[1])
    );

    balances[0] = AssetLib.ETHTransfer(p1, amounts[0]);
    balances[1] = AssetLib.ETHTransfer(p2, amounts[1]);

    return abi.encode(balances);
  }

}
