function getProp(propertyName: string, context: { [key: string]: any }) {
  const state = context.history.location.state || {};
  const query = context.history.location.query || {};
  return state[propertyName] || query[propertyName] || context[propertyName];
}

export { getProp };
