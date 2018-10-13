import * as machine from "@counterfactual/machine";

export class LocalStoragePolyfill {
  public inMemoryStorage: object;

  constructor() {
    this.inMemoryStorage = {};
  }

  public setItem(key: string, value: any) {
    return (this.inMemoryStorage[key] = value);
  }

  public getItem(key: string) {
    return this.inMemoryStorage[key];
  }
}

export interface LocalStorage {
  get(key: string);

  put(key: string, value: object);

  has(key: string);
}

export function getLocalStorage() {
  try {
    // localStorage is not available in Node
    // @ts-ignore
    return window.localStorage;
  } catch (e) {
    return new LocalStoragePolyfill();
  }
}

export class LocalStorageImpl implements LocalStorage {
  public localStorage;

  constructor() {
    this.localStorage = getLocalStorage();
  }

  public get(key: string) {
    return machine.serializer.deserialize(
      JSON.parse(this.localStorage.getItem(key) || "")
    );
  }

  public put(key: string, value: object) {
    return this.localStorage.setItem(key, JSON.stringify(value));
  }

  public has(key: string): boolean {
    return this.localStorage.getItem(key) !== null;
  }
}
