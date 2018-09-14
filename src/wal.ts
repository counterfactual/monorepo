import { Action, ActionExecution } from "./action";
import { CounterfactualVM } from "./vm";
import {
	ActionName,
	Address,
	ClientActionMessage,
	MiddlewareResult
} from "./types";

/**
 * Persistent write ahead log to be able to resume or abort protocols if the
 * machine closes or crashes mid protocol. Effectively a wrapper for the
 * underlying persistence DB to read/write protocol executions at any point.
 */
export class CfVmWal {
	/**
	 * The record name of the wal in the database given to the constructor.
	 */
	private dbKey: string = "CfVmWal";
	/**
	 * @param `db`` is the underlying persistence layer the log is written to.
	 */
	constructor(readonly db: SyncDb) {}
	/**
	 * Persists the given `execution` to the underlying db.
	 */
	write(execution: ActionExecution) {
		let record = this.makeRecord(execution);
		let log = this.readLog();
		log[this.logKey(record)] = record;
		this.save(log);
		console.log("wrote to the write ahead log");
	}

	private makeRecord(execution: ActionExecution): LogRecord {
		return {
			actionName: execution.action.name,
			to: execution.clientMessage.toAddress,
			from: execution.clientMessage.fromAddress,
			requestId: execution.action.requestId,
			clientMessage: execution.clientMessage,
			isAckSide: execution.action.isAckSide,
			instructionPointer: execution.instructionPointer,
			results: execution.results
		};
	}

	private readLog(): Log {
		const logStr = this.db.get(this.dbKey);
		if (logStr === undefined) {
			return {};
		} else {
			return JSON.parse(logStr);
		}
	}

	/**
	 * Returns the key for the WalEntry.
	 */
	private logKey(record: LogRecord): string {
		return `${record.actionName}/${record.to}/${record.from}/${
			record.clientMessage.multisigAddress
		}/${record.clientMessage.appId}`;
	}
	/**
	 * @returns all unfinished protocol executions read from the db.
	 */
	read(vm: CounterfactualVM): ActionExecution[] {
		let executions: ActionExecution[] = [];
		let wal = this.readLog();
		return Object.keys(wal).map(key => {
			let entry = wal[key];
			let action = new Action(
				entry.requestId,
				entry.actionName,
				entry.clientMessage,
				entry.isAckSide
			);
			let execution = new ActionExecution(
				action,
				entry.instructionPointer,
				entry.clientMessage,
				vm
			);
			execution.results = entry.results;
			action.execution = execution;
			return execution;
		});
	}
	/**
	 * Removes the given `exectuion` from the log. Called when a protocol
	 * is completely done being executed.
	 */
	clear(execution: ActionExecution) {
		let entry = this.makeRecord(execution);
		let wal = this.readLog();
		delete wal[this.logKey(entry)];
		this.save(wal);
	}

	private save(log: Log) {
		this.db.put(this.dbKey, JSON.stringify(log));
	}
}

/**
 * Entire Wal record. Keys are of the form <action>/<to>/<from>.
 */
interface Log {
	[s: string]: LogRecord;
}

/**
 * Record stored in the WAL.
 */
interface LogRecord {
	actionName: ActionName;
	to: Address;
	from: Address;
	requestId: string;
	clientMessage: ClientActionMessage;
	isAckSide: boolean;
	instructionPointer: number;
	results: MiddlewareResult[];
}

/**
 * Interface for a synchronous persistent key value store--synchronous because
 * the put doesn't return until the write has completed.
 */
export interface SyncDb {
	put(key: string, val: string);
	get(key: string): string | undefined;
}

/**
 * In memory db. Useful for testing.
 */
export class MemDb implements SyncDb {
	data: Map<string, string>;
	constructor() {
		this.data = new Map<string, string>();
	}

	put(key: string, val: string) {
		this.data.set(key, val);
	}

	get(key: string): string | undefined {
		return this.data.get(key);
	}
}
