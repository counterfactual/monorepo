import { Node } from "@counterfactual/types";
import "reflect-metadata";
import { Connection, ConnectionManager, ConnectionOptions } from "typeorm";

import { NodeRecord } from "./entity/NodeRecord";

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

  constructor(
    configuration: ConnectionOptions,
    readonly tableName: string = "node_records"
  ) {
    this.connectionManager = new ConnectionManager();
    this.connection = this.connectionManager.create({
      ...EMPTY_POSTGRES_CONFIG,
      ...configuration,
      entities: [NodeRecord]
    } as ConnectionOptions);
  }

  async connectDb(): Promise<Connection> {
    await this.connection.connect();
    await this.connection.query(`
      CREATE TABLE IF NOT EXISTS "${this.tableName}"
      (
        key varchar COLLATE pg_catalog."default" NOT NULL,
        value json NOT NULL,
        CONSTRAINT node_record_pkey PRIMARY KEY (key)
      )
      WITH (
        OIDS = FALSE
      )
      TABLESPACE pg_default;

      ALTER TABLE "${this.tableName}"
        OWNER to postgres;
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
          [pair.key]: pair.value
        };
        let record = await transactionalEntityManager.findOne(
          NodeRecord,
          storeKey
        );
        if (!record) {
          record = new NodeRecord();
          record.key = storeKey;
        }
        record.value = storeValue;
        await transactionalEntityManager.save(record);
      }
    });
  }

  async get(key: string): Promise<StringKeyValue | string | undefined> {
    const storeKey = `${this.storeServiceKey}_${key}`;

    let res;
    // FIXME: this queries for all channels or proposed app instances, which
    // are nested under the respective keywords, hence the 'like' keyword
    // Action item: this hack won't be needed when a more robust schema around
    // node records is implemented
    if (
      key.endsWith("channel") ||
      key.endsWith("appInstanceIdToProposedAppInstance")
    ) {
      res = await this.connectionMgr
        .get()
        .manager.getRepository(NodeRecord)
        .createQueryBuilder("record")
        .where("record.key like :key", { key: `%${storeKey}%` })
        .getMany();

      const postProcess = res.map((record: NodeRecord) => {
        const existingKey = Object.keys(record.value)[0];
        const leafKey = existingKey.split("/").pop()!;
        const nestedValue = record.value[existingKey];
        delete record.value[existingKey];
        record.value[leafKey] = nestedValue;
        return record.value;
      });

      if (res.length === 1) {
        return postProcess[0];
      }
      if (res.length > 1) {
        return postProcess;
      }
      return undefined;
    }

    res = await this.connectionMgr.get().manager.findOne(NodeRecord, storeKey);
    if (!res) {
      return undefined;
    }

    await sleep(500);
    return res.value[key];
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
