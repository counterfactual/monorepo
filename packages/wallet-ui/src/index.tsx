import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { Web3Provider } from "ethers/providers";

import App from "./App";
import store from "./store/store";
import { EthereumService } from "./providers/EthereumService";

const provider = new Web3Provider(window.ethereum);
const signer = provider.getSigner();

const context = { provider, signer };

ReactDOM.render(
  <Provider store={store}>
    <EthereumService.Provider value={context}>
      <App />
    </EthereumService.Provider>
  </Provider>,
  document.getElementById("root")
);
