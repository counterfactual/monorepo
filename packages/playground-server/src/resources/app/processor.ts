import { JsonApiDocument, OperationProcessor } from "@ebryn/jsonapi-ts";
import fs from "fs";
import { Log } from "logepi";
import path from "path";

import { ErrorCode } from "../../types";

import App from "./resource";

export default class AppProcessor extends OperationProcessor<App> {
  async get() {
    try {
      const registry = JSON.parse(
        fs
          .readFileSync(path.resolve(__dirname, "../../../registry.json"))
          .toString()
      ) as JsonApiDocument<App>;

      Log.info("Loaded App registry", {
        tags: { totalApps: (registry.data as App[]).length, endpoint: "apps" }
      });

      return registry;
    } catch {
      throw ErrorCode.AppRegistryNotAvailable;
    }
  }
}
