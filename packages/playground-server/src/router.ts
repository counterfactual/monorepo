import KoaRouter from "koa-router";

import Controller from "./controllers/controller";
import { APIResourceType } from "./types";

export default class Router extends KoaRouter {
  inject<TOptions = { [key: string]: any }>(
    controller: {
      new (
        router: KoaRouter,
        resourceType: APIResourceType,
        options: TOptions
      ): Controller<any, TOptions>;
    },
    resourceType: APIResourceType,
    options: TOptions = {} as TOptions
  ) {
    new controller(this, resourceType, options);
    return this;
  }
}
