import { Column, Entity, PrimaryColumn } from "typeorm";

import { Node as NodeEntity } from "./entity/Node";

type StringKeyValue = { [key: string]: StringKeyValue };

// TODO: Import from somewhere else, maybe @counterfactual/types
interface IStoreService {
  get(key: string): Promise<any>;
  // Multiple pairs could be written simultaneously if an atomic write
  // among multiple records is required
  set(
    pairs: { key: string; value: any }[],
    allowDelete?: Boolean
  ): Promise<boolean>;
}

export const POSTGRES_CONFIGURATION_ENV_KEYS = {
  username: "POSTGRES_USER",
  host: "POSTGRES_HOST",
  database: "POSTGRES_DATABASE",
  password: "POSTGRES_PASSWORD",
  port: "POSTGRES_PORT"
};

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

  constructor(configuration: ConnectionOptions) {
    this.connectionManager = new ConnectionManager();
    this.connection = this.connectionManager.create({
      ...EMPTY_POSTGRES_CONFIG,
      ...configuration,
      entities: [NodeEntity]
    } as ConnectionOptions);
  }

  async connectDb() {
    await this.connection.connect();
  }

  createStoreService(storeServiceKey: string): IStoreService {
    console.log("Connected to Postgres");
    return new PostgresStoreService(this.connectionManager, storeServiceKey);
  }
}

class PostgresStoreService implements IStoreService {
  constructor(
    private readonly connectionMgr: ConnectionManager,
    private readonly storeServiceKey: string
  ) {}

  async set(
    pairs: { key: string; value: any }[],
    allowDelete?: Boolean
  ): Promise<boolean> {
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
    return true;
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
