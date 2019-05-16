pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";


/// @title MAppCaller
/// @author Liam Horne - <liam@l4v.io>
/// @notice A mixin for the AppRegistry to make staticcalls to Apps
contract MAppCaller {

  /// @notice A helper method to check if the state of an application is terminal or not
  /// @param appDefinitionAddress An address of an app definition to call
  /// @param appState The ABI encoded version of some application state
  /// @return A boolean indicating if the application state is terminal or not
  function isStateTerminal(
    address appDefinitionAddress,
    bytes memory appState
  )
    internal
    pure
    returns (bool)
  {
    return CounterfactualApp(appDefinitionAddress).isStateTerminal(appState);
  }

  /// @notice A helper method to get the turn taker for an app
  /// @param appDefinitionAddress An address of an app definition to call
  /// @param appState The ABI encoded version of some application state
  /// @return An address representing the turn taker in the `signingKeys`
  function getTurnTaker(
    address appDefinitionAddress,
    address[] memory signingKeys,
    bytes memory appState
  )
    internal
    pure
    returns (address)
  {
    return CounterfactualApp(appDefinitionAddress)
      .getTurnTaker(appState, signingKeys);
  }

  /// @notice Execute the application's applyAction function to compute new state
  /// @param appDefinitionAddress An address of an app definition to call
  /// @param appState The ABI encoded version of some application state
  /// @param action The ABI encoded version of some application action
  /// @return A bytes array of the ABI encoded newly computed application state
  function applyAction(
    address appDefinitionAddress,
    bytes memory appState,
    bytes memory action
  )
    internal
    pure
    returns (bytes memory)
  {
    return CounterfactualApp(appDefinitionAddress)
      .applyAction(appState, action);
  }

  /// @notice Execute the application's resolve function to compute a resolution
  /// @param appDefinitionAddress An address of an app definition to call
  /// @param appState The ABI encoded version of some application state
  function resolve(
    address appDefinitionAddress,
    bytes memory appState
  )
    internal
    pure
    returns (bytes memory)
  {
    return CounterfactualApp(appDefinitionAddress).resolve(appState);
  }

}
