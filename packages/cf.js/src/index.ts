import { AppFactory } from "./app-factory";
import * as legacy from "./legacy";
import { Provider } from "./provider";
import * as types from "./types";
import * as utils from "./utils";

const cf = {
  AppFactory,
  Provider,
  legacy,
  types,
  utils
};

export { AppFactory, Provider, legacy, types, utils };

export default cf;
