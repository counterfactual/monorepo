const cfMock = {
  NodeProvider: jest.fn(() => ({
    connect: () => Promise.resolve()
  })),
  Provider: jest.fn()
};

global.cf = cfMock;
