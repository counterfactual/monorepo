pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../Interpreter.sol";
import "../libs/LibOutcome.sol";


/// @notice
/// Asset: Single Asset, ETH or ERC20
/// OutcomeType: TwoPartyFixedOutcome
/// The committed coins are sent to one of params.playerAddrs
/// or split in half according to the outcome
contract TwoPartyFixedOutcomeInterpreter is Interpreter {

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct Params {
    address payable[2] playerAddrs;
    uint256 amount;
    address tokenAddress;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata encodedOutcome,
    bytes calldata encodedParams
  )
    external
  {
    LibOutcome.TwoPartyFixedOutcome outcome = abi.decode(
      encodedOutcome,
      (LibOutcome.TwoPartyFixedOutcome)
    );

    Params memory params = abi.decode(encodedParams, (Params));

    if (outcome == LibOutcome.TwoPartyFixedOutcome.SEND_TO_ADDR_ONE) {
      if (params.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
        params.playerAddrs[0].transfer(params.amount);
      } else {
        ERC20(params.tokenAddress).transfer(params.playerAddrs[0], params.amount);
      }
    } else if (outcome == LibOutcome.TwoPartyFixedOutcome.SEND_TO_ADDR_TWO) {
      if (params.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
        params.playerAddrs[1].transfer(params.amount);
      } else {
        ERC20(params.tokenAddress).transfer(params.playerAddrs[1], params.amount);
      }
    } else {
      /**
       * A functioning app should return SPLIT_AND_SEND_TO_BOTH_ADDRS
       * to indicate that the committed asset should be split, hence by right
       * we can revert here if the outcome is something other than that, since we
       * would have handled all cases; instead we choose to handle all other outcomes
       * as if they were SPLIT.
       */
      if (params.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
        params.playerAddrs[0].transfer(params.amount / 2);
        params.playerAddrs[1].transfer(params.amount - params.amount / 2);
      } else {
        ERC20(params.tokenAddress).transfer(params.playerAddrs[0], params.amount);
        ERC20(params.tokenAddress).transfer(
          params.playerAddrs[1],
          params.amount - params.amount / 2
        );
      }
    }
  }
}
