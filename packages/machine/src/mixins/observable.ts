export type NotificationType = string;

export class Observable {
  public observers: Map<NotificationType, Function[]> = new Map();

  private getObservers(type: NotificationType): Function[] {
    return this.observers.get(type) || [];
  }

  public registerObserver(type: NotificationType, callback: Function) {
    this.observers.set(type, this.getObservers(type).concat(callback));
  }

  public unregisterObserver(type: NotificationType, callback: Function) {
    const observers = this.getObservers(type);
    const index = observers.indexOf(callback);
    this.observers.set(type, observers.splice(index, 1));
  }

  public notifyObservers(type: NotificationType, data: object) {
    this.getObservers(type).forEach(callback => {
      callback(data);
    });
  }
}
