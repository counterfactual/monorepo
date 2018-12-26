import { formatParamType, Interface, ParamType } from "ethers/utils";

interface AbiEncodings {
  appStateEncoding: string;
  appActionEncoding: string;
}

export function generateAbiEncodings(
  abi: string | (string | ParamType)[]
): AbiEncodings {
  const iface = new Interface(abi);
  const appFunctionNames = Object.keys(iface.functions).filter(fn => {
    return fn.indexOf("(") === -1;
  });
  const appActions = appFunctionNames.map(fn => {
    const inputs = iface.functions[fn].inputs;
    const tuples = inputs.map(input => {
      return formatParamType(input);
    });

    return `${fn}(${tuples.join(",")})`;
  });
  return {
    appStateEncoding: formatParamType(iface.functions.resolve.inputs[0]),
    appActionEncoding: JSON.stringify([appActions.join(",")])
  };
}
