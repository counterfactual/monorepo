import * as wallet from "@counterfactual/wallet";
import { Instruction, Instructions } from "../src/instructions";
import { EthCfOpGenerator } from "../src/middleware/cf-operation/cf-op-generator";
import { StateTransition } from "../src/middleware/state-transition/state-transition";
import { Context } from "../src/state";
import { ActionName, ClientActionMessage, InternalMessage } from "../src/types";
import { ResponseStatus } from "../src/vm";
import { MemDb } from "../src/wal";
import { defaultNetwork } from "./common";
import {
  A_ADDRESS,
  A_PRIVATE_KEY,
  B_ADDRESS,
  B_PRIVATE_KEY,
  MULTISIG_ADDRESS
} from "./environment";

/**
 * See run() for the entry point to the test. The basic structure
 * is for each test, we create a hook into the middleware at the
 * instructon we want to crash the machine at. Then we run the
 * protocol, have it crash at that instruction, restart the
 * machine by creating a brand new object (but with the same underlying)
 * db, and finally resume execution from where we crashed.
 */
abstract class SetupProtocolTestCase {
  /**
   * WAL db for walletA. This is the persistence we'll use to
   * recreate a new machine and resume protocols.
   */
  public db: MemDb;
  public walletA: wallet.IframeWallet;
  public walletB: wallet.IframeWallet;
  public executedInstructions: Instruction[];
  constructor() {
    this.db = new MemDb();
    this.walletA = new wallet.IframeWallet(defaultNetwork());
    this.walletB = new wallet.IframeWallet(defaultNetwork());
    this.walletA.setUser(A_ADDRESS, A_PRIVATE_KEY, undefined, this.db);
    this.walletB.setUser(B_ADDRESS, B_PRIVATE_KEY, undefined, new MemDb());
    this.walletA.currentUser.io.peer = this.walletB;
    this.walletB.currentUser.io.peer = this.walletA;
    this.executedInstructions = [];
  }

  public async run() {
    await this.walletA.initUser(A_ADDRESS);
    await this.walletB.initUser(B_ADDRESS);
    this.setupWallet(this.walletA, true);
    const resp = await this.walletA.runProtocol(this.msg());
    expect(resp.status).toEqual(ResponseStatus.ERROR);
    await this.resumeNewMachine();
    this.validate();
  }

  /**
   * Creates a new wallet with the same underlyin WAL db,
   * and then resumes the protocols from where they left
   * off.
   */
  public async resumeNewMachine() {
    // make a new wallet with the exact same state
    // i.e., the same WAL db and the same channelStates
    const walletA2 = new wallet.IframeWallet();
    walletA2.setUser(A_ADDRESS, A_PRIVATE_KEY, undefined, this.db);
    walletA2.currentUser.io.peer = this.walletB;
    this.walletB.currentUser.io.peer = walletA2;
    this.setupWallet(walletA2, false);
    await walletA2.initUser(A_ADDRESS);
  }

  public abstract setupWallet(
    wallet: wallet.IframeWallet,
    shouldError: boolean
  );
  /**
   * @returns the msg to start the setup protocol.
   */
  public abstract description(): string;
  public abstract validate();

  private msg(): ClientActionMessage {
    return {
      requestId: "0",
      appId: undefined,
      action: ActionName.SETUP,
      data: {},
      multisigAddress: MULTISIG_ADDRESS,
      toAddress: A_ADDRESS,
      fromAddress: B_ADDRESS,
      stateChannel: undefined,
      seq: 0
    };
  }
}

class ResumeFirstInstructionTest extends SetupProtocolTestCase {
  public description(): string {
    return "should resume a protocol from the beginning if it crashes during the first instruction";
  }

  public setupWallet(wallet: wallet.IframeWallet, shouldError: boolean) {
    // ensure the instructions are recorded so we can validate the test
    wallet.currentUser.vm.register(
      Instruction.ALL,
      async (message: InternalMessage, next: Function, context: Context) => {
        this.executedInstructions.push(message.opCode);
      }
    );

    // override the existing STATE_TRANSITION_PROPOSE middleware so we can
    // error out if needed
    wallet.currentUser.vm.middleware.middlewares[
      Instruction.STATE_TRANSITION_PROPOSE
    ] = [];
    wallet.currentUser.vm.middleware.add(
      Instruction.STATE_TRANSITION_PROPOSE,
      async (message: InternalMessage, next: Function, context: Context) => {
        if (shouldError) {
          throw new Error("Crashing the machine on purpose");
        }
        return StateTransition.propose(
          message,
          next,
          context,
          wallet.currentUser.vm.cfState
        );
      }
    );
  }

  /**
   * Test force crashes the machine at first instruction of setup protocol,
   * so expect to see the first instruction twice and then the rest of
   * the setup protocol.
   */
  public validate() {
    const setupInstructions = JSON.parse(
      JSON.stringify(Instructions[ActionName.SETUP])
    );
    setupInstructions.unshift(Instruction.STATE_TRANSITION_PROPOSE);
    expect(JSON.stringify(setupInstructions)).toEqual(
      JSON.stringify(this.executedInstructions)
    );
  }
}

class ResumeSecondInstructionTest extends SetupProtocolTestCase {
  public description(): string {
    return "should resume a protocol from the second instruction if it crashes during the second instruction";
  }

  public setupWallet(wallet: wallet.IframeWallet, shouldError: boolean) {
    // ensure the instructions are recorded so we can validate the test
    wallet.currentUser.vm.register(
      Instruction.ALL,
      async (message: InternalMessage, next: Function, context: Context) => {
        this.executedInstructions.push(message.opCode);
      }
    );

    // override the existing STATE_TRANSITION_PROPOSE middleware so we can
    // error out if needed
    wallet.currentUser.vm.middleware.middlewares[Instruction.OP_GENERATE] = [];
    wallet.currentUser.vm.middleware.add(
      Instruction.OP_GENERATE,
      async (message: InternalMessage, next: Function, context: Context) => {
        if (shouldError) {
          throw new Error("Crashing the machine on purpose");
        }
        const cfOpGenerator = new EthCfOpGenerator();
        return cfOpGenerator.generate(
          message,
          next,
          context,
          wallet.currentUser.vm.cfState
        );
      }
    );
  }

  /**
   * Test force crashes the machine at first instruction of setup protocol,
   * so expect to see the first instruction twice and then the rest of
   * the setup protocol.
   */
  public validate() {
    const setupInstructions = JSON.parse(
      JSON.stringify(Instructions[ActionName.SETUP])
    );
    setupInstructions.splice(1, 0, Instruction.OP_GENERATE);
    expect(JSON.stringify(setupInstructions)).toEqual(
      JSON.stringify(this.executedInstructions)
    );
  }
}

class ResumeLastInstructionTest extends SetupProtocolTestCase {
  public description(): string {
    return "should resume a protocol from the second instruction if it crashes during the second instruction";
  }

  public setupWallet(wallet: wallet.IframeWallet, shouldError: boolean) {
    // ensure the instructions are recorded so we can validate the test
    wallet.currentUser.vm.register(
      Instruction.ALL,
      async (message: InternalMessage, next: Function, context: Context) => {
        this.executedInstructions.push(message.opCode);
      }
    );

    // override the existing STATE_TRANSITION_PROPOSE middleware so we can
    // error out if needed
    wallet.currentUser.vm.middleware.middlewares[
      Instruction.STATE_TRANSITION_COMMIT
    ] = [];
    wallet.currentUser.vm.middleware.add(
      Instruction.STATE_TRANSITION_COMMIT,
      async (message: InternalMessage, next: Function, context: Context) => {
        if (shouldError) {
          throw new Error("Crashing the machine on purpose");
        }
        return StateTransition.commit(
          message,
          next,
          context,
          wallet.currentUser.vm.cfState
        );
      }
    );
  }

  /**
   * Test force crashes the machine at first instruction of setup protocol,
   * so expect to see the first instruction twice and then the rest of
   * the setup protocol.
   */
  public validate() {
    const setupInstructions = JSON.parse(
      JSON.stringify(Instructions[ActionName.SETUP])
    );
    setupInstructions.push(Instruction.STATE_TRANSITION_COMMIT);
    expect(JSON.stringify(setupInstructions)).toEqual(
      JSON.stringify(this.executedInstructions)
    );
  }
}

describe("Resume protocols", () => {
  const testCases = [
    new ResumeFirstInstructionTest(),
    new ResumeSecondInstructionTest(),
    new ResumeLastInstructionTest()
  ];

  testCases.forEach(testCase => {
    it(testCase.description(), async () => {
      await testCase.run();
    });
  });
});
