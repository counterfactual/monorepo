import { combineReducers, createStore, applyMiddleware, compose } from "redux";
import ReduxThunk from "redux-thunk";

import { reducers as UserState } from "./user";
import { reducers as WalletState } from "./wallet";
import { reducers as ChannelsState } from "./channels";

import { ApplicationState, StoreAction } from "./types";

export default createStore(
  combineReducers<ApplicationState, StoreAction<any, any>>({
    UserState,
    WalletState,
    ChannelsState
  }),
  compose(applyMiddleware(ReduxThunk))
);
