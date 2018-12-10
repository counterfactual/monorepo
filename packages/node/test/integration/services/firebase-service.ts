import { Address } from "@counterfactual/common-types";
import firebase from "firebase";
import FirebaseServer from "firebase-server";

import {
  IMessagingService,
  IStoreService
} from "../../../src/service-interfaces";

class FirebaseMessagingService implements IMessagingService {
  // naive caching - firebase fires observers twice upon initial callback
  // registration and invocation
  private servedMessages = new Map();

  constructor(
    private readonly firebase: firebase.database.Database,
    private readonly messagingServerKey: string
  ) {}

  async send(peerAddress: Address, msg: object) {
    await this.firebase
      .ref(`${this.messagingServerKey}/${peerAddress}`)
      .set(msg);
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
        const value = snapshot.val();
        if (value !== null) {
          if (value in this.servedMessages) {
            delete this.servedMessages[value];
          } else {
            this.servedMessages[value] = true;
            callback(value);
          }
        }
        // clear processed message
        this.firebase.ref(`${this.messagingServerKey}/${address}`).remove();
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

  async set(key: string, value: any): Promise<any> {
    await this.firebase
      .ref(this.storeServiceKey)
      .child(key)
      .set(value);
  }
}

export default class FirebaseServiceFactory {
  private app: firebase.app.App;

  constructor(private readonly host: string, private readonly port: string) {
    this.app = firebase.initializeApp({
      databaseURL: `ws://${this.host}:${this.port}`,
      projectId: "projectId"
    });
  }

  createServer(): FirebaseServer {
    return new FirebaseServer(this.port, this.host);
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
