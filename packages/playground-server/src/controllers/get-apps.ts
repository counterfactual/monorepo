import fs from "fs";
import { Context } from "koa";
import { Log } from "logepi";

import { ErrorCode, HttpStatusCode } from "../types";

export default function getApps(registryPath: string) {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath).toString());

      Log.info("Loaded App registry", {
        tags: { totalApps: registry.apps.length, endpoint: "apps" }
      });

      ctx.status = HttpStatusCode.OK;
      ctx.body = {
        ok: true,
        data: registry
      };
    } catch {
      throw ErrorCode.AppRegistryNotAvailable;
    }

    return next();
  };
}
