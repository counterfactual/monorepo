import { Operation, OperationProcessor } from "@ebryn/jsonapi-ts";
import fs from "fs";
import { Log } from "logepi";
import path from "path";

import Errors from "../../errors";

import App from "./resource";

export default class AppProcessor extends OperationProcessor<App> {
  public resourceClass = App;

  public async get(op: Operation): Promise<App[]> {
    try {
      const registry = JSON.parse(
        fs
          .readFileSync(path.resolve(__dirname, "../../../registry.local.json"))
          .toString()
      );

      Log.info("Loaded App registry", {
        tags: { totalApps: registry.data.length, endpoint: "apps" }
      });

      return registry.data.map((record: {}) => new App(record));
    } catch {
      throw Errors.AppRegistryNotAvailable();
    }
  }
}
