import * as ETHBalanceRefundAppContract from "@counterfactual/contracts/build/contracts/ETHBalanceRefundApp.json";
import * as ethers from "ethers";

import { Terms } from "./app";
import { AppInstance } from "./app-instance";
import { AppDefinition } from "./types";

export class ETHBalanceRefundApp extends AppInstance {
  constructor(appAddress: string, signingKeys: string[]) {
    const timeout = 100;
    const terms = new Terms(
      0,
      ethers.utils.bigNumberify("0"),
      ethers.constants.AddressZero
    );
    const abiEncodings = AppInstance.generateAbiEncodings(
      ETHBalanceRefundAppContract.abi
    );

    const appDefinition: AppDefinition = {
      address: appAddress,
      appStateEncoding: abiEncodings.appStateEncoding,
      appActionEncoding: abiEncodings.appActionEncoding
    };

    super(signingKeys, appDefinition, terms, timeout);
  }
}
