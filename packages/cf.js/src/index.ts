import * as types from "./types";

import * as legacy from "./legacy";
import * as utils from "./utils";

import { AppFactory } from "./app-factory";
import { Provider } from "./provider";

const cf = {
  AppFactory,
  Provider,
  legacy,
  types,
  utils
};

export { Provider, legacy, types, utils, cf };

export default cf;
