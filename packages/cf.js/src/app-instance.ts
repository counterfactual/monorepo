import { AppInstanceID, AppInstanceInfo } from "@counterfactual/common-types";

export class AppInstance {
  readonly id: AppInstanceID;
  constructor(readonly info: AppInstanceInfo) {
    this.id = info.id;
  }
}
