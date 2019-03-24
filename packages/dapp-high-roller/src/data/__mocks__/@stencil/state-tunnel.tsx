const __rest =
  (this && this.__rest) ||
  function(s, e) {
    const t = {};
    for (const p in s) {
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) {
        t[p] = s[p];
      }
    }
    if (s != null && typeof Object.getOwnPropertySymbols === "function") {
      for (let i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0) {
          t[p[i]] = s[p[i]];
        }
      }
    }
    return t;
  };
function defaultConsumerRender(subscribe, child) {
  return h("context-consumer", { subscribe, renderer: child });
}
export function createProviderConsumer(
  defaultState,
  consumerRender = defaultConsumerRender
) {
  const listeners = new Map();
  let currentState = defaultState;
  function notifyConsumers() {
    listeners.forEach(updateListener);
  }
  function updateListener(fields, listener) {
    if (Array.isArray(fields)) {
      [...fields].forEach(fieldName => {
        listener[fieldName] = currentState[fieldName];
      });
    } else {
      listener[fields] = Object.assign({}, currentState);
    }
    listener.forceUpdate();
  }
  function attachListener(propList) {
    return el => {
      if (listeners.has(el)) {
        return;
      }
      listeners.set(el, propList);
      updateListener(propList, el);
    };
  }
  function subscribe(el, propList) {
    attachListener(propList)(el);
    return function() {
      listeners.delete(el);
    };
  }
  const Provider = ({ state }, children) => {
    currentState = state;
    notifyConsumers();
    return children;
  };
  const Consumer = (props, children) => {
    return consumerRender(subscribe, children[0]);
  };
  function wrapConsumer(childComponent, fieldList) {
    const Child = childComponent.is;
    return _a => {
      const { children } = _a,
        props = __rest(_a, ["children"]);
      return h(
        Child,
        Object.assign({ ref: attachListener(fieldList) }, props),
        children
      );
    };
  }
  function injectProps(childComponent, fieldList) {
    let unsubscribe = null;
    const elementRefName = Object.keys(childComponent.properties).find(
      propName => {
        return childComponent.properties[propName].elementRef === true;
      }
    );
    if (elementRefName === undefined) {
      throw new Error(
        `Please ensure that your Component ${
          childComponent.is
        } has an attribtue with "@Element" decorator. ` +
          `This is required to be able to inject properties.`
      );
    }
    const prevComponentWillLoad = childComponent.prototype.componentWillLoad;
    childComponent.prototype.componentWillLoad = function() {
      unsubscribe = subscribe(this[elementRefName], fieldList);
      if (prevComponentWillLoad) {
        return prevComponentWillLoad.bind(this)();
      }
    };
    const prevComponentDidUnload = childComponent.prototype.componentDidUnload;
    childComponent.prototype.componentDidUnload = function() {
      unsubscribe();
      if (prevComponentDidUnload) {
        return prevComponentDidUnload.bind(this)();
      }
    };
  }
  return {
    Provider,
    Consumer,
    wrapConsumer,
    injectProps
  };
}
