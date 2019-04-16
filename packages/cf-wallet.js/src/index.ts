import NodeProvider from "@counterfactual/node-provider";

import { Provider } from "./provider";
import * as types from "./types";
import * as utils from "./utils";

const cf = {
  Provider,
  types,
  utils
};

export { Provider, types, utils };

export { NodeProvider };
export default cf;
