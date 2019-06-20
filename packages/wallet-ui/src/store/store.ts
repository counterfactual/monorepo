import { combineReducers, createStore, applyMiddleware, compose } from "redux";
import ReduxThunk from "redux-thunk";

import { reducers as User } from "./user";
import { reducers as Wallet } from "./wallet";
import { ApplicationState, StoreAction } from "./types";

const composeEnhancer = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default createStore(
  combineReducers<ApplicationState, StoreAction<any>>({
    User,
    Wallet
  }),
  composeEnhancer(applyMiddleware(ReduxThunk))
);
