import fs from "fs";
import { Context } from "koa";

import { ErrorCode, HttpStatusCode } from "../types";

export default function getApps(registryPath: string) {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath).toString());
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
