import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import React from 'react';

import { store } from './redux/store.ts';
import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Provider>,
);
