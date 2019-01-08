import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

it('renders without crashing', () => {
  window.cf = {
    Provider: function() {}
  };
  window.NodeProvider = function() {};
  const div = document.createElement('div');
  ReactDOM.render(<App standalone={true}/>, div);
  ReactDOM.unmountComponentAtNode(div);
});
