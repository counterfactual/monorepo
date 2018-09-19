export class LocalStoragePolyfill {
	inMemoryStorage: object;

	constructor() {
		this.inMemoryStorage = {};
	}

	setItem(key: string, value: any) {
		return (this.inMemoryStorage[key] = value);
	}

	getItem(key: string) {
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
	localStorage;

	constructor() {
		this.localStorage = getLocalStorage();
	}

	get(key: string) {
		return JSON.parse(this.localStorage.getItem(key) || "");
	}

	put(key: string, value: object) {
		return this.localStorage.setItem(key, JSON.stringify(value));
	}

	has(key: string): boolean {
		return this.localStorage.getItem(key) !== null;
	}
}
