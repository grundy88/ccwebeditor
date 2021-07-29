import React from 'react';
import ReactDOM from 'react-dom';
import EditorApp from './EditorApp';
import './index.css';

ReactDOM.render(
  <EditorApp />,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept();
  module.hot.addStatusHandler(status => {
    if (status === 'prepare') console.clear();
  })
}
