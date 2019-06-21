import PlaygroundAPIClient from "../utils/hub-api-client";
import { Action } from "redux";
import { ThunkAction } from "redux-thunk";
import { JsonRpcSigner } from "ethers/providers";

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
  storeTokenFromUser
} from "../utils/counterfactual";

const initialState = { user: {}, error: {} } as UserState;

export const addUser = (
  userData: User,
  signer: JsonRpcSigner
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

    dispatch({ data: { user }, type: ActionType.AddUser });
  } catch (error) {
    dispatch({
      data: {
        error: {
          message: error.message
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
