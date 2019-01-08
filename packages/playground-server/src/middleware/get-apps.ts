import fs from "fs";
import { Context } from "koa";

import { createErrorResponse } from "../api";
import { ErrorCode } from "../types";

export default function getApps(registryPath: string) {
  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath).toString());
      ctx.status = 200;
      ctx.body = {
        ok: true,
        data: registry
      };
    } catch (e) {
      ctx.body = createErrorResponse(500, ErrorCode.AppRegistryNotAvailable);
      ctx.status = ctx.body.error.status;
      console.log(e);
    }

    return next();
  };
}
