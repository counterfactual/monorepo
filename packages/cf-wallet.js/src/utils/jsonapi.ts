import { JsonApi } from "@counterfactual/types";

export function deriveMethodName(
  operation: JsonApi.Operation
): JsonApi.MethodName {
  return `${operation.ref.type}:${operation.op}` as JsonApi.MethodName;
}
