import { Address } from "@counterfactual/common-types";
import firebase from "firebase";
import FirebaseServer from "firebase-server";

import { IMessagingService } from "../../../src/service-interfaces";

const MESSAGING_SERVER_KEY = "messages";

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

const HOST = "localhost";

export default class FirebaseServiceFactory {
  constructor(private readonly port: string) {}

  createServer(): FirebaseServer {
    console.log("using: ", this.port, HOST);
    return new FirebaseServer(this.port, HOST);
  }

  createMessagingService(): IMessagingService {
    const app = firebase.initializeApp({
      databaseURL: `ws://${HOST}:${this.port}`,
      projectId: "projectId"
    });
    return new FirebaseMessagingService(app.database());
  }
}
