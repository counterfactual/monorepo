import { Web3Provider } from "ethers/providers";
import { History } from "history";
import { Action } from "redux";
import { ThunkAction } from "redux-thunk";
import { RoutePath } from "../../types";
import {
  forFunds,
  getIndexedCFBalances,
  requestDeposit,
  requestWithdraw
} from "../../utils/counterfactual";
import log from "../../utils/log";
import {
  getTokens,
  ShortTokenNetworksName,
  getUserWalletBalances
} from "../../utils/nodeTokenClient";
import {
  ActionType,
  ApplicationState,
  AssetType,
  Deposit,
  StoreAction,
  WalletState
} from "../types";
export const initialState = {
  tokenAddresses: [],
  ethAddress: "",
  error: {},
  status: ""
} as WalletState;

export const connectToWallet = (
  provider: Web3Provider
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    const { ethereum } = window;

    await ethereum.enable();
    dispatch({
      data: {
        ethAddress: ethereum.selectedAddress
      } as WalletState,
      type: ActionType.WalletSetAddress
    });

    const network = await provider.getNetwork();
    let tokenAddresses = await getTokens(ShortTokenNetworksName[network.name]);

    tokenAddresses = await getUserWalletBalances(
      provider,
      ethereum.selectedAddress,
      tokenAddresses
    );
    dispatch({
      data: { tokenAddresses },
      type: ActionType.WalletSetBalance
    });
  } catch (e) {
    dispatch({
      data: {
        error: {
          message:
            "You must allow Counterfactual to connect with Metamask in order to use it."
        }
      } as WalletState,
      type: ActionType.WalletError
    });
  }
};

export enum WalletDepositTransition {
  CheckWallet = "WALLET_DEPOSIT_CHECK_WALLET",
  WaitForUserFunds = "WALLET_DEPOSIT_WAITING_FOR_USER_FUNDS",
  WaitForCollateralFunds = "WALLET_DEPOSIT_WAITING_FOR_COLLATERAL_FUNDS"
}

export const deposit = (
  transaction: Deposit,
  provider: Web3Provider,
  history?: History
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType | WalletDepositTransition>
> => async dispatch => {
  try {
    // 1. Ask Metamask to do the deposit. !
    dispatch({ type: WalletDepositTransition.CheckWallet });
    await requestDeposit(transaction);

    // 2. Wait until the deposit is completed in both sides. !
    dispatch({ type: WalletDepositTransition.WaitForUserFunds });
    await forFunds(transaction, "user");

    dispatch({ type: WalletDepositTransition.WaitForCollateralFunds });
    await forFunds(transaction);
    // 3. Get the updated Balances
    let tokenAddresses = await getIndexedCFBalances({
      multisigAddress: transaction.multisigAddress as string,
      nodeAddress: transaction.nodeAddress
    });
    tokenAddresses = await getUserWalletBalances(
      provider,
      transaction.ethAddress,
      tokenAddresses
    );

    // 4. Update the balance.
    dispatch({ data: { tokenAddresses }, type: ActionType.WalletSetBalance });

    // Optional: Redirect to Channels.
    if (history) {
      history.push(RoutePath.Channels);
    }
  } catch (e) {
    const error = e as Error;
    dispatch({
      data: {
        error: {
          message: `${error.message} because of ${error.stack}`
        }
      },
      type: ActionType.WalletError
    });
  }
};

export enum WalletWithdrawTransition {
  CheckWallet = "WALLET_WITHDRAW_CHECK_WALLET",
  WaitForFunds = "WALLET_WITHDRAW_WAITING_FOR_FUNDS"
}

export const withdraw = (
  transaction: Deposit,
  provider: Web3Provider,
  history?: History
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType | WalletWithdrawTransition>
> => async dispatch => {
  try {
    // 1. Ask Metamask to do the withdraw. !
    dispatch({ type: WalletWithdrawTransition.CheckWallet });
    const response = await requestWithdraw(transaction); // IMPLEMENT THIS!
    log("withdraw response", response);

    // 2. Wait until the withdraw is completed in both sides. !
    dispatch({ type: WalletWithdrawTransition.WaitForFunds });
    await forFunds(transaction);

    // 3. Get the updated balances.
    let tokenAddresses = await getIndexedCFBalances({
      multisigAddress: transaction.multisigAddress as string,
      nodeAddress: transaction.nodeAddress
    });

    tokenAddresses = await getUserWalletBalances(
      provider,
      transaction.ethAddress,
      tokenAddresses
    );

    // 4. Update the balance.
    dispatch({
      data: { tokenAddresses },
      type: ActionType.WalletSetBalance
    });

    // Optional: Redirect to Channels.
    if (history) {
      history.push(RoutePath.Channels);
    }
  } catch (e) {
    const error = e as Error;
    dispatch({
      data: {
        error: {
          message: `${error.message} because of ${error.stack}`
        }
      },
      type: ActionType.WalletError
    });
  }
};

export const reducers = function(
  state = initialState,
  action: StoreAction<WalletState, WalletDepositTransition>
) {
  switch (action.type) {
    case ActionType.WalletSetNodeTokens:
    case ActionType.WalletSetBalance:
      const tokenAddresses: AssetType[] = Object.values(
        (state.tokenAddresses || [])
          .concat(action.data.tokenAddresses)
          .reduce((accumulator, item) => {
            return {
              ...accumulator,
              [item.tokenAddress]: {
                ...accumulator[item.tokenAddress],
                ...item
              }
            };
          }, {})
      );
      return {
        ...state,
        tokenAddresses,
        status: action.type
      };
    case ActionType.WalletSetAddress:
    case ActionType.WalletDeposit:
    case ActionType.WalletWithdraw:
      return {
        ...state,
        ...action.data,
        status: action.type
      };
    case ActionType.WalletError:
      console.error("wallet error", action.data);
      return {
        ...state,
        ...action.data,
        status: action.type
      };
    default:
      return {
        ...state,
        status: action.type
      };
  }
};
