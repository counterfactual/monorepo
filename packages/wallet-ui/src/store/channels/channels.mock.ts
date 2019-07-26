import { Action } from "redux";
import { ThunkAction } from "redux-thunk";
import { ActionType, ApplicationState, ChannelsMap, ChannelsState, StoreAction } from "../types";

export const initialState = {
  channels: {} as ChannelsMap
} as ChannelsState;

export const getAllChannels = (): ThunkAction<
  void,
  ApplicationState,
  null,
  Action<ActionType>
> => async dispatch => {
  try {
    dispatch({
      data: { channels: {} as ChannelsMap } as ChannelsState,
      type: ActionType.ChannelsGetAll
    });
  } catch (e) {
    const error = e as Error;
    dispatch({
      data: { error: { message: error.message } } as ChannelsState,
      type: ActionType.ChannelsError
    });
  }
};

export const reducers = function(
  state = initialState,
  action: StoreAction<ChannelsState>
) {
  switch (action.type) {
    case ActionType.ChannelsGetAll:
    case ActionType.ChannelsError:
      return {
        ...state,
        ...action.data
      };
    default:
      return state;
  }
};
