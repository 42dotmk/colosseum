import { ThemeProvider } from "@emotion/react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import React from "react";

import { store } from "./redux/store.ts";
import themeOptions from "./theme/index.ts";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <React.StrictMode>
      <ThemeProvider theme={themeOptions}>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  </Provider>
);
