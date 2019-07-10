pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../interfaces/Interpreter.sol";
import "../libs/LibOutcome.sol";


contract CoinTransferETHInterpreter is Interpreter {

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct Params {
    uint256 limit;
    address tokenAddress;
  }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata input,
    bytes calldata encodedParams
  )
    external
  {

    // NOTE: We expect `input` to be of type CoinTransfer[][]
    // and so we pull the 0th indexed value from it for ETH.
    // This adds an assumption that input will have ETH values
    // at its 0th index.
    LibOutcome.CoinTransfer[] memory transfers = abi.decode(
      input,
      (LibOutcome.CoinTransfer[][])
    )[0];

    Params memory params = abi.decode(encodedParams, (Params));

    for (uint256 i = 0; i < transfers.length; i++) {
      address payable to = address(uint160(transfers[i].to));
      uint256 amount = transfers[i].amount;

      require(amount <= params.limit, "hit the limit");

      params.limit -= amount;

      // note: send() is deliberately used instead of transfer() here
      // so that a revert does not stop the rest of the sends
      if (params.tokenAddress == CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
        to.send(amount);
      } else {
        ERC20(params.tokenAddress).transfer(to, amount);
      }
    }
  }
}
