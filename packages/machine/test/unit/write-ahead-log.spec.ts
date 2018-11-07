import * as cf from "@counterfactual/cf.js";

import { Action, ActionExecution } from "../../src/action";
import { InstructionExecutorConfig, InstructionExecutor } from "../../src/instruction-executor";
import {
  SimpleStringMapSyncDB,
  WriteAheadLog
} from "../../src/write-ahead-log";

describe("Write ahead log", () => {
  it("should generate the same write ahead log when using the same db", () => {
    const db = new SimpleStringMapSyncDB();

    const instructionExecutor = new InstructionExecutor(new InstructionExecutorConfig(null!, null!, null!, undefined!));

    const log1 = new WriteAheadLog(db, "test-unique-id");

    makeExecutions(instructionExecutor).forEach(execution => {
      const internalMessage = execution.createInternalMessage();
      const context = execution.createContext();
      log1.write(internalMessage, context);
    });

    validatelog(log1, instructionExecutor);

    const log2 = new WriteAheadLog(db, "test-unique-id");
    const log3 = new WriteAheadLog(db, "test-unique-id");

    validatelog(log2, instructionExecutor);
    validatelog(log3, instructionExecutor);
  });
});

/**
 * @returns The entries to load into the write ahead log for the test.
 */
function makeExecutions(instructionExecutor: InstructionExecutor): ActionExecution[] {
  const requestIds = ["1", "2", "3"];

  const actions = [
    cf.node.ActionName.INSTALL,
    cf.node.ActionName.UPDATE,
    cf.node.ActionName.UNINSTALL
  ];

  const msgs: cf.node.ClientActionMessage[] = [
    {
      requestId: "1",
      action: cf.node.ActionName.INSTALL,
      data: {},
      multisigAddress: "0x1234",
      fromAddress: "0xa",
      toAddress: "0xb",
      seq: 0
    },
    {
      requestId: "2",
      action: cf.node.ActionName.INSTALL,
      data: {},
      multisigAddress: "0x1234",
      fromAddress: "0xa",
      toAddress: "0xb",
      seq: 0
    },
    {
      requestId: "3",
      action: cf.node.ActionName.INSTALL,
      data: {},
      multisigAddress: "0x1234",
      fromAddress: "0xa",
      toAddress: "0xb",
      seq: 0
    }
  ];
  const instructionPointers = [0, 3, 2];

  // FIXME: This isn't used, why?
  // https://github.com/counterfactual/monorepo/issues/92
  // const results = [
  //   [{ op: Instruction.OP_GENERATE, val: "generate" }],
  //   [{ op: Instruction.OP_SIGN, val: "sign" }],
  //   [{ op: Instruction.OP_SIGN_VALIDATE, val: "sign_validate" }]
  // ];

  const isAckSide = [true, true, false];

  const executions: ActionExecution[] = [];

  for (let k = 0; k < requestIds.length; k += 1) {
    const execution = new ActionExecution(
      new Action(requestIds[k], actions[k], msgs[k], isAckSide[k]),
      instructionPointers[k],
      msgs[k],
      instructionExecutor
    );
    executions.push(execution);
  }

  return executions;
}

function validatelog(log: WriteAheadLog, instructionExecutor: InstructionExecutor) {
  const executions = instructionExecutor.buildExecutionsFromLog(log.readLog());
  const expectedExecutions = makeExecutions(instructionExecutor);
  for (let k = 0; k < expectedExecutions.length; k += 1) {
    const expected = expectedExecutions[k];
    const received = executions[k];
    // note: only check the fields we construct in makeExecutions since we
    //       don't actually set them all there
    expect(received.action.requestId).toEqual(expected.action.requestId);
    expect(received.action.name).toEqual(expected.action.name);
    expect(received.action.isAckSide).toEqual(expected.action.isAckSide);
    expect(JSON.stringify(received.clientMessage)).toEqual(
      JSON.stringify(expected.clientMessage)
    );
    expect(received.instructionPointer).toEqual(expected.instructionPointer);
    expect(JSON.stringify(received.results)).toEqual(
      JSON.stringify(expected.results)
    );
  }
}
