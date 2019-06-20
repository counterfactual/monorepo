import { combineReducers, createStore, applyMiddleware } from "redux";
import ReduxThunk from "redux-thunk";

import { reducers as Users } from "./user";
import { reducers as Wallet } from "./wallet";
import { ApplicationState, StoreAction } from "./types";

export default createStore(
  combineReducers<ApplicationState, StoreAction<any>>({
    Users,
    Wallet
  }),
  applyMiddleware(ReduxThunk)
);
