import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { parseEther } from "ethers/utils";
import { History } from "history";
import { Action } from "redux";
import { ThunkAction } from "redux-thunk";
import { RoutePath } from "../types";
import { buildRegistrationSignaturePayload, buildSignatureMessageForLogin, forMultisig, getNodeAddress, getUserFromStoredToken, storeTokenFromUser } from "../utils/counterfactual";
import PlaygroundAPIClient from "../utils/hub-api-client";
import { ActionType, ApplicationState, User } from "./types";
import { dispatchError, UserAddTransition } from "./user";

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
    const user = await PlaygroundAPIClient.createAccount(userData, signature);

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
    const user = await PlaygroundAPIClient.login(ethAddress, signature);

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
