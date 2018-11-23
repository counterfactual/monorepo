import * as ethers from "ethers";

import { Terms } from "./app";
import { AbiEncodings, AppDefinition } from "./types";

export class AppInstance {
  constructor(
    public signingKeys: string[],
    public app: AppDefinition,
    public terms: Terms,
    public timeout: number
  ) {}

  // TODO: temp hack necessary until ethers support https://github.com/ethers-io/ethers.js/issues/325
  static generateAbiEncodings(
    abi: string | (string | ethers.utils.ParamType)[]
  ): AbiEncodings {
    const iface = new ethers.utils.Interface(abi);
    const appFunctionNames = Object.keys(iface.functions).filter(fn => {
      return fn.indexOf("(") === -1;
    });
    const appActions = appFunctionNames.map(fn => {
      const inputs = iface.functions[fn].inputs;
      const tuples = inputs.map(input => {
        return ethers.utils.formatParamType(input);
      });

      return `${fn}(${tuples.join(",")})`;
    });

    return {
      appStateEncoding: ethers.utils.formatParamType(
        iface.functions.resolve.inputs[0]
      ),
      appActionEncoding: JSON.stringify([appActions.join(",")])
    };
  }
}
