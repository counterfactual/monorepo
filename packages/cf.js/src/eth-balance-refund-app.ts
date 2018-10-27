import * as machine from "@counterfactual/machine";
import { AppInstance } from "./app-instance";
import { AppDefinition } from "./types";
import * as ethers from "ethers";
import * as ETHBalanceRefundAppContract from "@counterfactual/contracts/build/contracts/ETHBalanceRefundApp.json";

export class ETHBalanceRefundApp extends AppInstance {
  constructor(appAddress: string, signingKeys: string[]) {
    const timeout = 100;
    const terms = new machine.cfTypes.Terms(
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
