import { AppInstanceID, AppInstanceInfo } from "./types";

export class AppInstance {
  readonly id: AppInstanceID;
  constructor(readonly info: AppInstanceInfo) {
    this.id = info.id;
  }
}
