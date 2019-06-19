const initialState = [
  {
    id: 1,
    name: "Joel"
  }
];

const waaait = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve();
  }, 10000);
});

export const addUser = text => {
  return async dispatch => {
    dispatch({ type: "REPORT", toc: Date.now() });
    await waaait;
    dispatch({ text, type: "ADD_USER", toc: Date.now() });
  };
};

export const deleteUser = id => ({ type: "DELETE_USER", id });
export const getUsers = () => ({ type: "GET" });

export const reducers = function(state = initialState, action) {
  switch (action.type) {
    case "ADD_USER":
      if (action.toc) {
        console.log("finished at " + action.toc);
      }
      return [...state, { id: 2, name: "erik", toc: action.toc }];
    case "REPORT":
      console.log("started at ", action.toc);
      return [...state];
    case "DELETE_USER":
      return state.filter(todo => todo.id !== action.id);
    default:
      console.log(state);
      return state;
  }
};
