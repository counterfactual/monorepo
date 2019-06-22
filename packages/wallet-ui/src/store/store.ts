import { combineReducers, createStore, applyMiddleware } from "redux";
import { reducers as Users } from "./user";
import ReduxThunk from "redux-thunk";

export default createStore(
  combineReducers({
    Users
  }),
  applyMiddleware(ReduxThunk)
);
