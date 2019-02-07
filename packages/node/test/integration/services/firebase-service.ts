import FirebaseServer from "firebase-server";

import { FirebaseServiceFactory } from "../../../src";

export default class TestFirebaseServiceFactory extends FirebaseServiceFactory {
  firebaseServer: FirebaseServer;
  constructor(private readonly host: string, private readonly port: string) {
    super({
      databaseURL: `ws://${host}:${port}`,
      projectId: "",
      apiKey: "",
      authDomain: "",
      storageBucket: "",
      messagingSenderId: ""
    });

    this.firebaseServer = new FirebaseServer(this.port, this.host);
  }

  async closeServices() {
    await this.close();
    await this.firebaseServer.close();
  }
}
