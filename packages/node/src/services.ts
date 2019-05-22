import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import * as log from "loglevel";
import SQL from "sql-template-strings";
import {
  Connection,
  createConnection,
  ConnectionManager,
  ConnectionOptions,
  getRepository,
  Repository,
  Transaction,
  TransactionRepository
} from "typeorm";
import util from "util";

import { Node as NodeEntity } from "./entity/Node";
import { NodeMessage } from "./types";

export interface IMessagingService {
  send(to: string, msg: NodeMessage): Promise<void>;
  onReceive(address: string, callback: (msg: NodeMessage) => void);
}

export interface IStoreService {
  get(key: string): Promise<any>;
  // Multiple pairs could be written simultaneously if an atomic write
  // among multiple records is required
  set(pairs: { key: string; value: any }[]): Promise<boolean>;
}

export interface FirebaseAppConfiguration {
  databaseURL: string;
  projectId: string;
  apiKey: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId: string;
}

export const FIREBASE_CONFIGURATION_ENV_KEYS = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  databaseURL: "FIREBASE_DATABASE_URL",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  authEmail: "FIREBASE_AUTH_EMAIL",
  authPassword: "FIREBASE_AUTH_PASSWORD"
};

export const EMPTY_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: ""
};

/**
 * This factory exposes default implementations of the service interfaces
 * described above, using Firebase as the implementation backend.
 */
export class FirebaseServiceFactory {
  private app: firebase.app.App;

  constructor(configuration: FirebaseAppConfiguration) {
    this.app = firebase.initializeApp(configuration);
  }

  static connect(host: string, port: string) {
    return new FirebaseServiceFactory({
      ...EMPTY_FIREBASE_CONFIG,
      databaseURL: `ws://${host}:${port}`
    });
  }

  async auth(email: string, password: string) {
    try {
      log.info(`Authenticating with email: ${email}`);
      await this.app.auth().signInWithEmailAndPassword(email, password);
    } catch (e) {
      log.error(`Error authenticating against Firebase with email: ${email}`);
      console.error(e);
    }
  }

  createMessagingService(messagingServiceKey: string): IMessagingService {
    return new FirebaseMessagingService(
      this.app.database(),
      messagingServiceKey
    );
  }

  createStoreService(storeServiceKey: string): IStoreService {
    return new FirebaseStoreService(this.app.database(), storeServiceKey);
  }
}

class FirebaseMessagingService implements IMessagingService {
  constructor(
    private readonly firebase: firebase.database.Database,
    private readonly messagingServerKey: string
  ) {}

  async send(to: string, msg: NodeMessage) {
    await this.firebase
      .ref(`${this.messagingServerKey}/${to}/${msg.from}`)
      .set(JSON.parse(JSON.stringify(msg)));
  }

  onReceive(address: string, callback: (msg: NodeMessage) => void) {
    if (!this.firebase.app) {
      console.error(
        "Cannot register a connection with an uninitialized firebase handle"
      );
      return;
    }

    const childAddedHandler = async (
      snapshot: firebase.database.DataSnapshot | null
    ) => {
      if (!snapshot) {
        console.error(
          `Node with address ${address} received a "null" snapshot`
        );
        return;
      }

      const msg: NodeMessage = snapshot.val();

      if (msg === null) {
        // We check for `msg` being not null because when the Firebase listener
        // connects, the snapshot starts with a `null` value, and on the second
        // the call it receives a value.
        // See: https://stackoverflow.com/a/37310606/2680092
        return;
      }

      await this.firebase
        .ref(`${this.messagingServerKey}/${address}/${msg.from}`)
        .remove();

      try {
        callback(msg);
      } catch (error) {
        console.error(
          "Encountered an error while handling message callback",
          error
        );
      }
    };

    // Cleans the message inbox upon service start
    this.firebase.ref(`${this.messagingServerKey}/${address}`).remove();

    this.firebase
      .ref(`${this.messagingServerKey}/${address}`)
      .on("child_added", childAddedHandler);
  }
}

class FirebaseStoreService implements IStoreService {
  constructor(
    private readonly firebase: firebase.database.Database,
    private readonly storeServiceKey: string
  ) {}

  async get(key: string): Promise<any> {
    let result: any;
    await this.firebase
      .ref(this.storeServiceKey)
      .child(key)
      .once("value", (snapshot: firebase.database.DataSnapshot | null) => {
        if (snapshot === null) {
          console.debug(
            `Failed to retrieve value at ${key}: received a "null" snapshot`
          );
          return;
        }
        result = snapshot.val();
      });
    return result;
  }

  async set(pairs: { key: string; value: any }[]): Promise<any> {
    const updates = {};
    for (const pair of pairs) {
      updates[pair.key] = JSON.parse(JSON.stringify(pair.value));
    }
    return await this.firebase.ref(this.storeServiceKey).update(updates);
  }
}

export const devAndTestingEnvironments = new Set(["development", "test"]);

export function confirmFirebaseConfigurationEnvVars() {
  for (const key of Object.keys(FIREBASE_CONFIGURATION_ENV_KEYS)) {
    if (!process.env[FIREBASE_CONFIGURATION_ENV_KEYS[key]]) {
      throw Error(
        `Firebase ${key} is not set via env var ${
          FIREBASE_CONFIGURATION_ENV_KEYS[key]
        }`
      );
    }
  }
}

export function confirmLocalFirebaseConfigurationEnvVars() {
  if (!process.env.FIREBASE_SERVER_HOST || !process.env.FIREBASE_SERVER_PORT) {
    throw Error(
      "Firebase server hostname and port number must be set via FIREBASE_SERVER_HOST and FIREBASE_SERVER_PORT env vars"
    );
  }
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
  private connection: Connection;

  constructor(configuration: ConnectionOptions) {
    const connectionManager = new ConnectionManager();
    this.connection = connectionManager.create(configuration);
  }

  static connect(host: string, port: number) {
    new PostgresServiceFactory({
      ...EMPTY_POSTGRES_CONFIG,
      host,
      port,
      entities: [NodeEntity]
    } as ConnectionOptions);
  }

  async connectDb() {
    await this.connection.connect();
  }

  createStoreService(storeServiceKey: string): IStoreService {
    console.log("Connected to Postgres");
    return new PostgresStoreService(this.connection, storeServiceKey);
  }
}

class PostgresStoreService implements IStoreService {
  private nodeRepository: Repository<NodeEntity>;

  constructor(
    private readonly connection: Connection,
    private readonly storeServiceKey: string
  ) {
    this.nodeRepository = getRepository(NodeEntity);
  }

  async set(pairs: { key: string; value: any }[]): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const pair of pairs) {
        const storeKey = `${this.storeServiceKey}_${pair.key}`;
        await queryRunner.manager.save({
          key: storeKey,
          value: { [pair.key]: JSON.parse(JSON.stringify(pair.value)) }
        });
      }
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async get(key: string): Promise<any> {
    const storeKey = `${this.storeServiceKey}_${key}`;
    return await this.nodeRepository.findOne(storeKey);
  }

  // async _set(pairs: { key: string; value: any }[]): Promise<any> {
  //   await this.pgClient.query("BEGIN");
  //   for (const pair of pairs) {
  //     console.log(`Setting pair: ${JSON.stringify(pair)}`);
  //     await this.pgClient.query(
  //       SQL`INSERT INTO "`.append(this.storeServiceKey)
  //         .append(SQL`" (key, value)
  //         VALUES (${pair.key}, ${{
  //         [pair.key]: JSON.parse(JSON.stringify(pair.value))
  //       }})
  //       ON CONFLICT (key)
  //       DO
  //         UPDATE
  //           SET "value" = ${{
  //             [pair.key]: JSON.parse(JSON.stringify(pair.value))
  //           }}
  //     `)
  //     );
  //   }
  //   await this.pgClient.query("COMMIT");
  // }
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
