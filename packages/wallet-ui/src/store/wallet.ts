import { ThunkAction } from "redux-thunk";
import { Action } from "redux";
import { History } from "history";

import { WalletState, StoreAction, ApplicationState } from "./types";

import { RoutePath } from "../types";

enum ActionType {
  SetWalletAddress = "SET_WALLET_ADDRESS",
  Error = "WALLET_ERROR"
}

const { ethereum } = window;
const initialState = { ethAddress: "", error: {} } as WalletState;

export const connectToWallet = (
  history: History
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    await ethereum.enable();

    dispatch({
      data: {
        ethAddress: ethereum.selectedAddress
      } as WalletState,
      type: ActionType.SetWalletAddress
    });

    history.push(RoutePath.SetupRegister);
  } catch (e) {
    dispatch({
      data: {
        error: {
          message:
            "You must allow Counterfactual to connect with Metamask in order to use it."
        }
      } as WalletState,
      type: ActionType.Error
    });
  }
};

export const reducers = function(
  state = initialState,
  action: StoreAction<WalletState, ActionType>
) {
  switch (action.type) {
    case ActionType.SetWalletAddress:
    case ActionType.Error:
      return {
        ...state,
        ...action.data
      };
    default:
      return state;
  }
};
