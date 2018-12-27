// This is a copy of what was implemented on the Node's integration tests
// to provider support for a Firebase layer.

import { Address } from "@counterfactual/common-types";
import { IMessagingService, IStoreService } from "@counterfactual/node";
import firebase from "firebase";

class FirebaseMessagingService implements IMessagingService {
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
        if (value) {
          callback(value);
        }
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
      .ref(`${this.storeServiceKey}/${key}`)
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

  async set(pairs: { key: string; value: any }[]): Promise<boolean> {
    try {
      await Promise.all(
        pairs.map(({ key, value }) => {
          return this.firebase.ref(`${this.storeServiceKey}/${key}`).set(value);
        })
      );
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default class FirebaseServiceFactory {
  private app: firebase.app.App;

  constructor(firebaseSettings: Object) {
    this.app = firebase.initializeApp(firebaseSettings);
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
