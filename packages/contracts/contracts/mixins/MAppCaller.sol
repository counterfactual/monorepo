pragma solidity 0.5;
pragma experimental "ABIEncoderV2";

import "../libs/LibSignature.sol";
import "../libs/LibStateChannelApp.sol";
import "../libs/LibStaticCall.sol";
import "../libs/Transfer.sol";

import "../CounterfactualApp.sol";


/// @title MAppCaller
/// @author Liam Horne - <liam@l4v.io>
/// @notice A mixin for the AppRegistry to make staticcalls to Apps
contract MAppCaller is LibSignature, LibStateChannelApp {

  /// @notice A helper method to check if the state of an application is terminal or not
  /// @param appInterface An `AppInterface` struct
  /// @param appState The ABI encoded version of some application state
  /// @return A boolean indicating if the application state is terminal or not
  function isStateTerminal(
    AppInterface memory appInterface,
    bytes memory appState
  )
    internal
    view
    returns (bool)
  {
    return CounterfactualApp(appInterface.addr).isStateTerminal(appState);
  }

  /// @notice A helper method to get the turn taker for an app
  /// @param appInterface An `AppInterface` struct
  /// @param appState The ABI encoded version of some application state
  /// @return An address representing the turn taker in the `signingKeys`
  function getTurnTaker(
    AppInterface memory appInterface,
    address[] memory signingKeys,
    bytes memory appState
  )
    internal
    view
    returns (address)
  {
    return CounterfactualApp(appInterface.addr)
      .getTurnTaker(appState, signingKeys);
  }

  /// @notice Execute the application's applyAction function to compute new state
  /// @param appInterface An `AppInterface` struct
  /// @param appState The ABI encoded version of some application state
  /// @param action The ABI encoded version of some application action
  /// @return A bytes array of the ABI encoded newly computed application state
  function applyAction(
    AppInterface memory appInterface,
    bytes memory appState,
    bytes memory action
  )
    internal
    view
    returns (bytes memory)
  {
    return CounterfactualApp(appInterface.addr).applyAction(appState, action);
  }

  /// @notice Execute the application's resolve function to compute a resolution
  /// @param appInterface An `AppInterface` struct
  /// @param appState The ABI encoded version of some application state
  /// @param terms The ABI encoded version of the transfer terms
  /// @return A `Transfer.Transaction` struct with all encoded information of the resolution
  function resolve(
    AppInterface memory appInterface,
    bytes memory appState,
    bytes memory terms
  )
    internal
    view
    returns (Transfer.Transaction memory)
  {
    Transfer.Terms memory termsStruct = abi.decode(terms, (Transfer.Terms));
    return CounterfactualApp(appInterface.addr).resolve(appState, termsStruct);
  }

}
