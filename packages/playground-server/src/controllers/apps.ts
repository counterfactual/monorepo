import fs from "fs";
import { Log } from "logepi";

import {
  APIResource,
  AppAttributes,
  AppRegistryItem,
  AppsControllerOptions,
  ErrorCode
} from "../types";

import Controller from "./controller";

export default class AppsController extends Controller<
  AppAttributes,
  AppsControllerOptions
> {
  async getAll() {
    try {
      const registry = JSON.parse(
        fs.readFileSync(this.options.registryPath).toString()
      ).apps as AppRegistryItem[];

      Log.info("Loaded App registry", {
        tags: { totalApps: registry.length, endpoint: "apps" }
      });

      return registry.map(
        (app: AppRegistryItem) =>
          ({
            id: app.id,
            attributes: {
              name: app.name,
              url: app.url,
              icon: app.icon,
              slug: app.slug
            }
          } as APIResource<AppAttributes>)
      );
    } catch {
      throw ErrorCode.AppRegistryNotAvailable;
    }
  }
}
