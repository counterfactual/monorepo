pragma solidity 0.5.11;
pragma experimental "ABIEncoderV2";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

import "../libs/LibOutcome.sol";
import "../Interpreter.sol";


contract MultiAssetMultiPartyCoinTransferFromVirtualAppInterpreter
  is Interpreter
{

  address constant CONVENTION_FOR_ETH_TOKEN_ADDRESS = address(0x0);

  struct MultiAssetMultiPartyCoinTransferFromVirtualAppInterpreterParams {
    address payable capitalProvider;
    address payable virtualAppUser;
    address[] tokenAddresses;
    uint256[] capitalProvidedPerTokenAddress;
    uint256[] limitPerTokenAddress;
  }

  // NOTE: This is useful for writing tests, but is bad practice
  // to have in the contract when deploying it. We do not want people
  // to send funds to this contract in any scenario.
  function () external payable { }

  function interpretOutcomeAndExecuteEffect(
    bytes calldata encodedOutcome,
    bytes calldata encodedParams
  )
    external
  {

    // MultiAssetMultiPartyCoinTransferFromVirtualAppInterpreterParams memory params =
    //   abi.decode(
    //     encodedParams,
    //     (MultiAssetMultiPartyCoinTransferFromVirtualAppInterpreterParams)
    //   );

    // LibOutcome.CoinTransfer[][] memory coinTransfersListOfLists =
    //   abi.decode(
    //     encodedOutcome,
    //     (LibOutcome.CoinTransfer[][])
    //   );

    revert("UnimplementedError.");
  }
}
