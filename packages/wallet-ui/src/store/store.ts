import { combineReducers, createStore, applyMiddleware } from "redux";
import ReduxThunk from "redux-thunk";

import { reducers as User } from "./user";
import { reducers as Wallet } from "./wallet";
import { ApplicationState, StoreAction } from "./types";

export default createStore(
  combineReducers<ApplicationState, StoreAction<any>>({
    User,
    Wallet
  }),
  applyMiddleware(ReduxThunk)
);
