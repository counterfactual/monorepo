import { applyMiddleware, combineReducers, compose, createStore } from "redux";
import ReduxThunk from "redux-thunk";
import { reducers as ChannelsState } from "./channels/channels";
import { ApplicationState, StoreAction } from "./types";
import { reducers as UserState } from "./user/user";
import { reducers as WalletState } from "./wallet/wallet";

export default createStore(
  combineReducers<ApplicationState, StoreAction<any, any>>({
    UserState,
    WalletState,
    ChannelsState
  }),
  compose(applyMiddleware(ReduxThunk))
);
