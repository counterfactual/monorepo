import { AppInstanceInfo, AppState } from "@counterfactual/types";

export interface ProposedAppInstanceInfo extends AppInstanceInfo {
  id: string;
  initialState: AppState;
}
