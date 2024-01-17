import { ThemeProvider } from "@emotion/react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import React from "react";

import { store } from "./redux/store.ts";
import themeConfig from "./theme/index.ts";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <React.StrictMode>
      <ThemeProvider theme={themeConfig}>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  </Provider>
);
