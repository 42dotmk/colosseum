import { ThemeProvider } from "@emotion/react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Provider } from "react-redux";
import { store } from "./redux/store.ts";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import React from "react";
import themeOptions from "./theme/index.ts";

const client = new ApolloClient({
  uri: 'http://127.0.0.1:1337/graphql',
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ApolloProvider client={client}>
    <Provider store={store}>
      <React.StrictMode>
        <ThemeProvider theme={themeOptions}>
          <App />
        </ThemeProvider>
      </React.StrictMode>
    </Provider>
  </ApolloProvider>
);