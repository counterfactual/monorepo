import * as types from "./types";

import * as legacy from "./legacy";
import * as utils from "./utils";

import { Provider } from "./provider";

const cf = {
  Provider,
  legacy,
  types,
  utils
};

export { Provider, legacy, types, utils, cf };

export default cf;
