// This is a copy of what was implemented on the Node's integration tests
// to provider support for a Firebase layer.
// TODO: IMPORT THIS FROM THE NODE!
import { Address } from "@counterfactual/types";
import firebase from "firebase/app";
import "firebase/database";

export interface IMessagingService {
  send(respondingAddress: Address, msg: any);
  receive(address: Address, callback: (msg: any) => void);
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

/**
 * This factory exposes default implementations of the service interfaces
 * described above, using Firebase as the implementation backend.
 */
export default class FirebaseServiceFactory {
  private app: firebase.app.App;

  constructor(configuration: FirebaseAppConfiguration) {
    this.app = firebase.initializeApp(configuration);
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
  // naive caching - firebase fires observers twice upon initial callback
  // registration and invocation
  private servedMessages = new Map();

  // The last msg that was sent by a peer is retrieved when the listener
  // is registered. To prevent invocation of the callback based on this _last_
  // message, we determine if it's the first time we're registering the
  // listener or not in order to actually invoke the callback.
  private initialHookResponseFired = false;

  constructor(
    private readonly firebase: firebase.database.Database,
    private readonly messagingServerKey: string
  ) {}

  async send(respondingAddress: Address, msg: object) {
    await this.firebase
      .ref(`${this.messagingServerKey}/${respondingAddress}`)
      .set(JSON.parse(JSON.stringify(msg)));
  }

  receive(address: Address, callback: (msg: object) => void) {
    if (!this.firebase.app) {
      console.error(
        "Cannot register a connection with an uninitialized firebase handle"
      );
      return;
    }

    this.firebase
      .ref(`${this.messagingServerKey}/${address}`)
      .on("value", (snapshot: firebase.database.DataSnapshot | null) => {
        if (snapshot === null) {
          console.debug(
            `Node with address ${address} received a "null" snapshot`
          );
          return;
        }
        const msg = snapshot.val();
        const msgKey = JSON.stringify(msg);
        if (msg === null) {
          return;
        }
        if (msgKey in this.servedMessages) {
          delete this.servedMessages[msgKey];
          return;
        }
        this.servedMessages[msgKey] = true;
        if (!this.initialHookResponseFired) {
          this.initialHookResponseFired = true;
          return;
        }
        callback(msg);
      });
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
