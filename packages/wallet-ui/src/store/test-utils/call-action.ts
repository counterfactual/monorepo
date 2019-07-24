import { Action } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { ActionType, ApplicationState, StoreAction } from "../types";

export type ActionCreator = (
  ...args: any[]
) => ThunkAction<void, ApplicationState, null, Action<ActionType>>;

export type ActionSettings<T, S, AT> = {
  actionParameters?: any[];
  reducers?: (state: S, action: StoreAction<T, AT>) => S;
  initialState?: any;
  finalActionType?: ActionType;
};

export type ActionResult<T, S = T, AT = ActionType> = {
  dispatchedActions: StoreAction<T, AT>[];
  reducedStates: S[];
};

const callAction = async <T, S = T, AT = ActionType>(
  actionCreator: ActionCreator,
  {
    actionParameters = [],
    reducers = () => ({} as S),
    initialState = {},
    finalActionType = undefined
  }: ActionSettings<T, S, AT> = {} as ActionSettings<T, S, AT>
): Promise<ActionResult<T, S, AT>> => {
  return new Promise((resolve, reject) => {
    const dispatchedActions: StoreAction<T, AT>[] = [];
    const reducedStates: S[] = [];

    setTimeout(() => reject("TEST_TIMEOUT"), 50);

    const dispatch = (action: StoreAction<T, AT>) => {
      const previousAction = dispatchedActions[dispatchedActions.length - 1];
      reducedStates.push(
        reducers(
          previousAction
            ? {
                ...initialState,
                ...previousAction.data,
                status: previousAction.type
              }
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
    } catch (e) {
      reject({ dispatchedActions, reducedStates });
    }
  });
};

export default callAction;
