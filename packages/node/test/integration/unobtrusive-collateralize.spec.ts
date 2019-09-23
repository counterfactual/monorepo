import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { NODE_EVENTS, ProposeMessage, InstallMessage } from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  createChannel,
  deposit,
  makeInstallCall,
  makeProposeCall
} from "./utils";

expect.extend({ toBeLt });

jest.setTimeout(45000);

const { TicTacToeApp } = global["networkContext"] as NetworkContextForTestSuite;

/**
 * This should be tested without using automine! GANACHE_BLOCK_TIME variable
 * should be defined and >= 1
 */
describe("Should be able to update the free balance app (deposit/withdraw) without interrupting flow of other apps (install/uninstall)", () => {
  let multisigAddress: string;
  let nodeA: Node;
  let nodeB: Node;
  beforeEach(async () => {
    // create channel
    const context: SetupContext = await setup(global);
    console.log(`setup complete`);
    nodeA = context["A"].node;
    nodeB = context["B"].node;

    multisigAddress = await createChannel(nodeA, nodeB);

    // add some initial balance
    await collateralizeChannel(multisigAddress, nodeA, nodeB, parseEther("2"));
  });

  it("should be able to deposit additional collateral into channel while installing an app", async done => {
    let completedEvents = 0;
    let nonDepositAppId;

    const verifyAndExit = () => {
      completedEvents += 1;
      if (completedEvents === 2) {
        done();
      }
    };

    nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
      console.log(`installing non-deposit app`);
      nonDepositAppId = msg.data.appInstanceId;
      await makeInstallCall(nodeB, msg.data.appInstanceId);
    });

    nodeA.on(NODE_EVENTS.INSTALL, (msg: InstallMessage) => {
      if (msg.data.params.appInstanceId !== nonDepositAppId) {
        // is the deposit app, dont count in the completed
        console.log(`installed deposit app`);
        return;
      }
      console.log(`installed non-deposit app`);
      verifyAndExit();
    });

    nodeB.on(NODE_EVENTS.DEPOSIT_STARTED, () => {
      console.log(`deposit started`);
    });

    nodeA.on(NODE_EVENTS.DEPOSIT_CONFIRMED, () => {
      console.log(`deposit finished`);
      if (!nonDepositAppId) {
        // still hasnt tried installing channel app,
        // force test failure
        expect(`Could not install app with deposit in progress`).toBeNull();
      }
      verifyAndExit();
    });

    const installRpc = makeProposeCall(
      nodeB,
      TicTacToeApp,
      undefined,
      One,
      CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      One,
      CONVENTION_FOR_ETH_TOKEN_ADDRESS
    );

    // wait for deposit to progress
    await deposit(nodeB, multisigAddress);
    nodeA.rpcRouter.dispatch(installRpc);
  });
});
