pragma solidity ^0.4.25;
pragma experimental "ABIEncoderV2";

import "../libs/LibSignature.sol";
import "../libs/LibStateChannelApp.sol";
import "../libs/LibStaticCall.sol";
import "../libs/Transfer.sol";


/// @title MAppCaller
/// @author Liam Horne - <liam@l4v.io>
/// @notice A mixin for the AppRegistry to make staticcalls to Apps
contract MAppCaller is LibSignature, LibStateChannelApp {

  using LibStaticCall for address;

  /// @notice A helper method to check if the state of an application is terminal or not
  /// @param appInterface An `AppInterface` struct
  /// @param appState The ABI encoded version of some application state
  /// @return A boolean indicating if the application state is terminal or not
  function isStateTerminal(AppInterface appInterface, bytes appState)
    internal
    view
    returns (bool)
  {
    return appInterface.addr.staticcall_as_bool(
      abi.encodePacked(appInterface.isStateTerminal, appState)
    );
  }

  /// @notice A helper method to get the turn taker for an app
  /// @param appInterface An `AppInterface` struct
  /// @param appState The ABI encoded version of some application state
  /// @return An address representing the turn taker in the `signingKeys`
  function getTurnTaker(AppInterface appInterface, address[] signingKeys, bytes appState)
    internal
    view
    returns (address)
  {
    uint256 idx = appInterface.addr.staticcall_as_uint256(
      abi.encodePacked(appInterface.getTurnTaker, appState)
    );

    require(
      signingKeys[idx] != address(0),
      "Application returned invalid turn taker index"
    );

    return signingKeys[idx];
  }

  /// @notice Execute the application's applyAction function to compute new state
  /// @param appInterface An `AppInterface` struct
  /// @param appState The ABI encoded version of some application state
  /// @param action The ABI encoded version of some application action
  /// @return A bytes array of the ABI encoded newly computed application state
  function applyAction(AppInterface appInterface, bytes appState, bytes action)
    internal
    view
    returns (bytes)
  {
    return appInterface.addr.staticcall_as_bytes(
      abi.encodePacked(appInterface.applyAction, appState, action)
    );
  }

  /// @notice Execute the application's resolve function to compute a resolution
  /// @param appInterface An `AppInterface` struct
  /// @param appState The ABI encoded version of some application state
  /// @param terms The ABI encoded version of the transfer terms
  /// @return A `Transfer.Transaction` struct with all encoded information of the resolution
  function resolve(AppInterface appInterface, bytes appState, bytes terms)
    internal
    view
    returns (Transfer.Transaction)
  {
    return appInterface.addr.staticcall_as_TransferDetails(
      abi.encodePacked(appInterface.resolve, appState, terms)
    );
  }

}
