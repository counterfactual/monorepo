import * as cf from "@counterfactual/cf.js";
import MinimumViableMultisigJson from "@counterfactual/contracts/build/contracts/MinimumViableMultisig.json";
import * as machine from "@counterfactual/machine";
import { ethers } from "ethers";

import { IFrameWallet } from "../src/iframe/wallet";

import { EMPTY_NETWORK_CONTEXT, SetupProtocol } from "./common";
import {
  A_ADDRESS,
  A_PRIVATE_KEY,
  B_ADDRESS,
  B_PRIVATE_KEY,
  UNUSED_FUNDED_ACCOUNT
} from "./environment";

let walletA: IFrameWallet;
let walletB: IFrameWallet;

beforeAll(() => {
  walletA = new IFrameWallet(EMPTY_NETWORK_CONTEXT);
  walletB = new IFrameWallet(EMPTY_NETWORK_CONTEXT);
  walletA.setUser(A_ADDRESS, A_PRIVATE_KEY);
  walletB.setUser(B_ADDRESS, B_PRIVATE_KEY);
  walletA.currentUser.io.peer = walletB;
  walletB.currentUser.io.peer = walletA;
});

describe("should have empty commitment stores", async () => {
  it("wallet A should be empty", () => {
    expect(walletA.currentUser.store.getAppCount()).toEqual(0);
  });

  it("wallet B should be empty", () => {
    expect(walletB.currentUser.store.getAppCount()).toEqual(0);
  });
});

describe.skip("should have one commitment for the setup protocol", () => {
  it("should have the setup commitments in store", async () => {
    await setup(walletA, walletB);
    expect(walletA.currentUser.store.appExists(UNUSED_FUNDED_ACCOUNT)).toEqual(
      true
    );
    expect(
      await walletA.currentUser.store.appHasCommitment(
        UNUSED_FUNDED_ACCOUNT,
        cf.node.ActionName.SETUP
      )
    ).toEqual(true);
  });

  let setupTransaction: machine.cfTypes.Transaction;
  it("the transaction should be sent to the multisig address", async () => {
    setupTransaction = await walletA.currentUser.store.getTransaction(
      UNUSED_FUNDED_ACCOUNT,
      cf.node.ActionName.SETUP
    );
    expect(setupTransaction.to).toEqual(UNUSED_FUNDED_ACCOUNT);
  });

  let multisigInput;
  it("the transaction's call data should be another transaction being sent to the multisend address", () => {
    multisigInput = new ethers.utils.Interface(
      MinimumViableMultisigJson.abi
    ).functions.execTransaction.decode(setupTransaction.data);

    expect(multisigInput.to.toLowerCase()).toEqual(
      walletA.currentUser.vm.state.networkContext.multiSendAddr
    );
  });

  // FIXME: the operation hash generated is wrong
  // it.skip("the transaction's signatures should be signed by wallet A and wallet B", () => {
  //   const signatures = Signature.fromBytes(multisigInput.signatures);
  //   const operationHash = CfOpSetup.toHash(UNUSED_FUNDED_ACCOUNT, multisigInput);
  //   const addressA = ethers.utils.recoverAddress(operationHash, signatures[0]);
  //   const addressB = ethers.utils.recoverAddress(operationHash, signatures[1]);
  //   expect(addressA).toEqual(walletA.currentUser.signer.address);
  //   expect(addressB).toEqual(walletB.currentUser.signer.address);
  // });

  // TODO: add more tests confirming if the transaction's data are correct
});

async function setup(walletA: IFrameWallet, walletB: IFrameWallet) {
  const msg = SetupProtocol.setupStartMsg(walletA.address!, walletB.address!);
  const response = await walletA.runProtocol(msg);
  expect(response.status).toEqual(cf.node.ResponseStatus.COMPLETED);
}
