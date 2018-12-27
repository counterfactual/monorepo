import FirebaseServer from "firebase-server";

import { FirebaseServiceFactory } from "../../../src";

export default class TestFirebaseServiceFactory extends FirebaseServiceFactory {
  constructor(private readonly host: string, private readonly port: string) {
    super({
      databaseURL: `ws://${host}:${port}`,
      projectId: "",
      apiKey: "",
      authDomain: "",
      storageBucket: "",
      messagingSenderId: ""
    });
  }

  createServer() {
    return new FirebaseServer(this.port, this.host);
  }
}
