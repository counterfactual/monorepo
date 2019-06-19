import PlaygroundAPIClient from "../utils/hub-api-client";
import { User, Action, ActionType, Dispatcher } from "./types";

const initialState: User[] = [];

export const addUser = (data: User) => {
  return async (dispatch: Dispatcher<User>) => {
    dispatch({
      data: await PlaygroundAPIClient.createAccount(data, "foo"),
      type: ActionType.AddUser
    });
  };
};

export const getUsers = () => ({ type: "GET" });

export const reducers = function(state = initialState, action: Action<User>) {
  switch (action.type) {
    case ActionType.AddUser:
      return [...state, { ...action.data }];
    default:
      return state;
  }
};
