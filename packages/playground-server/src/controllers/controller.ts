import { getAddress, verifyMessage } from "ethers/utils";
import { decode as decodeToken } from "jsonwebtoken";
import "koa-body";
import Router, { IRouterContext } from "koa-router";

import { userExists } from "../db";
import {
  APIMetadata,
  APIRequest,
  APIResource,
  APIResourceAttributes,
  APIResourceCollection,
  APIResourceType,
  APIResponse,
  AuthenticatedRequest,
  ControllerMethod,
  ErrorCode,
  HttpStatusCode,
  MiddlewareCollection,
  SessionAttributes,
  StatusCodeMapping,
  UserAttributes,
  UserSession
} from "../types";

export default abstract class Controller<
  TAttributes = APIResourceAttributes,
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
   * Stores any additional resources to the response, which were included
   * using the `include()` funciton.
   */
  private includedResources: APIResourceCollection = [];

  /**
   * Returns all elements of a resource collection. If implemented
   * in a derived class, this handler takes care of the GET /:type route.
   */
  async getAll?(): Promise<APIResourceCollection<TAttributes>>;

  /**
   * Returns a single instance of a resource collection, looking
   * it up by its unique identified. If implemented in a derived
   * class, this handler controls the GET /:type/:id route.
   */
  async getById?(id: string): Promise<APIResource<TAttributes>>;

  /**
   * Requests a new, non-persistent resource. If implemented in a derived
   * class, this handler controls the POST /type route, with no body
   * content on incoming requests.
   */
  async post?(): Promise<APIResource<TAttributes>>;

  /**
   * Stores a resource in a collection, returning it with a new
   * unique identifier. If implemented in a derived class,
   * this handler controls the POST /:type route, with a typed body
   * content on incoming requests.
   */
  async post?(
    data: APIResource<TAttributes>
  ): Promise<APIResource<TAttributes>>;

  /**
   * If implemented, this functions returns the message upon which
   * a signed payload can be created from. It's used for operations
   * that involve requesting authorization from the wallet.
   * It's only injected for POST requests.
   */
  // TODO: This supports only ONE type of signed message for a controller.
  async expectedSignatureMessageFor?(
    method: ControllerMethod,
    resource: APIResource<TAttributes | SessionAttributes>
  ): Promise<string | undefined>;

  /**
   * Returns a list of API methods that require authentication
   * for this controller. By default, all methods are public.
   */
  protectedMethods(): ControllerMethod[] {
    return [];
  }

  constructor(
    router: Router,
    private resourceType: APIResourceType,
    public options: TOptions = {} as TOptions
  ) {
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
      this.getById
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
    handler?: Function
  ) {
    if (!handler) {
      return;
    }

    console.log("Registered: ", this.routeVerbs[method], this.resourceType);

    router[this.routeVerbs[method]](
      `/${this.resourceType}`,
      ...(await this.getMiddlewaresFor(method))
    );
  }

  /**
   * Returns a list of middlewares to inject to a certain route.
   *
   * Every route gets the `handleError` middleware by default.
   *
   * If the controller implements the `protectedMethods()` function
   * and such function returns the controller method being configured,
   * it'll inject the `authenticate` middleware.
   *
   * If the controller implements the `expectedSignatureMessageFor()` function
   * and such function creates a signature payload for the controller method
   * being configured, it'll inject the `validateSignature` middleware.
   *
   * Finally, the built-in route handler and the sideloaded resources inclusion
   * middleware are injected.
   */
  private async getMiddlewaresFor(
    method: ControllerMethod
  ): Promise<MiddlewareCollection> {
    const middlewares: MiddlewareCollection = [this.handleError.bind(this)];

    if (this.protectedMethods().includes(method)) {
      middlewares.push(this.authenticate.bind(this));
    }

    if (
      this.expectedSignatureMessageFor &&
      (await this.expectedSignatureMessageFor(method, {
        type: "session",
        id: "",
        attributes: { ethAddress: "" }
      }))
    ) {
      middlewares.push(this.validateSignature.bind(this));
    }

    middlewares.push(this.routeHandlers[method]);
    middlewares.push(this.injectIncludedResources.bind(this));

    return middlewares;
  }

  /**
   * This middleware is responsible of injecting the session to the controller.
   * If it's a public route, no user is involved, so the middleware will delegate
   * control to the next on the list.
   *
   * The middleware will check for the "Authorization" header, which must be
   * set and start with `Bearer `. If there's no token or header, it'll throw the
   * `token_required` error. If the header is malformed, it'll throw the
   * `invalid_token` error.
   *
   * The token is decoded and converted to an `APIResource<UserAttributes>` object.
   * If the user exists in the database, the token is valid and the protected
   * request can continue execution. Otherwise, it'll throw the error code
   * `invalid_token`.
   */
  private authenticate(ctx: IRouterContext, next: () => Promise<void>) {
    if (!this.protectedMethods) {
      return next();
    }

    const authRequest = ctx.request as AuthenticatedRequest;
    const authHeader = authRequest.headers.authorization;

    if (!authHeader) {
      throw ErrorCode.TokenRequired;
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw ErrorCode.InvalidToken;
    }

    const [, token] = authHeader.split(" ");
    const user = decodeToken(token) as APIResource<UserAttributes>;

    const isValidUser = userExists(user.attributes);

    if (!isValidUser) {
      throw ErrorCode.InvalidToken;
    }

    this.user = { id: user.id, ...user.attributes } as UserSession;

    return next();
  }

  /**
   * If a controller implements expectedSignatureMessage(), this middleware
   * will validate if a signature matches the message and the sender's
   * address. If it succeeds, it'll will continue executing the route.
   * If not, it'll throw an `invalid_signature` error. Also, if a controller
   * implements the method and the request has no signature, it'll throw a
   * `signature_required` error.
   */
  private async validateSignature(
    ctx: IRouterContext,
    next: () => Promise<void>
  ) {
    if (!this.expectedSignatureMessageFor) {
      return next();
    }

    const json = ctx.request.body as APIRequest<TAttributes>;
    const resource = json.data as APIResource<TAttributes>;
    const metadata = json.meta as APIMetadata;

    if (!metadata || !metadata.signature) {
      throw ErrorCode.SignatureRequired;
    }

    const controllerMethod = this.getControllerMethodFor(ctx);
    const expectedMessage = await this.expectedSignatureMessageFor(
      controllerMethod,
      resource
    );
    const ethAddress = getAddress(
      (((json as unknown) as APIRequest<SessionAttributes>).data as APIResource<
        SessionAttributes
      >).attributes.ethAddress
    );
    const { signedMessage } = metadata.signature;

    const expectedAddress = verifyMessage(
      expectedMessage as string,
      signedMessage
    );

    if (expectedAddress !== ethAddress) {
      throw ErrorCode.InvalidSignature;
    }

    return next();
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
   * Maps some predefined requests conditions to a controller method.
   *
   * If it's a GET /:type request, the method is `GetAll`.
   * If it's a GET /:type/:id request, the method is `GetById`.
   * If it's a POST /:type request, the method is `Post`.
   */
  private getControllerMethodFor(ctx: IRouterContext): ControllerMethod {
    if (ctx.request.method === "GET") {
      if (ctx.params.id) {
        return ControllerMethod.GetById;
      }

      return ControllerMethod.GetAll;
    }

    return ControllerMethod.Post;
  }

  /**
   * Returns a collection of resources.
   */
  private async routeGetAll(ctx: IRouterContext, next: () => Promise<void>) {
    const callback = (this.getAll as Function).bind(this);

    ctx.body = {
      data: await callback()
    } as APIResponse;

    return next();
  }

  /**
   * Returns a single, uniquely-identified resource.
   */
  private async routeGetById(ctx: IRouterContext, next: () => Promise<void>) {
    const callback = (this.getById as Function).bind(this);

    ctx.body = {
      data: await callback(ctx.params.id)
    } as APIResponse;

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

    ctx.body = {
      data: await callback(request.data as APIResource)
    };
    ctx.status = 201;

    return next();
  }

  /**
   * Allows to sideload additional resources exposed via relationships on
   * the main payload. Every resource loaded with this function will be
   * emitted in the response in the `included` top-level key.
   *
   * @param resources {ApiResourceCollection} - A list of resources to inject.
   */
  protected include(...resources: APIResourceCollection) {
    this.includedResources.push(...resources);
  }

  /**
   * Injects any resources sideloaded with the `include` function
   * and clears the `includedResources` stack, making it available
   * for the next request.
   *
   * If there are no sideloaded resources, the middleware skips execution.
   */
  private async injectIncludedResources(
    ctx: IRouterContext,
    next: () => Promise<void>
  ) {
    if (!this.includedResources.length) {
      return next();
    }

    ctx.body = {
      ...ctx.body,
      included: this.includedResources
    } as APIResponse;

    this.includedResources = [];

    return next();
  }
}
