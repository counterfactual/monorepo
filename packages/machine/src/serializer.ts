import * as ethers from "ethers";
import { Signature } from "./types";

/**
 * reconstitute a freshly `JSON.parse`d payload, ensuring that objects
 * have the correct class, such as `BigNumber`
 */
export function deserialize(data: any): any {
  if (Array.isArray(data)) {
    return data.map(value => deserialize(value));
  } else if (typeof data === "object" && data !== null) {
    const keys = Object.keys(data);

    if (keys.length === 1 && keys[0] === "_hex") {
      // bigNumberify
      return ethers.utils.bigNumberify(data[keys[0]]);
    } else if (
      keys.length === 3 &&
      ["v", "r", "s"].every(key => keys.indexOf(key) > -1)
    ) {
      // Signatures
      return new Signature(data.v, data.r, data.s);
    } else {
      return keys.reduce((deserializedData: object, key: string) => {
        deserializedData[key] = deserialize(data[key]);

        return deserializedData;
      }, {});
    }
  } else {
    return data;
  }
}
