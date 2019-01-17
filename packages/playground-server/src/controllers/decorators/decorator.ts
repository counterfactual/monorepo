import Controller from "../controller";

export default function decorateWith(
  middleware: (
    controller: Controller<any>,
    originalFunction: Function,
    ...middlewareArguments: any[]
  ) => ((...args: any[]) => any),
  ...middlewareArguments: any[]
) {
  return (
    target: Controller<any> | Function,
    propertyKey?: string,
    descriptor?: TypedPropertyDescriptor<any>
  ): any => {
    if (propertyKey && descriptor) {
      // Behave as a method decorator. Only apply where requested.
      const controller = target as Controller<any>;
      const originalFunction = descriptor.value;

      descriptor.value = middleware(
        controller,
        originalFunction,
        ...middlewareArguments
      );
    } else {
      // Behave as a class decorator. Apply to all.
      const controller = target as Function;
      const controllerMethods = Object.getOwnPropertyNames(controller.prototype)
        // TODO: This filter should be decorator-based to prevent name constraints.
        .filter(member => ["getAll", "getById", "post"].includes(member))
        .map(member => ({
          methodName: member,
          descriptor: Object.getOwnPropertyDescriptor(
            controller.prototype,
            member
          ) as PropertyDescriptor
        }));

      controllerMethods.forEach(controllerMethod => {
        const originalFunction = controllerMethod.descriptor.value;

        Object.defineProperty(
          controller.prototype,
          controllerMethod.methodName,
          {
            ...controllerMethod.descriptor,
            value: middleware(
              controller.prototype as Controller<any>,
              originalFunction,
              ...middlewareArguments
            )
          }
        );
      });
    }
  };
}
