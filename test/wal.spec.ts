import { CfVmWal, MemDb } from "../src/wal";
import { Action, ActionExecution } from "../src/action";
import { CfVmConfig, CounterfactualVM } from "../src/vm";
import { Instruction } from "../src/instructions";
import { ClientMessage, ActionName } from "../src/types";

describe("Write ahead log", () => {
	it("should generate the same write ahead log when using the same db", () => {
		const db = new MemDb();
		const vm = new CounterfactualVM(new CfVmConfig(null, null, null));
		const wal1 = new CfVmWal(db);
		makeExecutions(vm).forEach(execution => {
			wal1.write(execution);
		});
		validateWal(wal1, vm);
		const wal2 = new CfVmWal(db);
		const wal3 = new CfVmWal(db);
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
	const msgs: Array<ClientMessage> = [
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

	const executions = [];
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
	let executions = wal.read(vm);
	let expectedExecutions = makeExecutions(vm);
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
