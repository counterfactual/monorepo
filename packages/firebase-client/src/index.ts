import { Node } from "@counterfactual/types";
import firebase from "firebase";
import log from "loglevel";

export const WRITE_NULL_TO_FIREBASE = `The records being set contain null/undefined values. If this is intentional, pass the allowDelete flag in set.`;

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

  createMessagingService(messagingServiceKey: string): Node.IMessagingService {
    return new FirebaseMessagingService(
      this.app.database(),
      messagingServiceKey
    );
  }

  createStoreService(storeServiceKey: string): Node.IStoreService {
    return new FirebaseStoreService(this.app.database(), storeServiceKey);
  }
}

class FirebaseMessagingService implements Node.IMessagingService {
  constructor(
    private readonly firebase: firebase.database.Database,
    private readonly messagingServerKey: string
  ) {}

  async send(to: string, msg: Node.NodeMessage) {
    await this.firebase
      .ref(`${this.messagingServerKey}/${to}/${msg.from}`)
      .set(JSON.parse(JSON.stringify(msg)));
  }

  onReceive(address: string, callback: (msg: Node.NodeMessage) => void) {
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

      const msg: Node.NodeMessage = snapshot.val();

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

function containsNull(obj) {
  for (const key in obj) {
    if (typeof obj[key] === "object") {
      if (containsNull(obj[key])) {
        return true;
      }
    }
    if (obj[key] === null || obj[key] === undefined) {
      return true;
    }
  }
  return false;
}

class FirebaseStoreService implements Node.IStoreService {
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

  /**
   * Bulk set operation. Note that while firebase specifies that null/undefined
   * values are interpreted as a delete for the key
   * (https://www.firebase.com/docs/web/api/firebase/set.html), we throw an
   * error by defautl instead.
   */
  async set(
    pairs: { key: string; value: any }[],
    allowDelete?: Boolean
  ): Promise<any> {
    const updates = {};
    for (const pair of pairs) {
      updates[pair.key] = JSON.parse(JSON.stringify(pair.value));
    }
    if (!allowDelete && containsNull(updates)) {
      throw new Error(WRITE_NULL_TO_FIREBASE);
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
