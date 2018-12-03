import {
  A_PRIVATE_KEY,
  B_PRIVATE_KEY,
  A_ADDRESS,
  B_ADDRESS,
} from "../../utils/environment";

import { TestResponseSink } from "../test-response-sink";
import { SetupProtocol } from "./setup-protocol";
import { Depositor } from "./depositor";
import { TicTacToeSimulator } from "./tic-tac-toe-simulator";

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
    const [peerA, peerB]: TestResponseSink[] = getCommunicatingPeers();
    await SetupProtocol.validateAndRun(peerA, peerB);
    await Depositor.makeDeposits(peerA, peerB);
    await TicTacToeSimulator.simulatePlayingGame(peerA, peerB);
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

  peerA.io.peers.set(B_ADDRESS, peerB);
  peerB.io.peers.set(A_ADDRESS, peerA);

  return [peerA, peerB];
}

