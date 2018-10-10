export type NotificationType = string;

export class Observable {
  public observers: Map<NotificationType, Function[]> = new Map();

  public registerObserver(type: NotificationType, callback: Function) {
    if (!this.observers[type]) {
      this.observers[type] = [];
    }
    this.observers[type].push(callback);
  }

  public unregisterObserver(type: NotificationType, callback: Function) {
    const index = this.observers[type].indexOf(callback);
    this.observers[type].splice(index, 1);
  }

  public notifyObservers(type: NotificationType, data: object) {
    if (this.observers[type]) {
      this.observers[type].forEach(callback => {
        callback(data);
      });
    }
  }
}
