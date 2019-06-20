import PlaygroundAPIClient from "../utils/hub-api-client";
import { User, ActionType, StoreAction } from "./types";
import { Dispatch } from "redux";

const initialState: User[] = [];

export const addUser = (data: User) => {
  return async (dispatch: Dispatch<StoreAction<User>>) => {
    dispatch({
      data: await PlaygroundAPIClient.createAccount(data, "foo"),
      type: ActionType.AddUser
    });
  };
};

export const getUsers = () => ({ type: "GET" });

export const reducers = function(
  state = initialState,
  action: StoreAction<User>
) {
  switch (action.type) {
    case ActionType.AddUser:
      return [...state, { ...action.data }];
    default:
      return state;
  }
};
