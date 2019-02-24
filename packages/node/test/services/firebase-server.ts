import FirebaseServer from "firebase-server";

import { EMPTY_FIREBASE_CONFIG, FirebaseServiceFactory } from "../../src";

/**
 * This wraps the FirebaseServiceFactory while providing a Firebase Server
 * for the client to connect to.
 */
export class LocalFirebaseServiceFactory extends FirebaseServiceFactory {
  firebaseServer: FirebaseServer;
  constructor(private readonly host: string, private readonly port: string) {
    super({
      ...EMPTY_FIREBASE_CONFIG,
      databaseURL: `ws://${host}:${port}`
    });

    this.firebaseServer = new FirebaseServer(this.port, this.host);
  }

  async closeServiceConnections() {
    await this.firebaseServer.close();
  }
}
