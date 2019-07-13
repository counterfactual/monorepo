import { Action } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { ActionType, ApplicationState, StoreAction } from "../store/types";

const callAction = async (
  actionCreator: (
    ...args: any[]
  ) => ThunkAction<void, ApplicationState, null, Action<ActionType>>,
  actionParameters: any[] = [],
  finalActionType?: ActionType
  // TODO: Inject reducers here!
): Promise<StoreAction<any>[]> => {
  return new Promise((resolve, reject) => {
    const dispatchedActions: StoreAction<any>[] = [];

    const dispatch = (action: StoreAction<any>) => {
      if (action.data && action.data["error"]) {
        reject([action]);
      } else {
        dispatchedActions.push(action);
        // TODO: Inject reducers here!
        if (
          !finalActionType ||
          (finalActionType && action.type === finalActionType)
        ) {
          resolve(dispatchedActions);
        }
      }
    };

    actionCreator(...actionParameters)(
      dispatch as ThunkDispatch<ApplicationState, null, Action<ActionType>>,
      () => ({} as ApplicationState),
      null
    );
  });
};

export default callAction;
