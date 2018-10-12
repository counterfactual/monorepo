import * as wallet from "@counterfactual/wallet";
import { ethers } from "ethers";
import * as machine from "@counterfactual/machine";
import { SetupProtocol } from "./common";
import {
  A_ADDRESS,
  A_PRIVATE_KEY,
  B_ADDRESS,
  B_PRIVATE_KEY,
  MULTISIG_ADDRESS
} from "./environment";

let walletA: wallet.IframeWallet;
let walletB: wallet.IframeWallet;
let network: machine.types.NetworkContext;

beforeAll(() => {
  walletA = new wallet.IframeWallet();
  walletB = new wallet.IframeWallet();
  network = walletA.network;
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
    expect(walletA.currentUser.store.appExists(MULTISIG_ADDRESS)).toEqual(true);
    expect(
      await walletA.currentUser.store.appHasCommitment(
        MULTISIG_ADDRESS,
        machine.types.ActionName.SETUP
      )
    ).toEqual(true);
  });

  let setupTransaction: machine.cfTypes.Transaction;
  it("the transaction should be sent to the multisig address", async () => {
    setupTransaction = await walletA.currentUser.store.getTransaction(
      MULTISIG_ADDRESS,
      machine.types.ActionName.SETUP
    );
    expect(setupTransaction.to).toEqual(MULTISIG_ADDRESS);
  });

  let multisigInput;
  it("the transaction's call data should be another transaction being sent to the multisend address", () => {
    multisigInput = new ethers.utils.Interface(
      network.Multisig.abi
    ).functions.execTransaction.decode(setupTransaction.data);

    expect(multisigInput.to.toLowerCase()).toEqual(
      walletA.currentUser.vm.cfState.networkContext.MultiSend
    );
  });

  // FIXME: the operation hash generated is wrong
  // it.skip("the transaction's signatures should be signed by wallet A and wallet B", () => {
  //   const signatures = Signature.fromBytes(multisigInput.signatures);
  //   const operationHash = CfOpSetup.toHash(MULTISIG_ADDRESS, multisigInput);
  //   const addressA = ethers.utils.recoverAddress(operationHash, signatures[0]);
  //   const addressB = ethers.utils.recoverAddress(operationHash, signatures[1]);
  //   expect(addressA).toEqual(walletA.currentUser.signer.address);
  //   expect(addressB).toEqual(walletB.currentUser.signer.address);
  // });

  // TODO: add more tests confirming if the transaction's data are correct
});

async function setup(
  walletA: wallet.IframeWallet,
  walletB: wallet.IframeWallet
) {
  const msg = SetupProtocol.setupStartMsg(walletA.address!, walletB.address!);
  const response = await walletA.runProtocol(msg);
  expect(response.status).toEqual(machine.vm.ResponseStatus.COMPLETED);
}
