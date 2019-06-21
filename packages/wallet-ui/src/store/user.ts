import PlaygroundAPIClient from "../utils/hub-api-client";
import { Action } from "redux";
import { ThunkAction } from "redux-thunk";
import { JsonRpcSigner } from "ethers/providers";
import { History } from "history";

import {
  User,
  ActionType,
  StoreAction,
  UserState,
  ApplicationState
} from "./types";

import {
  getNodeAddress,
  buildRegistrationSignaturePayload,
  storeTokenFromUser,
  forMultisig
} from "../utils/counterfactual";
import { RoutePath } from "../types";

const initialState = { user: {}, error: {} } as UserState;

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
    dispatch({
      data: {
        error: {
          message: error.message,
          code: error.code
        }
      },
      type: ActionType.Error
    });
  }
};

export const getUsers = () => ({ type: "GET" });

export const reducers = function(
  state = initialState,
  action: StoreAction<User>
) {
  switch (action.type) {
    case ActionType.AddUser:
    case ActionType.Error:
      return {
        ...state,
        ...action.data
      };
    default:
      return state;
  }
};
