import { Address } from "@counterfactual/common-types";
import firebase from "firebase";
import FirebaseServer from "firebase-server";

import {
  IMessagingService,
  IStoreService
} from "../../../src/service-interfaces";

const MESSAGING_SERVER_KEY = "messages";
const STORE_SERVER_KEY = "store";

class FirebaseMessagingService implements IMessagingService {
  constructor(private readonly firebase: firebase.database.Database) {}

  async send(peerAddress: Address, msg: object) {
    await this.firebase.ref(`${MESSAGING_SERVER_KEY}/${peerAddress}`).set(msg);
  }

  receive(address: Address, callback: (msg: object) => void) {
    if (!this.firebase.app) {
      console.error(
        "Cannot register a connection with an uninitialized firebase handle"
      );
      return;
    }

    this.firebase
      .ref(`${MESSAGING_SERVER_KEY}/${address}`)
      // The snapshot being sent to this call _might_ be null
      .on("value", (snapshot: firebase.database.DataSnapshot | null) => {
        if (snapshot === null) {
          console.debug(
            `Node with address ${address} received a "null" snapshot`
          );
          return;
        }
        const msg = snapshot.val();
        callback(msg);
      });
  }
}

class FirebaseStoreService implements IStoreService {
  constructor(private readonly firebase: firebase.database.Database) {}

  async get(key: string): Promise<any> {
    let result: any;
    await this.firebase
      .ref(`${STORE_SERVER_KEY}/${key}`)
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
    return await this.firebase.ref(`${STORE_SERVER_KEY}/${key}`).set(value);
  }
}

const HOST = "localhost";

export default class FirebaseServiceFactory {
  private app: firebase.app.App;

  constructor(private readonly port: string) {
    this.app = firebase.initializeApp({
      databaseURL: `ws://${HOST}:${this.port}`,
      projectId: "projectId"
    });
  }

  createServer(): FirebaseServer {
    return new FirebaseServer(this.port, HOST);
  }

  createMessagingService(): IMessagingService {
    return new FirebaseMessagingService(this.app.database());
  }

  createStoreService(): IStoreService {
    return new FirebaseStoreService(this.app.database());
  }
}
