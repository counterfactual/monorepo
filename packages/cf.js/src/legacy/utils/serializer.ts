import * as ethers from "ethers";

import { DeserializationCase } from "../types";

/**
 * Condition functions, used to determine the deserialization resolver
 */

const isObject = data => typeof data === "object" && data !== null;

const isBigNumber = data =>
  isObject(data) && Object.keys(data).length === 1 && data._hex;

const isSignature = data =>
  isObject(data) &&
  Object.keys(data).length === 3 &&
  data.v &&
  data.r &&
  data.s;

/**
 * Deserialization functions
 */

const deserializeArray = data => data.map(value => deserialize(value));

const deserializeBigNumber = data => ethers.utils.bigNumberify(data._hex);

const identity = data => data;

const deserializeObject = data =>
  Object.keys(data).reduce((deserializedData: object, key: string) => {
    deserializedData[key] = deserialize(data[key]);

    return deserializedData;
  }, {});

/**
 * This array describes how to deal with each deserialization case for
 * a given JSON payload. The deserialize() function will run through
 * these cases until it finds a match, then stops and returns the result
 * of the resolver.
 */

const deserializeCases: DeserializationCase[] = [
  {
    condition: data => Array.isArray(data),
    resolve: deserializeArray
  },
  {
    condition: isBigNumber,
    resolve: deserializeBigNumber
  },
  {
    condition: isSignature,
    resolve: identity
  },
  {
    condition: isObject,
    resolve: deserializeObject
  }
];

/**
 * reconstitute a freshly `JSON.parse`d payload, ensuring that objects
 * have the correct class, such as `BigNumber`
 */
export function deserialize(data: any): any {
  for (let caseIndex = 0; caseIndex < deserializeCases.length; caseIndex += 1) {
    const deserializeCase = deserializeCases[caseIndex];
    if (deserializeCase.condition(data)) {
      return deserializeCase.resolve(data);
    }
  }

  return data;
}
