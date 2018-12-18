import {
  AppInstanceID,
  AppInstanceInfo,
  INodeProvider,
  Node
} from "@counterfactual/common-types";
import cuid from "cuid";
import EventEmitter from "eventemitter3";

import { AppInstance, AppInstanceEventType } from "./app-instance";
import {
  CounterfactualEvent,
  ErrorEventData,
  EventType,
  UninstallEventData,
  UpdateStateEventData
} from "./types";

const NODE_REQUEST_TIMEOUT = 1500;

export class Provider {
  private readonly requestListeners: {
    [requestId: string]: (msg: Node.Message) => void;
  } = {};
  private readonly eventEmitter = new EventEmitter();
  private readonly appInstances: { [appInstanceId: string]: AppInstance } = {};

  constructor(readonly nodeProvider: INodeProvider) {
    this.nodeProvider.onMessage(this.onNodeMessage.bind(this));
    this.setupAppInstanceEventListeners();
  }

  async getAppInstances(): Promise<AppInstance[]> {
    const response = await this.callRawNodeMethod(
      Node.MethodName.GET_APP_INSTANCES,
      {}
    );
    const result = response.result as Node.GetAppInstancesResult;
    return Promise.all(
      result.appInstances.map(info =>
        this.getOrCreateAppInstance(info.id, info)
      )
    );
  }

  async install(appInstanceId: AppInstanceID): Promise<AppInstance> {
    const response = await this.callRawNodeMethod(Node.MethodName.INSTALL, {
      appInstanceId
    });
    const { appInstance } = response.result as Node.InstallResult;
    return this.getOrCreateAppInstance(appInstanceId, appInstance);
  }

  async rejectInstall(appInstanceId: AppInstanceID) {
    await this.callRawNodeMethod(Node.MethodName.REJECT_INSTALL, {
      appInstanceId
    });
  }

  on(eventName: EventType, callback: (e: CounterfactualEvent) => void) {
    this.eventEmitter.on(eventName, callback);
  }

  once(eventName: EventType, callback: (e: CounterfactualEvent) => void) {
    this.eventEmitter.once(eventName, callback);
  }

  off(eventName: EventType, callback: (e: CounterfactualEvent) => void) {
    this.eventEmitter.off(eventName, callback);
  }

  async callRawNodeMethod(
    methodName: Node.MethodName,
    params: Node.MethodParams
  ): Promise<Node.MethodResponse> {
    const requestId = cuid();
    return new Promise<Node.MethodResponse>((resolve, reject) => {
      const request: Node.MethodRequest = {
        requestId,
        params,
        type: methodName
      };
      this.requestListeners[requestId] = response => {
        if (response.type === Node.ErrorType.ERROR) {
          return reject({
            type: EventType.ERROR,
            data: response.data
          });
        }
        if (response.type !== methodName) {
          return reject({
            type: EventType.ERROR,
            data: {
              errorName: "unexpected_message_type",
              message: `Unexpected response type. Expected ${methodName}, got ${
                response.type
              }`
            }
          });
        }
        resolve(response as Node.MethodResponse);
      };
      setTimeout(() => {
        if (this.requestListeners[requestId] !== undefined) {
          reject({
            type: EventType.ERROR,
            data: {
              errorName: "request_timeout",
              message: `Request timed out: ${JSON.stringify(request)}`
            }
          });
          delete this.requestListeners[requestId];
        }
      }, NODE_REQUEST_TIMEOUT);
      this.nodeProvider.sendMessage(request);
    });
  }

  async getOrCreateAppInstance(
    id: AppInstanceID,
    info?: AppInstanceInfo
  ): Promise<AppInstance> {
    if (!(id in this.appInstances)) {
      let newInfo;
      if (info) {
        newInfo = info;
      } else {
        const { result } = await this.callRawNodeMethod(
          Node.MethodName.GET_APP_INSTANCE_DETAILS,
          { appInstanceId: id }
        );
        newInfo = (result as Node.GetAppInstanceDetailsResult).appInstance;
      }
      this.appInstances[id] = new AppInstance(newInfo, this);
    }
    return this.appInstances[id];
  }

  private onNodeMessage(message: Node.Message) {
    const type = message.type;
    if (Object.values(Node.ErrorType).indexOf(type) !== -1) {
      this.handleNodeError(message as Node.Error);
    } else if ((message as Node.MethodResponse).requestId) {
      this.handleNodeMethodResponse(message as Node.MethodResponse);
    } else {
      this.handleNodeEvent(message as Node.Event);
    }
  }

  private handleNodeError(error: Node.Error) {
    const requestId = error.requestId;
    if (requestId && this.requestListeners[requestId]) {
      this.requestListeners[requestId](error);
      delete this.requestListeners[requestId];
    }
    this.eventEmitter.emit(error.type, error);
  }

  private handleNodeMethodResponse(response: Node.MethodResponse) {
    const { requestId } = response;
    if (requestId in this.requestListeners) {
      this.requestListeners[requestId](response);
      delete this.requestListeners[requestId];
    } else {
      const error = {
        type: EventType.ERROR,
        data: {
          errorName: "orphaned_response",
          message: `Response has no corresponding inflight request: ${JSON.stringify(
            response
          )}`
        }
      };
      this.eventEmitter.emit(error.type, error);
    }
  }

  private async handleNodeEvent(nodeEvent: Node.Event) {
    switch (nodeEvent.type) {
      case Node.EventName.REJECT_INSTALL: {
        const data = nodeEvent.data as Node.RejectInstallEventData;
        const info = data.appInstance;
        const appInstance = await this.getOrCreateAppInstance(info.id, info);
        const event = {
          type: EventType.REJECT_INSTALL,
          data: {
            appInstance
          }
        };
        return this.eventEmitter.emit(event.type, event);
      }
      case Node.EventName.UPDATE_STATE: {
        const {
          appInstanceId,
          action,
          newState,
          oldState
        } = nodeEvent.data as Node.UpdateStateEventData;
        const appInstance = await this.getOrCreateAppInstance(appInstanceId);
        const event = {
          type: EventType.UPDATE_STATE,
          data: {
            action,
            newState,
            oldState,
            appInstance
          }
        };
        return this.eventEmitter.emit(event.type, event);
      }
      case Node.EventName.UNINSTALL: {
        const { appInstance: info } = nodeEvent.data as Node.UninstallEventData;
        const appInstance = await this.getOrCreateAppInstance(info.id, info);
        const event = {
          type: EventType.UNINSTALL,
          data: {
            appInstance
          }
        };
        return this.eventEmitter.emit(event.type, event);
      }
      case Node.EventName.INSTALL: {
        const { appInstanceId } = nodeEvent.data as Node.InstallEventData;
        const appInstance = await this.getOrCreateAppInstance(appInstanceId);
        const event = {
          type: EventType.INSTALL,
          data: {
            appInstance
          }
        };
        return this.eventEmitter.emit(event.type, event);
      }
      default: {
        const event = {
          type: EventType.ERROR,
          data: {
            errorName: "unexpected_event_type",
            message: `Unexpected event type: ${
              nodeEvent.type
            }: ${JSON.stringify(nodeEvent)}`
          }
        };
        return this.eventEmitter.emit(event.type, event);
      }
    }
  }

  private setupAppInstanceEventListeners() {
    this.on(EventType.UPDATE_STATE, event => {
      const { appInstance } = event.data as UpdateStateEventData;
      appInstance.emit(AppInstanceEventType.UPDATE_STATE, event);
    });

    this.on(EventType.UNINSTALL, event => {
      const { appInstance } = event.data as UninstallEventData;
      appInstance.emit(AppInstanceEventType.UNINSTALL, event);
    });

    this.on(EventType.ERROR, async event => {
      const { appInstanceId } = event.data as ErrorEventData;
      if (appInstanceId) {
        const instance: AppInstance = await this.getOrCreateAppInstance(
          appInstanceId
        );
        instance.emit(AppInstanceEventType.ERROR, event);
      }
    });
  }
}
