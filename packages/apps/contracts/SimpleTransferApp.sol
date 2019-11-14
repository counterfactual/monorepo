pragma solidity 0.5.12;
pragma experimental "ABIEncoderV2";

/* solium-disable-next-line */
import "@counterfactual/cf-adjudicator-contracts/contracts/interfaces/CounterfactualApp.sol";
/* solium-disable-next-line */
import "@counterfactual/cf-funding-protocol-contracts/contracts/libs/LibOutcome.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/// @title SimpleTwoPartySwapApp
/// @notice This contract lets Alice transfer assets to Bob
contract SimpleTransferApp is CounterfactualApp {

  using SafeMath for uint256;

  struct AppState {
    LibOutcome.CoinTransfer[2] coinTransfers;
  }

  function computeOutcome(bytes memory encodedState)
    public
    pure
    returns (bytes memory)
  {
    AppState memory state = abi.decode(encodedState, (AppState));

    uint256 transferAmount = state.coinTransfers[0].amount;

    state.coinTransfers[0].amount = 0;
    state.coinTransfers[1].amount = transferAmount;

    return abi.encode(state.coinTransfers);
  }
}
