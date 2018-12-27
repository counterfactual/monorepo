import {
  A_PRIVATE_KEY,
  B_PRIVATE_KEY,
  I_PRIVATE_KEY,
  A_ADDRESS,
  B_ADDRESS,
  I_ADDRESS,
  UNUSED_FUNDED_ACCOUNT
} from "../../utils/environment";

import { TestResponseSink } from "../test-response-sink";
import { SetupProtocol } from "./setup-protocol";
import { Depositor } from "./depositor";

/**
 * Tests that the machine's State is correctly modified during the lifecycle
 * of a state channel application, TicTacToeSimulator, running the setup, install, update,
 * and uninstall protocols.
 */
describe("Machine State Lifecycle", async () => {
  // extending the timeout to allow the async machines to finish
  // and give time to `recoverAddress` to order signing keys right
  // for setting commitments
  jest.setTimeout(50000);

  it.only("should modify machine state during the lifecycle of TicTacToeSimulator", async () => {
    const [peerA, peerB, peerI ]: TestResponseSink[] = getCommunicatingPeers();
    await SetupProtocol.run(peerA, peerI);
    await Depositor.makeDeposits(peerA, peerI);
    await SetupProtocol.run(peerI, peerB);
    await Depositor.makeDeposits(peerI, peerB);
    await peerA.runInstallVirtualAppProtocol(
      A_ADDRESS, B_ADDRESS, I_ADDRESS, UNUSED_FUNDED_ACCOUNT
    );
  });
});

/**
 * @returns the wallets containing the machines that will be used for the test.
 */
function getCommunicatingPeers(): TestResponseSink[] {
  // TODO: Document somewhere that the .signingKey.address" *must* be a hex otherwise
  // machine/src/middleware/node-transition/install-proposer.ts:98:14
  // will throw an error when doing BigNumber.gt check.
  // https://github.com/counterfactual/monorepo/issues/110

  // TODO: Furthermore document that these will eventually be used to generate
  // the `signingKeys` in any proposals e.g., InstallProposer, thus the proposal
  // will fail if they are not valid Ethereum addresses
  // https://github.com/counterfactual/monorepo/issues/109
  const peerA = new TestResponseSink(A_PRIVATE_KEY);
  const peerB = new TestResponseSink(B_PRIVATE_KEY);
  const peerI = new TestResponseSink(I_PRIVATE_KEY);

  peerA.io.peers.set(B_ADDRESS, peerB);
  peerA.io.peers.set(I_ADDRESS, peerI);

  peerB.io.peers.set(A_ADDRESS, peerA);
  peerB.io.peers.set(I_ADDRESS, peerI);

  peerI.io.peers.set(A_ADDRESS, peerA);
  peerI.io.peers.set(B_ADDRESS, peerB);

  return [peerA, peerB, peerI];
}

