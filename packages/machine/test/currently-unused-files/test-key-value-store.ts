import * as cf from "@counterfactual/cf.js";

export class InMemoryKeyValueStorePolyfill {
  public inMemoryStorage: object;

  constructor() {
    this.inMemoryStorage = {};
  }

  public setItem(key: string, value: any) {
    this.inMemoryStorage[key] = value;
  }

  public getItem(key: string) {
    return this.inMemoryStorage[key];
  }
}

export interface InMemoryKeyValueStore {
  get(key: string);

  put(key: string, value: object);

  has(key: string);
}

export function getInMemoryKeyValueStore() {
  try {
    // localStorage is not available in Node
    // @ts-ignore
    return window.localStorage;
  } catch (e) {
    return new InMemoryKeyValueStorePolyfill();
  }
}

export class InMemoryKeyValueStoreImpl implements InMemoryKeyValueStore {
  public store;

  constructor() {
    this.store = getInMemoryKeyValueStore();
  }

  public get(key: string) {
    return cf.legacy.utils.serializer.deserialize(
      JSON.parse(this.store.getItem(key) || "")
    );
  }

  public put(key: string, value: object) {
    return this.store.setItem(key, JSON.stringify(value));
  }

  public has(key: string): boolean {
    return this.store.getItem(key) !== null;
  }
}
