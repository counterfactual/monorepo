import * as cf from "@counterfactual/cf.js";

import { ActionExecution, instructionGroupFromProtocolName } from "../../src/action";
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
      const internalMessage = execution["createInternalMessage"](); // access private method
      const context = execution["createContext"](); // access private method
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

  const isAckSide = [true, true, false];

  const executions: ActionExecution[] = [];

  for (let k = 0; k < requestIds.length; k += 1) {
    const execution = new ActionExecution(
      actions[k],
      instructionGroupFromProtocolName(actions[k], isAckSide[k]),
      instructionPointers[k],
      msgs[k],
      instructionExecutor,
      isAckSide[k],
      requestIds[k]
    );
    executions.push(execution);
  }

  return executions;
}

function validatelog(log: WriteAheadLog, instructionExecutor: InstructionExecutor) {
  // access private method
  const executions = instructionExecutor["buildExecutionsFromLog"](log.readLog());
  const expectedExecutions = makeExecutions(instructionExecutor);
  for (let k = 0; k < expectedExecutions.length; k += 1) {
    const expected = expectedExecutions[k];
    const received = executions[k];
    // note: only check the fields we construct in makeExecutions since we
    //       don't actually set them all there
    expect(received.requestId).toEqual(expected.requestId);
    expect(received.actionName).toEqual(expected.actionName);
    expect(received.isAckSide).toEqual(expected.isAckSide);
    expect(JSON.stringify(received.clientMessage)).toEqual(
      JSON.stringify(expected.clientMessage)
    );
    expect(received.instructionPointer).toEqual(expected.instructionPointer);
    expect(JSON.stringify(received.results2)).toEqual(
      JSON.stringify(expected.results2)
    );
  }
}
