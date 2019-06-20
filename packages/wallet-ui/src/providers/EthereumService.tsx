import React from "react";
import { EthereumServiceContext } from "../types";

const EthereumService = React.createContext<EthereumServiceContext>(
  // TODO: This should be better.
  {} as EthereumServiceContext
);

export { EthereumService };
