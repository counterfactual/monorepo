import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { parseEther } from "ethers/utils";
import { History } from "history";
import { Action } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { RoutePath } from "../../types";
import {
  buildRegistrationSignaturePayload,
  buildSignatureMessageForLogin,
  forMultisig,
  getNodeAddress,
  getUserFromStoredToken,
  storeTokenFromUser
} from "../../utils/counterfactual";
import Hub, { ErrorDetail } from "../../utils/hub-api-client";
import {
  ActionType,
  ApplicationState,
  StoreAction,
  User,
  UserState
} from "../types";

export const initialState = {
  user: {},
  error: {},
  status: ""
} as UserState;

export const dispatchError = (
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

export enum UserAddTransition {
  CheckWallet = "USER_ADD_CHECK_WALLET",
  CreatingAccount = "USER_ADD_CREATING_ACCOUNT",
  DeployingContract = "USER_ADD_DEPLOYING_CONTRACT"
}

export const addUser = (
  userData: User,
  signer: JsonRpcSigner,
  history: History
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType | UserAddTransition>
> => async dispatch => {
  try {
    // 1. Get the node address
    userData.nodeAddress = await getNodeAddress();

    // 2. Build the signable message
    const signableMessage = buildRegistrationSignaturePayload(userData);
    dispatch({ type: UserAddTransition.CheckWallet });

    // 3. Request the signature
    const signature = await signer.signMessage(signableMessage);
    dispatch({ type: UserAddTransition.CreatingAccount });

    // 4. Send the API request.
    const user = await Hub.createAccount(userData, signature);

    // 5. Store the token.
    await storeTokenFromUser(user);

    dispatch({ type: UserAddTransition.DeployingContract });
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

export const loginUser = (
  ethAddress: string,
  signer: JsonRpcSigner,
  history: History
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    // 1. Build the signable message
    const signableMessage = buildSignatureMessageForLogin(ethAddress);

    // 2. Request the signature
    const signature = await signer.signMessage(signableMessage);

    // 3. Send the API request.
    const user = await Hub.login(ethAddress, signature);

    // 4. Store the token.
    await storeTokenFromUser(user);

    // 5. Dispatch.
    dispatch({ data: { user }, type: ActionType.UserLogin });

    // 6. Go to the next screen!
    history.push(RoutePath.Channels);
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
    const { balance, user } = await getUserFromStoredToken();

    if (!user) {
      return;
    }

    // 2. Get the balances.
    const counterfactualBalance = parseEther(balance);
    const ethereumBalance = await provider.getBalance(user.ethAddress);

    // 3. Store data into UserState and WalletState.
    dispatch({
      data: { user },
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
  action: StoreAction<User, UserAddTransition>
) {
  switch (action.type) {
    case ActionType.UserAdd:
    case ActionType.UserGet:
    case ActionType.UserLogin:
    case ActionType.UserError:
    case UserAddTransition.CheckWallet:
    case UserAddTransition.CreatingAccount:
    case UserAddTransition.DeployingContract:
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
