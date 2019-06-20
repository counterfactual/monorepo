import {
  WalletState,
  ActionType,
  StoreAction,
  ApplicationState
} from "./types";
import { ThunkAction } from "redux-thunk";
import { Action } from "redux";
import { History } from "history";

const initialState = { wallet: {}, error: {} } as WalletState;

export const connectToWallet = (
  history: History
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    await window["ethereum"].enable();

    dispatch({
      data: {
        wallet: {
          ethAddress: window["ethereum"].selectedAddress
        }
      } as WalletState,
      type: ActionType.SetWalletAddress
    });

    history.push("/setup/register");
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
  action: StoreAction<WalletState>
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
