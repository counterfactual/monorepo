import "koa-body";
import Router, { IRouterContext } from "koa-router";

import {
  APIRequest,
  APIResource,
  APIResourceAttributes,
  APIResourceCollection,
  APIResourceType,
  APIResponse,
  AuthenticatedContext,
  UserSession
} from "../types";

export default abstract class Controller<
  TAttributes = APIResourceAttributes,
  TOptions = { [key: string]: any }
> {
  public user?: UserSession;

  async getAll?(): Promise<APIResourceCollection<TAttributes>>;
  async getById?(id: string): Promise<APIResource<TAttributes>>;

  async post?(): Promise<APIResource<TAttributes>>;
  async post?(
    data: APIResource<TAttributes>
  ): Promise<APIResource<TAttributes>>;

  constructor(
    router: Router,
    private resourceType: APIResourceType,
    public options: TOptions = {} as TOptions
  ) {
    const injectContext = (ctx: IRouterContext, next: () => Promise<void>) =>
      this.injectContext(ctx as AuthenticatedContext, next);

    if (this.getAll) {
      router.get(
        `/${this.resourceType}`,
        injectContext,
        this.routeGetAll.bind(this)
      );
    }

    if (this.getById) {
      router.get(
        `/${this.resourceType}/:id`,
        injectContext,
        this.routeGetById.bind(this)
      );
    }

    if (this.post) {
      router.post(
        `/${this.resourceType}`,
        injectContext,
        this.routePost.bind(this)
      );
    }
  }

  private injectContext(ctx: AuthenticatedContext, next: () => Promise<void>) {
    if (ctx.user) {
      this.user = ctx.user;
    }

    return next();
  }

  private async routeGetAll(ctx: IRouterContext, next: () => Promise<void>) {
    const callback = this.getAll as Function;

    ctx.body = {
      data: await callback()
    } as APIResponse;

    return next();
  }

  private async routeGetById(ctx: IRouterContext, next: () => Promise<void>) {
    const callback = this.getById as Function;

    ctx.body = {
      data: await callback(ctx.params.id)
    } as APIResponse;

    return next();
  }

  private async routePost(ctx: IRouterContext, next: () => Promise<void>) {
    const request = ctx.request.body as APIRequest;
    const callback = this.post as Function;

    ctx.body = callback(request.data as APIResource);
    ctx.status = 201;

    return next();
  }
}
