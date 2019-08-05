import { TestBrowser } from "./test-browser";

/**
 * This class is used to pick up state from the Metamask extension's
 * Local Storage and transfer it to the next test. Useful for
 * testing Node state for returning users.
 */
export default class StateCollector {
  /**
   * Contains a key/value map, mimicking LocalStorage's data structure.
   */
  private static data: Map<string, string> = new Map<string, string>();

  /**
   * Writes inside the data buffer.
   *
   * @param key
   * @param value
   */
  public static set(key: string, value: string) {
    this.data.set(key, value);
  }

  /**
   * Reads a key's value from the data buffer.
   * @param key
   */
  public static get(key: string) {
    return this.data.get(key);
  }

  /**
   * Writes the buffer with the provided data map.
   *
   * @param data
   */
  public static write(data: Map<string, string>) {
    this.data = data;
  }

  /**
   * Runs several injected scripts inside the TestBrowser's
   * Metamask context in order to the set its LocalStorage,
   * dumping every entry contained in the `data` buffer.
   *
   * @param browser
   */
  public static async dumpInto(browser: TestBrowser) {
    await browser.injectIntoLocalStorage(this.data);
    this.data.clear();
  }
}
