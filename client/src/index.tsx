import { ThemeProvider } from "@emotion/react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Provider } from "react-redux";
import { store } from "./redux/store.ts";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import React from "react";
import themeOptions from "./theme/index.ts";
import { GQL_URL } from "./config.ts";
import CssBaseline from '@mui/material/CssBaseline';

const client = new ApolloClient({
  uri: GQL_URL,
  cache: new InMemoryCache(),
});

console.log(GQL_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ApolloProvider client={client}>
    <Provider store={store}>
      <React.StrictMode>
        <ThemeProvider theme={themeOptions}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </React.StrictMode>
    </Provider>
  </ApolloProvider>
);
