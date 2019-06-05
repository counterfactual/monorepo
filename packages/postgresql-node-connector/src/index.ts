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

export class PostgresServiceFactory {
  private connectionManager: ConnectionManager;
  private connection: Connection;

  constructor(configuration: ConnectionOptions, readonly dbName: string) {
    this.connectionManager = new ConnectionManager();
    this.connection = this.connectionManager.create({
      ...EMPTY_POSTGRES_CONFIG,
      ...configuration,
      entities: [NodeEntity]
    } as ConnectionOptions);
  }

  async connectDb(): Promise<Connection> {
    await this.connection.connect();
    await this.connection.query(`
      CREATE EXTENSION IF NOT EXISTS dblink;

      DO $$
      BEGIN
      PERFORM dblink_exec('', 'CREATE DATABASE ${this.dbName}');
      EXCEPTION WHEN duplicate_database THEN RAISE NOTICE '%, skipping', SQLERRM USING ERRCODE = SQLSTATE;
      END
      $$;
     `);

    return this.connection;
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
          [pair.key]: JSON.parse(JSON.stringify(pair.value))
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
    const res = await this.connectionMgr
      .get()
      .manager.findOne(NodeEntity, storeKey);
    return res && res.value[key];
  }
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
