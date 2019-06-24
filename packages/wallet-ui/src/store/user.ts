import PlaygroundAPIClient, { ErrorDetail } from "../utils/hub-api-client";
import { Action } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { JsonRpcSigner } from "ethers/providers";
import { History } from "history";

import { User, StoreAction, UserState, ApplicationState } from "./types";

import {
  getNodeAddress,
  buildRegistrationSignaturePayload,
  storeTokenFromUser,
  forMultisig,
  getUserFromStoredToken
} from "../utils/counterfactual";
import { RoutePath } from "../types";
import { parseEther } from "ethers/utils";
import log from "../utils/log";

enum ActionType {
  AddUser = "ADD_USER",
  GetUser = "GET_USER",
  Error = "USER_ERROR",
  SetWalletBalance = "WALLET_SET_BALANCE"
}

const initialState = { user: {}, error: {} } as UserState;

const dispatchError = (
  dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>,
  error: any
) => {
  const { message, code, field } = ErrorDetail[error.code] || error;

  dispatch({
    data: {
      error: {
        message,
        code,
        field
      }
    },
    type: ActionType.Error
  });
};

export const addUser = (
  userData: User,
  signer: JsonRpcSigner,
  history: History
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    // 1. Get the node address
    userData.nodeAddress = await getNodeAddress();

    // 2. Build the signable message
    const signableMessage = buildRegistrationSignaturePayload(userData);

    // 3. Request the signature
    const signature = await signer.signMessage(signableMessage);

    // 4. Send the API request.
    const user = await PlaygroundAPIClient.createAccount(userData, signature);

    // 5. Store the token.
    await storeTokenFromUser(user);

    // 6. Wait for multisig and store it into the user.
    user.multisigAddress = await forMultisig();

    // 7. Dispatch.
    dispatch({ data: { user }, type: ActionType.AddUser });

    // 8. Go to the next screen!
    history.push(RoutePath.SetupDeposit);
  } catch (error) {
    dispatchError(dispatch, error);
  }
};

export const getUser = (): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    // 1. Get the user token.
    const userData = await getUserFromStoredToken();

    log(userData);

    // 2. Dispatch it.
    dispatch({
      data: { user: userData.user },
      type: ActionType.GetUser
    });
    dispatch({
      data: { balance: parseEther(userData.balance) },
      type: ActionType.SetWalletBalance
    });
  } catch (error) {
    dispatchError(dispatch, error);
  }
};

export const reducers = function(
  state = initialState,
  action: StoreAction<User, ActionType>
) {
  switch (action.type) {
    case ActionType.AddUser:
    case ActionType.GetUser:
    case ActionType.Error:
      return {
        ...state,
        ...action.data
      };
    default:
      return state;
  }
};
