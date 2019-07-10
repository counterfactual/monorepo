import React from "react";
import { EthereumServiceContext } from "../types";

const EthereumService = React.createContext<EthereumServiceContext>(
  {} as EthereumServiceContext
);

export { EthereumService };
