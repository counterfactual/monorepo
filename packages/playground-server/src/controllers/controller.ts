import "koa-body";
import Router, { IRouterContext } from "koa-router";
import { Log } from "logepi";

import {
  APIRequest,
  APIResource,
  APIResourceType,
  APIResponse,
  ControllerMethod,
  ErrorCode,
  HttpStatusCode,
  MiddlewareCollection,
  StatusCodeMapping,
  UserSession
} from "../types";

export default abstract class Controller<
  TAttributes,
  TOptions = { [key: string]: any }
> {
  /**
   * Contains the user session, if available. This property is set
   * via the Authentication middleware.
   */
  public user?: UserSession;

  /**
   * Stores the internal handlers for all routes.
   */
  private routeHandlers: MiddlewareCollection = [];

  /**
   * Stores which HTTP verbs will expose each controller method.
   */
  private routeVerbs: ("get" | "post")[] = [];

  /**
   * Maps error codes to HTTP status codes.
   */
  private errorStatusCodes: StatusCodeMapping = {} as StatusCodeMapping;

  /**
   * Returns all elements of a resource collection. If implemented
   * in a derived class, this handler takes care of the GET /:type route.
   */
  async getAll?(): Promise<APIResponse<TAttributes>>;

  /**
   * Returns a single instance of a resource collection, looking
   * it up by its unique identified. If implemented in a derived
   * class, this handler controls the GET /:type/:id route.
   */
  async getById?(id: string): Promise<APIResponse<TAttributes> | undefined>;

  /**
   * Requests a new, non-persistent resource. If implemented in a derived
   * class, this handler controls the POST /type route, with no body
   * content on incoming requests.
   */
  async post?(): Promise<APIResponse<TAttributes>>;

  /**
   * Stores a resource in a collection, returning it with a new
   * unique identifier. If implemented in a derived class,
   * this handler controls the POST /:type route, with a typed body
   * content on incoming requests.
   */
  async post?(
    data: APIResource<TAttributes>
  ): Promise<APIResponse<TAttributes>>;

  constructor(
    router: Router,
    public resourceType: APIResourceType,
    public options: TOptions = {} as TOptions
  ) {
    Log.info("Registering controller", { tags: { resourceType } });

    this.configureErrorHandler();
    this.configureRouter(router);
  }

  /**
   * Injects all necessary routes to provide read/write access
   * to resources.
   *
   * @param router {Router} - The API's router.
   */
  private async configureRouter(router: Router) {
    await this.configureGetAllRoute(router);
    await this.configureGetByIdRoute(router);
    await this.configurePostRoute(router);
  }

  /**
   * Binds the built-in handler for GET /:type.
   */
  private async configureGetAllRoute(router: Router) {
    this.routeHandlers[ControllerMethod.GetAll] = this.routeGetAll.bind(this);
    this.routeVerbs[ControllerMethod.GetAll] = "get";

    await this.configureRouteFor(ControllerMethod.GetAll, router, this.getAll);
  }

  /**
   * Binds the built-in handler for GET /:type/:id.
   */
  private async configureGetByIdRoute(router: Router) {
    this.routeHandlers[ControllerMethod.GetById] = this.routeGetById.bind(this);
    this.routeVerbs[ControllerMethod.GetById] = "get";

    await this.configureRouteFor(
      ControllerMethod.GetById,
      router,
      this.getById,
      true
    );
  }

  /**
   * Binds the built-in handler for POST /:type.
   */
  private async configurePostRoute(router: Router) {
    this.routeHandlers[ControllerMethod.Post] = this.routePost.bind(this);
    this.routeVerbs[ControllerMethod.Post] = "post";

    await this.configureRouteFor(ControllerMethod.Post, router, this.post);
  }

  /**
   * Configures which HTTP status codes are returned for each error code.
   * By default, any handled error returns 400. Auth-related errors are
   * set to return 401/403 as needed.
   */
  private configureErrorHandler() {
    this.errorStatusCodes = new Map<ErrorCode | "default", HttpStatusCode>([
      ["default", HttpStatusCode.BadRequest],
      [ErrorCode.InvalidSignature, HttpStatusCode.Forbidden],
      [ErrorCode.InvalidToken, HttpStatusCode.Forbidden],
      [ErrorCode.TokenRequired, HttpStatusCode.Unauthorized]
    ]);
  }

  /**
   * Injects the built-in handler for a given controller method
   * into the router, provided the controller implements a handler
   * for it.
   */
  private async configureRouteFor(
    method: ControllerMethod,
    router: Router,
    handler?: Function,
    usesId: boolean = false
  ) {
    if (!handler) {
      return;
    }

    const httpVerb = this.routeVerbs[method];

    Log.info("Route configuration started", {
      tags: { verb: httpVerb, resourceType: this.resourceType }
    });

    const endpoint = `/${this.resourceType}${usesId ? "/:id" : ""}`;

    router[httpVerb](
      endpoint,
      this.handleError.bind(this),
      this.routeHandlers[method].bind(this)
    );

    Log.info("Route configuration finished", {
      tags: { verb: httpVerb, resourceType: this.resourceType }
    });
  }

  /**
   * This middleware wraps the entire request handling in a try/catch
   * block. If anything fails, it delegates to the `respondWithError`
   * built-in method to report an error with the JSONAPI format.
   */
  private async handleError(ctx: IRouterContext, next: () => Promise<void>) {
    try {
      await next();
    } catch (error) {
      Log.info("Handled error detected, delegating to responder", {
        tags: {
          resourceType: this.resourceType,
          middleware: "handleError"
        }
      });
      this.respondWithError(error, ctx);
    }
  }

  /**
   * Creates a JSONAPI-compliant error response.
   *
   * If it's a handled error, it'll set the `code` and `status` fields
   * from the `errorCode` and the HTTP status mapping defined in the
   * `configureErrorHandler()` method.
   *
   * If it's an unhandled error, it'll fill the fields using the `Error`
   * object being thrown, with a 500 status code.
   */
  private respondWithError(error: ErrorCode | Error, ctx: IRouterContext) {
    if (typeof error === "string") {
      const httpStatus =
        this.errorStatusCodes.get(error as ErrorCode) ||
        this.errorStatusCodes.get("default");

      ctx.body = {
        errors: [
          {
            code: error as ErrorCode,
            status: httpStatus
          }
        ]
      } as APIResponse;

      ctx.status = httpStatus as number;
    } else {
      const errorObject = error as Error;
      const httpStatus = HttpStatusCode.InternalServerError;

      ctx.body = {
        errors: [
          {
            code: ErrorCode.UnhandledError,
            status: httpStatus,
            title: errorObject.message,
            detail: errorObject.stack
          }
        ]
      } as APIResponse;

      ctx.status = httpStatus as number;
    }
  }

  /**
   * Returns a collection of resources.
   */
  private async routeGetAll(ctx: IRouterContext, next: () => Promise<void>) {
    const callback = (this.getAll as Function).bind(this);

    Log.debug("Routing request to route handler", {
      tags: {
        resourceType: this.resourceType,
        middleware: "routeGetAll"
      }
    });

    ctx.body = await callback(ctx);

    return next();
  }

  /**
   * Returns a single, uniquely-identified resource.
   */
  private async routeGetById(ctx: IRouterContext, next: () => Promise<void>) {
    const callback = (this.getById as Function).bind(this);

    Log.debug("Routing request to route handler", {
      tags: {
        resourceType: this.resourceType,
        middleware: "routeGetById"
      }
    });

    ctx.body = callback(ctx.params.id, ctx);

    return next();
  }

  /**
   * Returns a newly-persisted or non-persisted resource. Newly-persisted resources
   * are objects that are permanently stored in the database, such as user accounts.
   * Non-persisted resources are volatile objects such as matchmakings or sessions.
   */
  private async routePost(ctx: IRouterContext, next: () => Promise<void>) {
    const request = ctx.request.body as APIRequest;
    const callback = (this.post as Function).bind(this);

    Log.debug("Routing request to route handler", {
      tags: {
        resourceType: this.resourceType,
        middleware: "routePost"
      }
    });

    ctx.body = request.data
      ? await callback(request.data as APIResource, ctx)
      : await callback(ctx);

    ctx.status = 201;

    return next();
  }
}
