import PlaygroundAPIClient from "../utils/hub-api-client";
import { Action } from "redux";

import {
  User,
  ActionType,
  StoreAction,
  UserState,
  ApplicationState
} from "./types";
import { ThunkAction } from "redux-thunk";

const initialState = { user: {}, error: {} } as UserState;

export const addUser = (
  userData: User
): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    const user = await PlaygroundAPIClient.createAccount(userData, "foo");
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
