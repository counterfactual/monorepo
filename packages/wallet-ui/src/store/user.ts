import PlaygroundAPIClient, { ErrorDetail } from "../utils/hub-api-client";
import { Action } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { History } from "history";

import {
  User,
  StoreAction,
  UserState,
  ApplicationState,
  ActionType
} from "./types";

import {
  getNodeAddress,
  buildRegistrationSignaturePayload,
  storeTokenFromUser,
  forMultisig,
  getUserFromStoredToken
} from "../utils/counterfactual";
import { RoutePath } from "../types";
import { parseEther } from "ethers/utils";

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
    type: ActionType.UserError
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
    dispatch({ data: { user }, type: ActionType.UserAdd });

    // 8. Go to the next screen!
    history.push(RoutePath.SetupDeposit);
  } catch (error) {
    dispatchError(dispatch, error);
  }
};

export const getUser = (
  provider: Web3Provider
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    // 1. Get the user token.
    const userData = await getUserFromStoredToken();
    const counterfactualBalance = parseEther(userData.balance);
    const ethereumBalance = await provider.getBalance(userData.user.ethAddress);

    // 2. Dispatch it.
    dispatch({
      data: { user: userData.user },
      type: ActionType.UserGet
    });
    dispatch({
      data: { counterfactualBalance, ethereumBalance },
      type: ActionType.WalletSetBalance
    });
  } catch (error) {
    dispatchError(dispatch, error);
  }
};

export const reducers = function(
  state = initialState,
  action: StoreAction<User>
) {
  switch (action.type) {
    case ActionType.UserAdd:
    case ActionType.UserGet:
    case ActionType.UserError:
      return {
        ...state,
        ...action.data
      };
    default:
      return state;
  }
};
