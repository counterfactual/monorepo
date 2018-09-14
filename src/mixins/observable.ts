export type NotificationType = string;

export class Observable {
	observers: Map<NotificationType, Function[]> = new Map();

	registerObserver(type: NotificationType, callback: Function) {
		if (!this.observers[type]) {
			this.observers[type] = [];
		}
		this.observers[type].push(callback);
	}

	unregisterObserver(type: NotificationType, callback: Function) {
		let index = this.observers[type].indexOf(callback);
		this.observers[type].splice(index, 1);
	}

	notifyObservers(type: NotificationType, data: object) {
		if (this.observers[type]) {
			this.observers[type].forEach(callback => {
				callback(data);
			});
		}
	}
}
