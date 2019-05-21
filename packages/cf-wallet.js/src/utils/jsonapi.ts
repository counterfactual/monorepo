import { JsonApi } from "@counterfactual/types";

/**
 * Derives a colon seperated method name from a JsonApi operation
 *
 * @param operation A JsonApi operation
 */
export function deriveMethodName(
  operation: JsonApi.Operation
): JsonApi.MethodName {
  return `${operation.ref.type}:${operation.op}` as JsonApi.MethodName;
}
