import { Action, ActionExecution } from "../src/action";
import { Instruction } from "../src/instructions";
import { ActionName, ClientActionMessage } from "../src/types";
import { CfVmConfig, CounterfactualVM } from "../src/vm";
import { CfVmWal, MemDb } from "../src/wal";

describe("Write ahead log", () => {
  it("should generate the same write ahead log when using the same db", () => {
    const db = new MemDb();
    const vm = new CounterfactualVM(
      new CfVmConfig(null!, null!, null!, undefined!)
    );
    const wal1 = new CfVmWal(db, "test-user");
    makeExecutions(vm).forEach(execution => {
      const internalMessage = execution.createInternalMessage();
      const context = execution.createContext();
      wal1.write(internalMessage, context);
    });
    validateWal(wal1, vm);
    const wal2 = new CfVmWal(db, "test-user");
    const wal3 = new CfVmWal(db, "test-user");
    validateWal(wal2, vm);
    validateWal(wal3, vm);
  });
});

/**
 * @returns the entires to load into the write ahead log for the test.
 */
function makeExecutions(vm: CounterfactualVM): ActionExecution[] {
  const requestIds = ["1", "2", "3"];
  const actions = [ActionName.INSTALL, ActionName.UPDATE, ActionName.UNINSTALL];
  const msgs: ClientActionMessage[] = [
    {
      requestId: "1",
      action: ActionName.INSTALL,
      data: {},
      multisigAddress: "0x1234",
      fromAddress: "0xa",
      toAddress: "0xb",
      seq: 0
    },
    {
      requestId: "2",
      action: ActionName.INSTALL,
      data: {},
      multisigAddress: "0x1234",
      fromAddress: "0xa",
      toAddress: "0xb",
      seq: 0
    },
    {
      requestId: "3",
      action: ActionName.INSTALL,
      data: {},
      multisigAddress: "0x1234",
      fromAddress: "0xa",
      toAddress: "0xb",
      seq: 0
    }
  ];
  const instructionPointers = [0, 3, 2];
  const results = [
    [{ op: Instruction.OP_GENERATE, val: "generate" }],
    [{ op: Instruction.OP_SIGN, val: "sign" }],
    [{ op: Instruction.OP_SIGN_VALIDATE, val: "sign_validate" }]
  ];
  const isAckSide = [true, true, false];

  const executions: ActionExecution[] = [];
  for (let k = 0; k < requestIds.length; k += 1) {
    const execution = new ActionExecution(
      new Action(requestIds[k], actions[k], msgs[k], isAckSide[k]),
      instructionPointers[k],
      msgs[k],
      vm
    );
    executions.push(execution);
  }
  return executions;
}

function validateWal(wal: CfVmWal, vm: CounterfactualVM) {
  const log = wal.readLog();
  const executions = vm.buildExecutionsFromLog(log);
  const expectedExecutions = makeExecutions(vm);
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
