import { Action } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { ActionType, ApplicationState, StoreAction } from "../store/types";

export type ActionCreator = (
  ...args: any[]
) => ThunkAction<void, ApplicationState, null, Action<ActionType>>;

export type ActionSettings<T> = {
  actionParameters?: any[];
  reducers?: (state: T, action: StoreAction<T>) => T;
  initialState?: any;
  finalActionType?: ActionType;
};

export type ActionResult<T> = {
  dispatchedActions: StoreAction<T>[];
  reducedStates: T[];
};

const callAction = async <T>(
  actionCreator: ActionCreator,
  {
    actionParameters = [],
    reducers = () => ({} as T),
    initialState = {},
    finalActionType = undefined
  }: ActionSettings<T> = {} as ActionSettings<T>
): Promise<ActionResult<T>> => {
  return new Promise((resolve, reject) => {
    const dispatchedActions: StoreAction<T>[] = [];
    const reducedStates: T[] = [];

    const dispatch = (action: StoreAction<T>) => {
      const previousAction = dispatchedActions[dispatchedActions.length - 1];
      reducedStates.push(
        reducers(
          previousAction
            ? { ...previousAction.data, status: previousAction.type }
            : initialState,
          action
        )
      );

      dispatchedActions.push(action);

      if (action.data && action.data["error"]) {
        reject({ reducedStates, dispatchedActions: [action] });
      } else if (
        !finalActionType ||
        (finalActionType && action.type === finalActionType)
      ) {
        resolve({ dispatchedActions, reducedStates });
      }
    };

    try {
      actionCreator(...actionParameters)(
        dispatch as ThunkDispatch<ApplicationState, null, Action<ActionType>>,
        () => ({} as ApplicationState),
        null
      );
    } catch {
      reject({ dispatchedActions, reducedStates });
    }
  });
};

export default callAction;
