import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { parseEther } from "ethers/utils";
import { History } from "history";
import { Action } from "redux";
import { ThunkAction } from "redux-thunk";
import { RoutePath } from "../../types";
import {
  buildSignatureMessageForLogin,
  getUserFromStoredToken,
  storeTokenFromUser
} from "../../utils/counterfactual";
import PlaygroundAPIClient from "../../utils/hub-api-client";
import { ActionType, ApplicationState, User } from "../types";
import { dispatchError, UserAddTransition } from "./user";

export const USER_ID_MOCK = "e20d298b-1000-4013-9445-a3ce0a21d618";

export const USER_MOCK_BALANCE = parseEther("1.0");

export const USER_MOCK_DATA = {
  id: USER_ID_MOCK,
  username: "TEST",
  email: "TEST@gmail.com",
  ethAddress: "0xd6e26d8acfd2948c06098c6de386c89b12e0f916",
  nodeAddress:
    "xpub6Ez36RzBrEtACXjzJG6JtThRvY3cYdEmi4MthSM3jSCZGzWTgRXaTMcFVYyzc9eJ9HTpzRaofX7Cp3yQGZkYwLszJw45JG49JpY4KqVmePg",
  loading: false,
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYxYjEzNzVkLWNlYWItNGRkYS1iMzI4LTAxNWE1N2E1OTM1ZiIsInR5cGUiOiJ1c2V" +
    "yIiwiYXR0cmlidXRlcyI6eyJ1c2VybmFtZSI6IlRFU1QiLCJlbWFpbCI6IlRFU1RAZ21haWwuY29tIiwiZXRoQWRkcmVzcyI6IjB4ZDZlMjZkOGFjZ" +
    "mQyOTQ4YzA2MDk4YzZkZTM4NmM4OWIxMmUwZjkxNiIsIm5vZGVBZGRyZXNzIjoieHB1YjZFejM2UnpCckV0QUNYanpKRzZKdFRoUnZZM2NZZEVtaTR" +
    "NdGhTTTNqU0NaR3pXVGdSWGFUTWNGVll5emM5ZUo5SFRwelJhb2ZYN0NwM3lRR1prWXdMc3pKdzQ1Skc0OUpwWTRLcVZtZVBnIiwibG9hZGluZyI6ZmF" +
    "sc2V9LCJyZWxhdGlvbnNoaXBzIjp7fSwiaWF0IjoxNTYyOTc2OTc1LCJleHAiOjE1OTQ1MzQ1NzV9.3nD0T46Jd5jayHcsbJpC9F3fg2gBPssJLlT2FUizwpo",
  multisigAddress: "0x09aBD1F0dcAD6D0925a1BeF09cb88b149063E541"
};

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
    dispatch({
      data: { user: userData || USER_MOCK_DATA },
      type: ActionType.UserAdd
    });
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
