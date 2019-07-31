import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";

import App from "./App";
import store from "./store/store";
import { EthereumService } from "./providers/EthereumService";
import { Web3Provider } from "ethers/providers";
import EthereumMock from "./store/test-utils/ethereum.mock";

window.ethereum = new EthereumMock();
const provider = new Web3Provider(window.ethereum);
const signer = provider.getSigner();

const context = { provider, signer };

it("renders without crashing", () => {
  const div = document.createElement("div");
  ReactDOM.render(
    <Provider store={store}>
      <EthereumService.Provider value={context}>
        <App />
      </EthereumService.Provider>
    </Provider>,
    div
  );
  ReactDOM.unmountComponentAtNode(div);
});
