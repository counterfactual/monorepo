import * as cf from "@counterfactual/cf.js";

import { Context, IntermediateResults } from "./instruction-executor";
import { InternalMessage } from "./types";

/**
 * Persistent write ahead log to be able to resume or abort protocols if the
 * machine closes or crashes mid protocol. Effectively a wrapper for the
 * underlying persistence DB to read/write protocol executions at any point.
 */
export class WriteAheadLog {
  /**
   * The record name of the wal in the database given to the constructor.
   */
  get dbKey(): string {
    return `WriteAheadLog.${this.uid}`;
  }

  /**
   * @param `db` is the underlying persistence layer the log is written to.
   */
  constructor(readonly db: SyncDb, readonly uid: string) {}

  /**
   * Persists the given `execution` to the underlying db.
   */
  public write(message: InternalMessage, context: Context) {
    const record = this.makeRecord(message, context);
    const log = this.readLog();
    log[this.logKey(record)] = record;
    this.save(log);
  }

  public readLog(): Log {
    const logStr = this.db.get(this.dbKey);
    if (logStr === undefined) {
      return {};
    }
    return JSON.parse(logStr);
  }

  /**
   * Removes the given `execution` from the log. Called when a protocol
   * is completely done being executed.
   */
  public clear(message: InternalMessage, context: Context) {
    const entry = this.makeRecord(message, context);
    const wal = this.readLog();
    delete wal[this.logKey(entry)];
    this.save(wal);
  }

  private makeRecord(message: InternalMessage, context: Context): LogRecord {
    return {
      actionName: message.actionName,
      to: message.clientMessage.toAddress,
      from: message.clientMessage.fromAddress,
      requestId: message.clientMessage.requestId,
      clientMessage: message.clientMessage,
      isAckSide: message.isAckSide,
      instructionPointer: context.instructionPointer,
      intermediateResults: context.intermediateResults
    };
  }

  /**
   * Returns the key for the WalEntry.
   */
  private logKey(record: LogRecord): string {
    return `${record.actionName}/${record.to}/${record.from}/${
      record.clientMessage.multisigAddress
    }/${record.clientMessage.appId}`;
  }

  private save(log: Log) {
    this.db.put(this.dbKey, JSON.stringify(log));
  }
}

/**
 * Entire Wal record.
 * Keys are of the form <action>/<to>/<from>/<multisigAddress>/<appId>.
 */
export interface Log {
  [s: string]: LogRecord;
}

/**
 * Record stored in the WAL.
 */
interface LogRecord {
  actionName: cf.legacy.node.ActionName;
  to: cf.legacy.utils.Address;
  from: cf.legacy.utils.Address;
  requestId: string;
  clientMessage: cf.legacy.node.ClientActionMessage;
  isAckSide: boolean;
  instructionPointer: number;
  intermediateResults: IntermediateResults;
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
export class SimpleStringMapSyncDB implements SyncDb {
  public data: Map<string, string>;

  constructor() {
    this.data = new Map<string, string>();
  }

  public put(key: string, val: string) {
    this.data.set(key, val);
  }

  public get(key: string): string | undefined {
    return this.data.get(key);
  }
}
