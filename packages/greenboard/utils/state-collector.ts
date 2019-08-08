import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { StringHashMap } from "./types";

const LOCAL_STORAGE_FILE = resolve(
  __dirname,
  "../chrome-profile/greenboard-local-storage.json"
);

/**
 * This class is used to pick up state from the Metamask extension's
 * Local Storage and transfer it to the next test. Useful for
 * testing Node state for returning users.
 */
export default class StateCollector {
  /**
   * Contains a key/value map, mimicking LocalStorage's data structure.
   */
  private data: StringHashMap = {};

  /**
   * Writes inside the data buffer.
   *
   * @param key
   * @param value
   */
  public set(key: string, value: string) {
    this.data[key] = value;
  }

  /**
   * Reads a key's value from the data buffer.
   * @param key
   */
  public get(key: string) {
    return this.data[key];
  }

  /**
   * Writes the buffer with the provided data map.
   *
   * @param data
   */
  public write(data: StringHashMap) {
    this.data = data;
    writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(this.data));
  }

  public read() {
    this.data = JSON.parse(readFileSync(LOCAL_STORAGE_FILE).toString());
    return this.data;
  }
}
