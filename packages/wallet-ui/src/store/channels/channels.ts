import { Action } from "redux";
import { ThunkAction } from "redux-thunk";
import { getChannelAddresses } from "../../utils/counterfactual";
import {
  ActionType,
  ApplicationState,
  ChannelsMap,
  ChannelsState,
  Connection,
  StoreAction
} from "../types";

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
    // 1. Get channel addresses.
    const addresses = await getChannelAddresses();

    // log("Addresses acquired", addresses);

    // 2. Build a Connection object for each of them
    const connections = addresses
      .map((address, index) => ({
        [address]: {
          ethAddress: address,
          type: "hub",
          name: `Hub${index}`,
          connections: []
        } as Connection
      }))
      .reduce(
        (channels, channel) => ({ ...channels, ...channel }),
        {} as ChannelsMap
      );

    // log("Connections built", connections);

    // 3. Get the state channel for each and pass it as a connection.
    // for (const address of Object.keys(connections)) {
    //   // log("Looking up subconnections for ", address);
    //   const relatedChannels = await getChannel(address);

    //   if (relatedChannels) {
    //     connections[address].connections.push();
    //     // log("Added subconnection", connections[address].connections);
    //   }
    // }

    dispatch({
      data: {
        channels: connections
      } as ChannelsState,
      type: ActionType.ChannelsGetAll
    });
  } catch (e) {
    const error = e as Error;
    dispatch({
      data: {
        error: {
          message: error.message
        }
      } as ChannelsState,
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
