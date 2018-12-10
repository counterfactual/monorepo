export default {
  Provider: {},
  Consumer: {},
  wrapConsumer: (childComponent: any, fieldList: string[]) => ({
    children,
    ...props
  }: any) => {},
  injectProps: (childComponent: any, fieldList: string[]) => {}
};
