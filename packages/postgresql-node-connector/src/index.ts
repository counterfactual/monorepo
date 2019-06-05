import { Node } from "@counterfactual/types";
import "reflect-metadata";
import { Connection, ConnectionManager, ConnectionOptions } from "typeorm";

import { Node as NodeEntity } from "./entity/Node";

type StringKeyValue = { [key: string]: StringKeyValue };

export const POSTGRES_CONFIGURATION_ENV_KEYS = {
  username: "POSTGRES_USER",
  host: "POSTGRES_HOST",
  database: "POSTGRES_DATABASE",
  password: "POSTGRES_PASSWORD",
  port: "POSTGRES_PORT"
};

export interface PostgresConnectionOptions {
  username: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

export const EMPTY_POSTGRES_CONFIG: ConnectionOptions = {
  type: "postgres",
  username: "",
  host: "",
  database: "",
  password: "",
  port: 0
};

export class PostgresServiceFactory implements Node.ServiceFactory {
  private connectionManager: ConnectionManager;
  private connection: Connection;

  constructor(configuration: ConnectionOptions) {
    this.connectionManager = new ConnectionManager();
    this.connection = this.connectionManager.create({
      ...EMPTY_POSTGRES_CONFIG,
      ...configuration,
      entities: [NodeEntity]
    } as ConnectionOptions);
  }

  async connectDb(): Promise<Connection> {
    return this.connection.connect();
  }

  createStoreService(storeServiceKey: string): Node.IStoreService {
    console.log("Connected to Postgres");
    return new PostgresStoreService(this.connectionManager, storeServiceKey);
  }
}

export class PostgresStoreService implements Node.IStoreService {
  constructor(
    private readonly connectionMgr: ConnectionManager,
    private readonly storeServiceKey: string
  ) {}

  async set(
    pairs: { key: string; value: any }[],
    allowDelete?: Boolean
  ): Promise<void> {
    const connection = this.connectionMgr.get();

    await connection.transaction(async transactionalEntityManager => {
      for (const pair of pairs) {
        const storeKey = `${this.storeServiceKey}_${pair.key}`;
        // Wrapping the value into an object is necessary for Postgres because the JSON column breaks
        // if you use anything other than JSON (i.e. a raw string). In some cases, the node code is
        // inserting strings as values instead of objects.
        const storeValue = {
          [pair.key]: pair.value
        };
        let record = await transactionalEntityManager.findOne(
          NodeEntity,
          storeKey
        );
        if (!record) {
          record = new NodeEntity();
          record.key = storeKey;
        }
        record.value = storeValue;
        await transactionalEntityManager.save(record);
      }
    });
  }

  async get(key: string): Promise<StringKeyValue | string | undefined> {
    const storeKey = `${this.storeServiceKey}_${key}`;
    console.log("getting: ", storeKey);
    const res = await this.connectionMgr
      .get()
      .manager.findOne(NodeEntity, storeKey);
    if (res) {
      console.trace();
      console.log(res);
      console.log(JSON.stringify(res.value[key], undefined, 2));
      await sleep(500);
      return res.value[key];
    }
    return undefined;
  }
}

async function sleep(timeInMilliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, timeInMilliseconds));
}

export function confirmPostgresConfigurationEnvVars() {
  for (const [key, value] of Object.entries(POSTGRES_CONFIGURATION_ENV_KEYS)) {
    if (!process.env[value]) {
      throw Error(
        `Postgres ${key} is not set via env var ${
          POSTGRES_CONFIGURATION_ENV_KEYS[key]
        }`
      );
    }
  }
}
