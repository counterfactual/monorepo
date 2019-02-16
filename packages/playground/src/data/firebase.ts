// This is a copy of what was implemented on the Node's integration tests
// to provider support for a Firebase layer.
// TODO: IMPORT THIS FROM THE NODE!

export interface IMessagingService {
  send(to: string, msg: any): Promise<void>;
  onReceive(address: string, callback: (msg: any) => void);
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
export default class FirebaseService {
  private static app: any;

  static create(
    configuration: FirebaseAppConfiguration = {
      apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
      authDomain: "foobar-91a31.firebaseapp.com",
      databaseURL: "https://foobar-91a31.firebaseio.com",
      projectId: "foobar-91a31",
      storageBucket: "foobar-91a31.appspot.com",
      messagingSenderId: "432199632441"
    }
  ) {
    if (FirebaseService.app) {
      return FirebaseService.app;
    }

    FirebaseService.app = window["firebase"].initializeApp(configuration);
  }

  static createMessagingService(
    messagingServiceKey: string
  ): IMessagingService {
    return new FirebaseMessagingService(
      FirebaseService.app.database(),
      messagingServiceKey
    );
  }

  static createStoreService(storeServiceKey: string): IStoreService {
    return new FirebaseStoreService(
      FirebaseService.app.database(),
      storeServiceKey
    );
  }
}

class FirebaseMessagingService implements IMessagingService {
  // naive caching - firebase fires observers twice upon initial callback
  // registration and invocation
  private servedMessages = new Set();

  // The last msg that was sent by a peer is retrieved when the listener
  // is registered. To prevent invocation of the callback based on this _last_
  // message, we determine if it's the first time we're registering the
  // listener or not in order to actually invoke the callback.
  private initialHookResponseFired = false;

  constructor(
    private readonly firebase: any,
    private readonly messagingServerKey: string
  ) {}

  async send(to: string, msg: any) {
    console.log("sending", to, msg.from, msg);
    await this.firebase
      .ref(`${this.messagingServerKey}/${to}/${msg.from}`)
      .set(JSON.parse(JSON.stringify(msg)));
  }

  onReceive(address: string, callback: (msg: any) => void) {
    if (!this.firebase.app) {
      console.error(
        "Cannot register a connection with an uninitialized firebase handle"
      );
      return;
    }

    const childAddedHandler = async (snapshot: any | null) => {
      if (!snapshot) {
        console.error(
          `Node with address ${address} received a "null" snapshot`
        );
        return;
      }

      const msg = snapshot.val();

      if (msg === null) {
        // We check for `msg` being not null because when the Firebase listener
        // connects, the snapshot starts with a `null` value, and on the second
        // the call it receives a value.
        // See: https://stackoverflow.com/a/37310606/2680092
        return;
      }

      if (msg.from !== snapshot.key) {
        console.error("Incorrect message received", msg);
      }

      if (this.servedMessages.has(msg)) {
        this.servedMessages.delete(msg);
      } else {
        this.servedMessages.add(msg);
        if (!this.initialHookResponseFired) {
          this.initialHookResponseFired = true;
          return;
        }
        callback(msg);
      }

      await this.firebase
        .ref(`${this.messagingServerKey}/${address}/${msg.from}`)
        .remove();
    };

    this.firebase
      .ref(`${this.messagingServerKey}/${address}`)
      .on("child_added", childAddedHandler);
  }
}

class FirebaseStoreService implements IStoreService {
  constructor(
    private readonly firebase: any,
    private readonly storeServiceKey: string
  ) {}

  async get(key: string): Promise<any> {
    let result: any;
    await this.firebase
      .ref(this.storeServiceKey)
      .child(key)
      .once("value", (snapshot: any | null) => {
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
