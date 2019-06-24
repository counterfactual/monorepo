import { ThunkAction } from "redux-thunk";
import { Action } from "redux";
import { History } from "history";

import { WalletState, StoreAction, ApplicationState, Deposit } from "./types";

import { RoutePath } from "../types";
import { requestDeposit, forFunds } from "../utils/counterfactual";

import log from "../utils/log";

import { Zero } from "ethers/constants";

enum ActionType {
  SetWalletAddress = "SET_WALLET_ADDRESS",
  Error = "WALLET_ERROR",
  Deposit = "WALLET_DEPOSIT",
  SetWalletBalance = "SET_WALLET_BALANCE"
}

const { ethereum } = window;
const initialState = {
  ethAddress: "",
  error: {},
  balance: Zero
} as WalletState;

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

export const deposit = (
  transaction: Deposit,
  history?: History
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    // 1. Ask Metamask to do the deposit.
    await requestDeposit(transaction);

    // 2. Wait until the deposit is completed in both sides.
    await forFunds(transaction);
  } catch {}
};

export const reducers = function(
  state = initialState,
  action: StoreAction<WalletState, ActionType>
) {
  log("Receiving into reducer", action);
  switch (action.type) {
    case ActionType.SetWalletAddress:
    case ActionType.SetWalletBalance:
    case ActionType.Deposit:
    case ActionType.Error:
      return {
        ...state,
        ...action.data
      };
    default:
      return state;
  }
};
